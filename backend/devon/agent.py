import os
import json
import click
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Literal, Optional
from operator import add

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AnyMessage, RemoveMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.types import Command, interrupt
from devon.persistence import get_issue_checkpoint_path, get_checkpointer, append_to_conversation_log

from devon.config import load_config
from devon.tools import list_directory, read_file, write_file, search
from rich.console import Console
from rich.table import Table
from rich import box

_GLOBAL_CONSOLE = Console()

def set_global_console(console: Console):
    global _GLOBAL_CONSOLE
    _GLOBAL_CONSOLE = console

def get_console() -> Console:
    return _GLOBAL_CONSOLE
MAX_TOOL_RESULT_LENGTH = 8000
SAFETY_LIMIT = 100


def _truncate(text: str, limit: int = MAX_TOOL_RESULT_LENGTH) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n... (truncated, {len(text) - limit} chars omitted)"


TOOLS = [list_directory, read_file, write_file, search]
TOOL_MAP = {t.name: t for t in TOOLS}


def _execute_tools(tool_calls: list) -> list[ToolMessage]:
    results = []
    for tc in tool_calls:
        tool_name = tc["name"]
        tool_args = tc["args"]
        get_console().log_tool_call(tool_name, tool_args)

        tool_fn = TOOL_MAP.get(tool_name)
        if not tool_fn:
            result = f"Error: Unknown tool '{tool_name}'."
        else:
            try:
                result = tool_fn.invoke(tool_args)
            except Exception as e:
                result = f"Error executing tool '{tool_name}': {e}"

        truncated = _truncate(str(result))
        get_console().log_tool_result(truncated)

        results.append(ToolMessage(content=truncated, tool_call_id=tc["id"]))
    return results


def _run_llm_with_tools(llm, messages: list[AnyMessage]) -> list[AnyMessage]:
    new_messages = []
    iteration = 0

    while iteration < SAFETY_LIMIT:
        iteration += 1

        ai_message = llm.invoke(messages + new_messages)
        new_messages.append(ai_message)

        if not getattr(ai_message, "tool_calls", None):
            break

        tool_results = _execute_tools(ai_message.tool_calls)
        new_messages.extend(tool_results)

    return new_messages


class PlannerState(TypedDict):
    issue_prompt: str
    repo_path: str
    issue_number: int
    folder_md: str
    tasks: list[dict]
    file_context: str
    plan: str
    messages: Annotated[list[AnyMessage], add_messages]
    next_node: str


def summarize_messages(state: PlannerState) -> Command:
    get_console().print("\n[dim]Context window exceeded. Summarizing memory...[/dim]\n")
    
    config = load_config()
    llm = ChatOllama(
        model=config.llm_model_name,
        base_url=config.llm_base_url,
    )

    msgs = state["messages"]
    
    if len(msgs) <= 30:
        return Command(goto=state.get("next_node", END))

    msgs_to_summarize = msgs[2:]
    
    summary_prompt = (
        "Summarize the following interaction between an AI and its tools. "
        "Keep the summary concise but retain all factual context found or decisions made."
    )
    
    summary_message = llm.invoke(msgs_to_summarize + [HumanMessage(content=summary_prompt)])
    
    delete_actions = [RemoveMessage(id=m.id) for m in msgs_to_summarize if m.id is not None]
    
    new_state_changes = delete_actions + [SystemMessage(content=f"PREVIOUS CONTEXT SUMMARY:\n{summary_message.content}")]
    
    return Command(
        update={"messages": new_state_changes},
        goto=state.get("next_node", END)
    )


