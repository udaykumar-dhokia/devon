<div align="center">

<p align="center">
  <img src="./logo-bg.svg" width="80" />
</p>

# Devon - Your Autonomous GitHub Colleague.

**Stop managing issues. Start shipping solutions.**

Devon is a state-of-the-art autonomous coding agent built for the modern developer. It doesn't just "assist" you with snippets—it takes ownership of GitHub issues, analyzes your codebase, builds implementation plans, and executes code changes directly in your repository.

</div>

---

## Why Devon?

Coding is 10% writing and 90% understanding context. Devon flips the script by handling the heavy lifting of context-gathering and planning, so you can focus on the big picture.

- **Fully Autonomous**: From issue description to a verified implementation plan without manual intervention.
- **Local First**: Powered by **Ollama**, Devon runs entirely on your hardware. Your code stays private, and your costs stay zero.
- **LangGraph Intelligence**: Built on a sophisticated state-machine architecture that manages memory summaries, tool usage, and iterative reasoning.
- **Premium Experience**: A monochrome, high-performance interactive shell designed for developers who appreciate speed and aesthetics.

---

## The Automation Cycle

Devon follows a rigorous, multi-phase engineering process:

1.  **Context Mapping**: Devon clones your repo and "feels" the structure.
2.  **Task Decomposition**: It breaks down complex GitHub issues into granular, actionable tasks.
3.  **Codebase Deep-Dive**: It searches and reads your source code to understand current patterns and dependencies.
4.  **Strategic Planning**: It generates a curated `plan.md` for your review.
5.  **Autonomous Execution**: It steps through the plan, writing code and solving the issue.

---

## Installation

Devon uses the [uv](https://github.com/astral-sh/uv) package manager for lightning-fast setup.

```powershell
# Clone the repository
git clone https://github.com/yourusername/devon.git
cd devon

# Sync dependencies
uv sync
```

---

## Quick Start

### 1. Onboard

Connect Devon to your GitHub and point it to your local LLM provider.

```powershell
uv run devon onboard
```

### 2. Enter the Lab

Launch the premium interactive shell.

```powershell
uv run devon code
```

### 3. Solve an Issue

```bash
devon> /clone my-awesome-project
devon> /use my-awesome-project
devon> /issues
devon> /plan 42
devon> /code 42
```

---

## Interactive Commands

| Command         | Description                                                   |
| :-------------- | :------------------------------------------------------------ |
| `/list`         | Fetch and display all your GitHub repositories.               |
| `/clone <repo>` | Smart clone into `~/.devon/repos/`.                           |
| `/repos`        | View locally indexed repositories.                            |
| `/use <name>`   | Select your active workspace context.                         |
| `/issues`       | Browse open issues in the current repo.                       |
| `/plan <#>`     | **[AI]** Analyze and create a structured implementation plan. |
| `/code <#>`     | **[AI]** Execute the plan and write the solution.             |
| `/model`        | Switch between local LLM models on the fly.                   |

---

## Technical DNA

- **Engine**: Python 3.14+
- **Brain**: LangGraph + LangChain + Ollama
- **Parser**: Tree-Sitter (for deep code understanding)
- **UI**: Rich + Monochrome Design System
- **API**: PyGithub

---

## Contributing

We're building the future of autonomous engineering. If you want to contribute, feel free to fork, submit PRs, or open issues.

**Devon is open source and always will be.**

---

<p align="center">
  Built with ❤️ for the builders.
</p>
