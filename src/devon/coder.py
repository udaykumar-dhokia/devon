import os
import json
import click
import operator
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Literal
from operator import add

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AnyMessage, RemoveMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.types import Command
from devon.persistence import get_issue_checkpoint_path, get_checkpointer

from devon.config import load_config
from devon.tools import list_directory, read_file, write_file, search, search_replace
from rich.console import Console
from rich.table import Table
from rich import box

CONSOLE = Console()
MAX_TOOL_RESULT_LENGTH = 8000
SAFETY_LIMIT = 100


def _truncate(text: str, limit: int = MAX_TOOL_RESULT_LENGTH) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n... (truncated, {len(text) - limit} chars omitted)"


TOOLS = [list_directory, read_file, write_file, search, search_replace]
TOOL_MAP = {t.name: t for t in TOOLS}


def _execute_tools(tool_calls: list) -> tuple[list[ToolMessage], list[str]]:
    results = []
    modified_files = []
    for tc in tool_calls:
        tool_name = tc["name"]
        tool_args = tc["args"]

        CONSOLE.print(f"  [bold cyan]Tool:[/] {tool_name}")
        args_str = str(tool_args)
        if len(args_str) > 500:
            args_str = args_str[:500] + "... (truncated)"
        CONSOLE.print(f"  [dim]{args_str}[/dim]")

        if tool_name in ("write_file", "search_replace") and "path" in tool_args:
            modified_files.append(tool_args["path"])

        tool_fn = TOOL_MAP.get(tool_name)
        if not tool_fn:
            result = f"Error: Unknown tool '{tool_name}'."
        else:
            try:
                result = tool_fn.invoke(tool_args)
            except Exception as e:
                result = f"Error executing tool '{tool_name}': {e}"

        truncated = _truncate(str(result))
        preview = truncated[:200] + ("..." if len(truncated) > 200 else "")
        CONSOLE.print(f"  [green]Result:[/] {preview}\n")

        results.append(ToolMessage(content=truncated, tool_call_id=tc["id"]))
    return results, modified_files


def _run_llm_with_tools(llm, messages: list[AnyMessage]) -> tuple[list[AnyMessage], list[str]]:
    new_messages = []
    modified_files = []
    iteration = 0

    while iteration < SAFETY_LIMIT:
        iteration += 1

        ai_message = llm.invoke(messages + new_messages)
        new_messages.append(ai_message)

        if not getattr(ai_message, "tool_calls", None):
            break

        tool_results, newly_modified = _execute_tools(ai_message.tool_calls)
        new_messages.extend(tool_results)
        modified_files.extend(newly_modified)

    return new_messages, modified_files


def merge_files(old, new):
    return list(set((old or []) + (new or [])))


class CoderState(TypedDict):
    repo_path: str
    issue_number: int
    folder_md: str
    plan: str
    tasks: list[dict]
    current_task_index: int
    messages: Annotated[list[AnyMessage], add_messages]
    modified_files: Annotated[list[str], merge_files]
    last_summary: str
    next_node: str

def _save_tasks(tasks_path: str, tasks_data: dict):
    with open(tasks_path, "w", encoding="utf-8") as f:
        json.dump(tasks_data, f, indent=2)


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
    CONSOLE.print(table)


def load_context(state: CoderState) -> Command:
    CONSOLE.print("\n[bold yellow]═══ Phase: Loading Context ═══[/]\n")

    tasks = state["tasks"]
    pending = [i for i, t in enumerate(tasks) if t["status"] in ("pending", "in_progress")]

    if not pending:
        CONSOLE.print("[bold green]All tasks are already completed![/]")
        return Command(goto=END)

    current_index = pending[0]
    task = tasks[current_index]

    CONSOLE.print(f"[bold]Starting with Task {task['id']}/{len(tasks)}:[/] {task['title']}")
    _print_tasks_table(tasks)

    return Command(
        update={"current_task_index": current_index},
        goto="execute_task"
    )


def summarize_messages(state: CoderState) -> Command:
    CONSOLE.print("\n[dim]Context window exceeded. Summarizing memory...[/dim]\n")
    
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