def generate_tasks(state: PlannerState) -> Command:
    get_console().log_phase("Task Generation")
    messages = []
    new_messages = []

    config = load_config()
    llm = ChatOllama(
        model=config.llm_model_name,
        base_url=config.llm_base_url,
    ).bind_tools(TOOLS)

    now = datetime.now(timezone.utc).isoformat()
    issue_dir = f".devon/issues/{state['issue_number']}"
    tasks_path = f"{issue_dir}/tasks.json"

    system = f"""You are Devon, an expert AI software engineer.
Repository: {state['repo_path']}

YOUR GOAL: Break down the given issue into concrete, actionable tasks.

The repository structure has already been provided to you below. DO NOT read .devon/folder.md — you already have this information.

WORKFLOW:
1. Use `search` to find code related to the issue keywords in the SOURCE code (not in .devon/).
2. Use `read_file` to read relevant source files. Use `start_line` and `end_line` to read specific sections if the file is large.
3. Create a task breakdown and write it to '{tasks_path}' using `write_file`.

The content you write to tasks.json MUST be a valid JSON STRING, not a raw object. Example:
{{
  "issue_number": {state['issue_number']},
  "created_at": "{now}",
  "tasks": [
    {{
      "id": 1,
      "title": "Short actionable title",
      "description": "Detailed: which files to change, what logic to add/modify, and why.",
      "status": "pending",
      "created_at": "{now}"
    }}
  ]
}}

RULES:
- NEVER explore or list the .devon/ directory. It is internal metadata.
- Each task = one logical unit of work (one file or one feature piece).
- Task descriptions MUST include file paths and exact changes needed.
- DO NOT implement anything. Only analyze and plan.
- DO NOT call the same tool with the same arguments twice.
- **CRITICAL**: Use `write_file(path, content)` with EXACTLY these parameter names. DO NOT use `contents`.
- **CRITICAL**: The `tasks.json` file MUST be written to the exact path: '{tasks_path}'. NEVER write it to source directories like `src/` or `frontend/`.
- Output ONLY valid JSON tool calls. Do not provide any conversational text, explanations, or markdown code fences.
- Do not repeat tool arguments outside the JSON object.
- After writing tasks.json, respond confirming how many tasks you created.
"""

    try:
        messages = [
            SystemMessage(content=system),
            HumanMessage(content=f"REPOSITORY STRUCTURE:\n{state['folder_md']}"),
            HumanMessage(content=state["issue_prompt"]),
        ]
        new_messages = _run_llm_with_tools(llm, messages)

        tasks = []
        if os.path.exists(tasks_path):
            with open(tasks_path, "r", encoding="utf-8") as f:
                tasks_data = json.load(f)
                tasks = tasks_data.get("tasks", [])

        if tasks:
            get_console().print(f"\n[bold green]Created {len(tasks)} tasks:[/]")
            _print_tasks_table(tasks)

        get_console().log_status("Waiting for user feedback on tasks...")
        if len(state["messages"]) + len(new_messages) > 30:
            return Command(
                update={"tasks": tasks, "messages": new_messages, "next_node": "review_tasks"},
                goto="summarize_messages"
            )
        else:
            return Command(
                update={"tasks": tasks, "messages": new_messages},
                goto="review_tasks"
            )
    finally:
        append_to_conversation_log(state.get("repo_path", "."), state["issue_number"], messages + (new_messages if 'new_messages' in locals() else []))


def review_tasks(state: PlannerState) -> Command:
    feedback = interrupt({
        "question": "Any changes to tasks? (Leave blank to approve)",
        "tasks": state["tasks"]
    })
    
    if isinstance(feedback, str) and feedback.strip():
        return Command(
            update={"messages": [HumanMessage(content=f"User feedback on tasks: {feedback}")]},
            goto="generate_tasks"
        )
    return Command(goto="understand_codebase")


def understand_codebase(state: PlannerState) -> Command:
    get_console().log_phase("Codebase Understanding")
    messages = []
    new_messages = []

    config = load_config()
    llm = ChatOllama(
        model=config.llm_model_name,
        base_url=config.llm_base_url,
    ).bind_tools(TOOLS)

    tasks_summary = "\n".join(
        f"- Task {t['id']}: {t['title']} — {t['description']}" for t in state["tasks"]
    )

    system = f"""You are Devon, an expert AI software engineer.
Repository: {state['repo_path']}

You have already broken down the issue into these tasks:
{tasks_summary}

YOUR GOAL: Deep-dive into the SOURCE files relevant to these tasks.
For each task, read the files that will be modified so you understand:
- The current implementation
- Key functions, classes, and their signatures
- Import patterns and dependencies

RULES:
- NEVER explore or list the .devon/ directory.
- Use `read_file` to read each relevant source file. If the file is large, use `start_line` and `end_line` parameters to read only the necessary sections.
- Use `search` to find functions/classes mentioned in the tasks.
- DO NOT modify any files. This is read-only exploration.
- DO NOT call the same tool with the same arguments twice.
- **CRITICAL**: When using tools, use EXACT parameter names (e.g., `path`, `content`, `query`).
- Output ONLY valid JSON tool calls. Do not provide any conversational text or explanations.
- Do not repeat tool arguments outside the JSON object.
- After exploration, provide a comprehensive summary of what you found for each task.
"""

    try:
        messages = [
            SystemMessage(content=system),
            HumanMessage(content=f"REPOSITORY STRUCTURE:\n{state['folder_md']}"),
            HumanMessage(content=f"Explore the codebase for issue #{state['issue_number']}.\n\nTasks:\n{tasks_summary}"),
        ]
        new_messages = _run_llm_with_tools(llm, messages)

        file_context = ""
        if new_messages and hasattr(new_messages[-1], "content"):
            file_context = new_messages[-1].content or ""

        if len(state["messages"]) + len(new_messages) > 30:
            return Command(
                update={"file_context": file_context, "messages": new_messages, "next_node": "generate_plan"},
                goto="summarize_messages"
            )
        else:
            return Command(
                update={"file_context": file_context, "messages": new_messages},
                goto="generate_plan"
            )
    finally:
        append_to_conversation_log(state.get("repo_path", "."), state["issue_number"], messages + (new_messages if 'new_messages' in locals() else []))


def generate_plan(state: PlannerState) -> Command:
    get_console().log_phase("Implementation Plan Generation")
    messages = []
    new_messages = []

    config = load_config()
    llm = ChatOllama(
        model=config.llm_model_name,
        base_url=config.llm_base_url,
    ).bind_tools(TOOLS)

    issue_dir = f".devon/issues/{state['issue_number']}"
    plan_path = f"{issue_dir}/plan.md"

    tasks_summary = "\n".join(
        f"### Task {t['id']}: {t['title']}\n{t['description']}\n" for t in state["tasks"]
    )

    system = f"""You are Devon, an expert AI software engineer.
Repository: {state['repo_path']}

You have completed your analysis. Here is what you know:

TASKS:
{tasks_summary}

CODEBASE CONTEXT:
{state['file_context']}

YOUR GOAL: Write a complete, curated implementation plan to '{plan_path}' using `write_file`.

The plan MUST be a well-structured markdown document with:
1. **Issue Overview** — Brief summary of the issue.
2. **Task Breakdown** — Each task with:
   - Title
   - Files to modify (with full paths)
   - Exact changes needed (describe code changes, new functions, modified logic)
   - Dependencies on other tasks
3. **Implementation Order** — Recommended order of execution.
4. **Testing Strategy** — How to verify the changes work.
5. **Potential Risks** — Edge cases, breaking changes, or concerns.

RULES:
- NEVER explore or list the .devon/ directory.
- Write the plan to '{plan_path}' using `write_file`. This is MANDATORY.
- **CRITICAL**: Use `write_file(path, content)` with EXACTLY these parameter names. DO NOT use `contents`.
- **CRITICAL**: The `plan.md` file MUST be written to the exact path: '{plan_path}'. NEVER write it to source directories like `src/` or `frontend/`.
- The plan must be specific enough that a developer can implement it without guessing.
- Reference actual file paths, function names, and code patterns you discovered.
- Output ONLY valid JSON tool calls. Do not provide any conversational text or explanations.
- Do not repeat tool arguments outside the JSON object.
- After writing the plan, confirm the file path.
"""

    try:
        messages = [
            SystemMessage(content=system),
            HumanMessage(content=f"Generate the implementation plan for issue #{state['issue_number']}."),
        ]
        new_messages = _run_llm_with_tools(llm, messages)

        plan = ""
        if os.path.exists(plan_path):
            with open(plan_path, "r", encoding="utf-8") as f:
                plan = f.read()
            get_console().print(f"\n[bold green]Plan saved to:[/] {plan_path}")

        get_console().log_status("Waiting for user feedback on plan...")
        if len(state["messages"]) + len(new_messages) > 30:
            return Command(
                update={"plan": plan, "messages": new_messages, "next_node": "review_plan"},
                goto="summarize_messages"
            )
        else:
            return Command(
                update={"plan": plan, "messages": new_messages},
                goto="review_plan"
            )
    finally:
        append_to_conversation_log(state.get("repo_path", "."), state["issue_number"], messages + (new_messages if 'new_messages' in locals() else []))