def execute_task(state: CoderState) -> Command:
    task = state["tasks"][state["current_task_index"]]

    CONSOLE.print(f"\n[bold yellow]═══ Phase: Executing Task {task['id']} ═══[/]\n")
    CONSOLE.print(f"[bold magenta]{task['title']}[/]\n")

    config = load_config()
    llm = ChatOllama(
        model=config.llm_model_name,
        base_url=config.llm_base_url,
    ).bind_tools(TOOLS)

    tasks = state["tasks"]
    issue_dir = f".devon/issues/{state['issue_number']}"
    tasks_path = f"{issue_dir}/tasks.json"

    task["status"] = "in_progress"
    _save_tasks(tasks_path, {"issue_number": state["issue_number"], "tasks": tasks})

    completed_tasks = [t for t in tasks if t["status"] == "done"]
    completed_summary = ""
    if completed_tasks:
        completed_summary = "COMPLETED TASKS SO FAR:\n" + "\n".join(
            f"- Task {t['id']}: {t['title']}" for t in completed_tasks
        ) + "\n"

    system = f"""You are Devon, an expert AI software engineer implementing code changes.
Repository: {state['repo_path']}

REPOSITORY STRUCTURE:
{state['folder_md']}

IMPLEMENTATION PLAN:
{state['plan']}

{completed_summary}
CURRENT TASK:
Title: {task['title']}
Description: {task['description']}

AVAILABLE TOOLS:
- `read_file(path, start_line, end_line)` — Read a file. ALWAYS read a file before modifying it.
- `search_replace(path, old_content, new_content)` — Replace exact text in a file.
  - `old_content` MUST be an exact match (including indentation and whitespace).
  - Use `read_file` first to get the exact content you want to replace.
- `write_file(path, content)` — Write entire file content. Use only for NEW files.
  - **CRITICAL**: Parameter name is `content` (singular), NOT `contents`.
- `search(query, path)` — Search for code.
- `list_directory(path)` — List files.

RULES:
- NEVER explore or list the .devon/ directory.
- ALWAYS use `read_file` before modifying a file.
- Prefer `search_replace` for surgical edits.
- **CRITICAL**: When using tools, use EXACT parameter names (e.g., `path`, `old_content`, `new_content`). DO NOT pluralize or guess.
- Focus ONLY on this task.
- Output ONLY valid JSON tool calls. Do not provide any conversational text or explanations.
- Do not repeat tool arguments outside the JSON object.
- When finished, respond with a brief summary of the changes.
"""

    messages = [
        SystemMessage(content=system),
        HumanMessage(content=f"Execute this task:\n\nTitle: {task['title']}\nDescription: {task['description']}"),
    ]
    new_messages, modified_files = _run_llm_with_tools(llm, messages)

    last_summary = ""
    if new_messages and hasattr(new_messages[-1], "content"):
        last_summary = new_messages[-1].content or ""

    if len(state.get("messages", [])) + len(new_messages) > 30:
        return Command(
            update={
                "messages": new_messages, 
                "modified_files": modified_files, 
                "last_summary": last_summary,
                "next_node": "review_task"
            },
            goto="summarize_messages"
        )
    else:
        return Command(
            update={
                "messages": new_messages, 
                "modified_files": modified_files,
                "last_summary": last_summary
            },
            goto="review_task"
        )


def review_task(state: CoderState) -> Command:
    task = state["tasks"][state["current_task_index"]]
    CONSOLE.print(f"\n[bold cyan]Task {task['id']}: {task['title']}[/]")

    feedback = click.prompt("\nAny changes to this task? (Leave blank to approve)", default="", show_default=False)
    if feedback.strip():
        return Command(
            update={"messages": [HumanMessage(content=f"User feedback: {feedback}")]},
            goto="execute_task"
        )
    return Command(goto="mark_task_done")


def update_memory(state: CoderState) -> Command:
    summary = state.get("last_summary", "")
    if summary:
        issue_dir = os.path.join(".devon", "issues", str(state['issue_number']))
        repo_path = state.get("repo_path")
        if repo_path:
            issue_dir = os.path.join(repo_path, issue_dir)
            
        os.makedirs(issue_dir, exist_ok=True)
        memory_path = os.path.join(issue_dir, "memory.md")
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        task = state["tasks"][state["current_task_index"]]
        entry = (
            f"## [{timestamp}] Task: {task['title']}\n\n"
            f"{summary}\n\n"
            f"---\n"
        )
        
        with open(memory_path, "a", encoding="utf-8") as f:
            f.write(entry)
            
        CONSOLE.print(f"[dim]Updated memory.md with summary of Task {task['id']}[/dim]")

    return Command(goto="loop_tasks")