def review_plan(state: PlannerState) -> Command:
    feedback = interrupt({
        "question": "Any changes to the plan? (Leave blank to approve)",
        "plan": state["plan"]
    })
    
    if isinstance(feedback, str) and feedback.strip():
        return Command(
            update={"messages": [HumanMessage(content=f"User feedback on plan: {feedback}")]},
            goto="generate_plan"
        )
    return Command(goto=END)


def build_planner_graph():
    graph = StateGraph(PlannerState)

    graph.add_node("generate_tasks", generate_tasks)
    graph.add_node("review_tasks", review_tasks)
    graph.add_node("understand_codebase", understand_codebase)
    graph.add_node("generate_plan", generate_plan)
    graph.add_node("review_plan", review_plan)
    graph.add_node("summarize_messages", summarize_messages)

    graph.add_edge(START, "generate_tasks")
    
    return graph


def run_agent_plan(prompt: str, repo_path: str, issue_number: int, feedback: Optional[str] = None) -> str:
    config = load_config()
    if not config:
        return "Error: Devon is not configured."

    if config.llm_provider.lower() != "ollama":
        return f"Error: Provider {config.llm_provider} is not supported yet."

    issue_dir = f".devon/issues/{issue_number}"

    original_cwd = os.getcwd()
    os.chdir(repo_path)
    os.makedirs(issue_dir, exist_ok=True)

    folder_md = ""
    if os.path.exists(".devon/folder.md"):
        with open(".devon/folder.md", "r", encoding="utf-8") as f:
            folder_md = f.read()

    try:
        db_path = get_issue_checkpoint_path(repo_path, issue_number)
        
        with get_checkpointer(db_path) as checkpointer:
            graph = build_planner_graph().compile(checkpointer=checkpointer)
            config_run = {"configurable": {"thread_id": f"issue_{issue_number}"}}

            if feedback is not None:
                result = graph.invoke(Command(resume=feedback), config=config_run)
            else:
                state = graph.get_state(config_run)
                if state.values:
                    result = graph.invoke(None, config=config_run)
                else:
                    result = graph.invoke({
                        "issue_prompt": prompt,
                        "repo_path": repo_path,
                        "issue_number": issue_number,
                        "folder_md": folder_md,
                        "tasks": [],
                        "file_context": "",
                        "plan": "",
                        "messages": [],
                        "next_node": ""
                    }, config=config_run)

        if result.get("plan"):
            return f"Implementation Plan saved to .devon/issues/{issue_number}/plan.md"
        elif result.get("tasks"):
            return f"Tasks created ({len(result['tasks'])}), but plan file was not written."
        else:
            return "Agent completed but no output was produced."

    except Exception as e:
        return f"Agent execution failed: {e}"
    finally:
        os.chdir(original_cwd)


def _print_tasks_table(tasks: list):
    table = Table(box=box.SIMPLE_HEAVY, header_style="bold")
    table.add_column("#", justify="right", width=4)
    table.add_column("Task", min_width=30)
    table.add_column("Status", width=12)

    status_styles = {
        "pending": "[dim]pending[/dim]",
        "in_progress": "[bold yellow]in progress[/bold yellow]",
        "done": "[bold green]✓ done[/bold green]",
    }

    for t in tasks:
        table.add_row(
            str(t["id"]),
            t["title"],
            status_styles.get(t["status"], t["status"]),
        )
    get_console().print(table)