def mark_task_done(state: CoderState) -> Command:
    tasks = state["tasks"]
    task = tasks[state["current_task_index"]]
    issue_dir = f".devon/issues/{state['issue_number']}"
    tasks_path = f"{issue_dir}/tasks.json"

    task["status"] = "done"
    task["completed_at"] = datetime.now(timezone.utc).isoformat()
    _save_tasks(tasks_path, {"issue_number": state["issue_number"], "tasks": tasks})

    CONSOLE.print(f"[bold green]✓ Task {task['id']} completed[/]\n")

    return Command(
        update={"tasks": tasks},
        goto="update_memory"
    )


def loop_tasks(state: CoderState) -> Command:
    tasks = state["tasks"]
    pending = [i for i, t in enumerate(tasks) if t["status"] in ("pending", "in_progress")]

    if not pending:
        CONSOLE.print("\n[bold yellow]═══ Summary ═══[/]")
        _print_tasks_table(tasks)
        return Command(goto=END)

    next_index = pending[0]
    next_task = tasks[next_index]

    CONSOLE.print(f"[bold]Next: Task {next_task['id']}/{len(tasks)}:[/] {next_task['title']}\n")

    delete_msgs = [RemoveMessage(id=m.id) for m in state["messages"] if m.id is not None]

    return Command(
        update={"current_task_index": next_index, "messages": delete_msgs},
        goto="execute_task"
    )


def build_coder_graph():
    graph = StateGraph(CoderState)

    graph.add_node("load_context", load_context)
    graph.add_node("execute_task", execute_task)
    graph.add_node("review_task", review_task)
    graph.add_node("mark_task_done", mark_task_done)
    graph.add_node("update_memory", update_memory)
    graph.add_node("loop_tasks", loop_tasks)
    graph.add_node("summarize_messages", summarize_messages)

    graph.add_edge(START, "load_context")

    return graph


def run_agent_code(repo_path: str, issue_number: int) -> str:
    config = load_config()
    if not config:
        return "Error: Devon is not configured."

    if config.llm_provider.lower() != "ollama":
        return f"Error: Provider {config.llm_provider} is not supported yet."

    issue_dir = f".devon/issues/{issue_number}"
    tasks_path = f"{issue_dir}/tasks.json"
    plan_path = f"{issue_dir}/plan.md"

    original_cwd = os.getcwd()
    os.chdir(repo_path)

    try:
        if not os.path.exists(tasks_path):
            return f"Error: No tasks.json found at {tasks_path}. Run /plan {issue_number} first."

        if not os.path.exists(plan_path):
            return f"Error: No plan.md found at {plan_path}. Run /plan {issue_number} first."

        with open(tasks_path, "r", encoding="utf-8") as f:
            tasks_data = json.load(f)
        tasks = tasks_data.get("tasks", [])

        if not tasks:
            return "Error: tasks.json contains no tasks."

        with open(plan_path, "r", encoding="utf-8") as f:
            plan = f.read()

        folder_md = ""
        if os.path.exists(".devon/folder.md"):
            with open(".devon/folder.md", "r", encoding="utf-8") as f:
                folder_md = f.read()

        db_path = get_issue_checkpoint_path(repo_path, issue_number)
        
        with get_checkpointer(db_path) as checkpointer:
            graph = build_coder_graph().compile(checkpointer=checkpointer)
            config_run = {"configurable": {"thread_id": f"issue_{issue_number}"}}

            result = graph.invoke({
                "repo_path": repo_path,
                "issue_number": issue_number,
                "folder_md": folder_md,
                "plan": plan,
                "tasks": tasks,
                "current_task_index": 0,
                "messages": [],
                "modified_files": [],
                "last_summary": "",
            }, config=config_run)

        completed = [t for t in result.get("tasks", []) if t["status"] == "done"]
        total = len(result.get("tasks", []))
        
        modified = result.get("modified_files", [])
        if modified:
            table = Table(title="MODIFIED FILES", box=box.ROUNDED, header_style="bold magenta")
            table.add_column("File Path")
            for f in sorted(list(set(modified))):
                table.add_row(f)
            CONSOLE.print("\n")
            CONSOLE.print(table)
            CONSOLE.print("\n")

        return f"Coding complete. {len(completed)}/{total} tasks done."

    except Exception as e:
        return f"Coding agent failed: {e}"
    finally:
        os.chdir(original_cwd)
