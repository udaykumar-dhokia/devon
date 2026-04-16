import click
import sys
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt
from rich import box

from devon.config import load_config
from devon.github_service import GitHubService
from devon.manager import RepoManager

CONSOLE = Console()


def print_header(text: str):
    CONSOLE.print(Panel(text, box=box.HEAVY, style="bold white on black", expand=False))


def print_error(text: str):
    CONSOLE.print(f"[bold white on black] ERR [/bold white on black] {text}")


def print_success(text: str):
    CONSOLE.print(f"[bold black on white] OK [/bold black on white] {text}")


@click.group()
def main():
    """Devon CLI - Your AI coding assistant."""
    pass


@main.command()
def onboard():
    """Onboard Devon with GitHub credentials and LLM configuration."""
    from devon.config import Config, load_config
    import urllib.request
    import json

    existing_config = load_config()

    current_username = existing_config.github_username if existing_config else None
    current_token = (
        existing_config.github_token.get_secret_value() if existing_config else None
    )
    current_provider = existing_config.llm_provider if existing_config else "ollama"
    current_base_url = (
        existing_config.llm_base_url if existing_config else "http://localhost:11434"
    )
    current_model = existing_config.llm_model_name if existing_config else "llama3.1"

    username = click.prompt("Enter your GitHub username", default=current_username)

    if current_token:
        token_input = click.prompt(
            "Enter your GitHub token (leave blank to keep current)",
            default="",
            show_default=False,
            hide_input=True,
        )
        token = token_input if token_input else current_token
    else:
        token = click.prompt("Enter your GitHub token", hide_input=True)

    provider = click.prompt("Enter your LLM Provider", default=current_provider)

    config_kwargs = {
        "github_username": username,
        "github_token": token,
        "llm_provider": provider,
    }

    if provider.lower() == "ollama":
        base_url = click.prompt("Enter your Ollama Base URL", default=current_base_url)
        config_kwargs["llm_base_url"] = base_url

        CONSOLE.print("[bold]Fetching available models from Ollama...[/]")
        try:
            url = f"{base_url.rstrip('/')}/api/tags"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                models = [m["name"] for m in data.get("models", [])]

            if models:
                CONSOLE.print("Available models:")
                for i, model_name in enumerate(models, 1):
                    CONSOLE.print(f"{i}. {model_name}")

                default_choice = 1
                if current_model in models:
                    default_choice = models.index(current_model) + 1

                choice = click.prompt(
                    "Select a model by number", type=int, default=default_choice
                )
                if 1 <= choice <= len(models):
                    config_kwargs["llm_model_name"] = models[choice - 1]
                else:
                    CONSOLE.print(
                        f"[yellow]Invalid selection, defaulting to {current_model}[/]"
                    )
                    config_kwargs["llm_model_name"] = current_model
            else:
                CONSOLE.print(
                    f"[yellow]No models found. Defaulting to {current_model}[/]"
                )
                config_kwargs["llm_model_name"] = current_model
        except Exception as e:
            CONSOLE.print(f"[bold red]Failed to fetch models: {e}[/]")
            CONSOLE.print(f"[yellow]Defaulting to {current_model}[/]")
            config_kwargs["llm_model_name"] = current_model
    else:
        config_kwargs["llm_model_name"] = current_model

    config = Config(**config_kwargs)
    config.save()

    print_success(f"Successfully onboarded {username}!")
    click.echo("Credentials stored at ~/.devon/config.json")


@main.command()
def code():
    """Start Devon's interactive coding shell."""
    config = load_config()
    if not config:
        print_error("Devon is not onboarded yet. Please run 'devon onboard' first.")
        return

    gh = GitHubService(config.github_token.get_secret_value())
    manager = RepoManager()

    print_header("DEVON SHELL")
    CONSOLE.print(
        f"Authenticated as [bold underline]{config.github_username}[/]. Ready to build."
    )
    CONSOLE.print("Type [bold]/exit[/] to quit. Type [bold]/help[/] to explore.\n")

    current_repo = None

    while True:
        try:
            prompt_text = f"devon" + (
                f" [[bold]{current_repo}[/]]" if current_repo else ""
            )
            cmd_input = Prompt.ask(prompt_text).strip()

            if not cmd_input:
                continue

            parts = cmd_input.split()
            cmd = parts[0].lower()
            args = parts[1:]

            if cmd == "/exit":
                print_success("Exiting Devon Shell. Goodbye!")
                break

            elif cmd == "/list":
                with CONSOLE.status("[bold]Fetching repositories...", spinner="dots"):
                    repos = gh.get_user_repos()

                table = Table(
                    title="YOUR GITHUB REPOSITORIES",
                    box=box.ASCII2,
                    header_style="bold",
                )
                table.add_column("Repository")
                table.add_column("Visibility")
                table.add_column("Stars", justify="right")

                for r in repos:
                    table.add_row(
                        r.full_name,
                        "Private" if r.private else "Public",
                        str(r.stargazers_count),
                    )

                CONSOLE.print(table)

            elif cmd == "/help":
                table = Table(title="COMMAND HELP", box=box.ASCII2, header_style="bold")
                table.add_column("Command")
                table.add_column("Description")

                table.add_row(
                    "/list", "Fetch and display all your GitHub repositories."
                )
                table.add_row(
                    "/clone <repo>",
                    "Clone a repository (prepends your username if owner is omitted).",
                )
                table.add_row(
                    "/repos", "List all repositories currently cloned on your system."
                )
                table.add_row(
                    "/use <repo_name>",
                    "Select a local repository for the current session context.",
                )
                table.add_row(
                    "/unuse, /unselect",
                    "Unselect the currently selected repository.",
                )
                table.add_row(
                    "/issues <repo>",
                    "Fetch and display all open issues for a repository.",
                )
                table.add_row(
                    "/plan <issue_number>",
                    "Run the Devon AI agent to analyze and implement the issue.",
                )
                table.add_row(
                    "/delete <repo_name>",
                    "Completely remove a repository folder from your local system.",
                )
                table.add_row(
                    "/help",
                    "Show this help message with detailed command explanations.",
                )
                table.add_row("/exit", "Securely close the Devon interactive shell.")

                CONSOLE.print(table)

            elif cmd == "/clone":
                if not args:
                    print_error("Usage: /clone <repo_name> or /clone <owner/repo>")
                    continue

                repo_name = args[0]
                repo_full_name = (
                    repo_name
                    if "/" in repo_name
                    else f"{config.github_username}/{repo_name}"
                )

                try:
                    with CONSOLE.status(f"[bold]Cloning {repo_full_name}..."):
                        repo = gh.get_repo(repo_full_name)
                        clone_url = gh.get_authenticated_clone_url(repo)
                        indexed_count = manager.clone(clone_url, repo.name)
                        current_repo = repo.name
                    print_success(f"Cloned {repo_full_name}")
                except Exception as e:
                    print_error(f"Failed to clone: {e}")

            elif cmd == "/repos":
                local_repos = manager.list_local()
                if not local_repos:
                    CONSOLE.print("No local repositories found. Try [bold]/clone[/].")
                    continue

                table = Table(
                    title="LOCAL REPOSITORIES", box=box.ASCII, header_style="bold"
                )
                table.add_column("Name")
                table.add_column("Status")

                for r in local_repos:
                    status = "[bold]Using[/]" if r == current_repo else ""
                    table.add_row(r, status)

                CONSOLE.print(table)

            elif cmd == "/use":
                if not args:
                    print_error("Usage: /use <repo_name>")
                    continue

                repo_name = args[0]
                if repo_name in manager.list_local():
                    current_repo = repo_name
                    print_success(f"Now using {repo_name}")
                else:
                    print_error(
                        f"Repository {repo_name} not found locally. Use [bold]/repos[/] to list."
                    )

            elif cmd == "/unuse" or cmd == "/unselect":
                if current_repo is None:
                    print_error("No repository is currently selected.")
                else:
                    print_success(f"Stopped using {current_repo}")
                    current_repo = None

            elif cmd == "/issues":
                repo_name = args[0] if args else current_repo

                if repo_name is None:
                    print_error(
                        "Usage: /issues <repo_name> or select a repo first with /use"
                    )
                    continue

                full_name = (
                    repo_name
                    if "/" in repo_name
                    else f"{config.github_username}/{repo_name}"
                )

                with CONSOLE.status("[bold]Fetching issues...", spinner="dots"):
                    issues = gh.get_repo_issues(full_name)

                if not issues:
                    CONSOLE.print("No open issues found.")
                    continue

                table = Table(
                    title=f"ISSUES IN {repo_name}",
                    box=box.ASCII2,
                    header_style="bold",
                )
                table.add_column("#", justify="right")
                table.add_column("Title")
                table.add_column("Author")

                for issue in issues:
                    table.add_row(str(issue.number), issue.title, issue.user.login)

                CONSOLE.print(table)

            elif cmd == "/plan":
                if not args:
                    print_error("Usage: /plan <issue_number>")
                    continue

                if current_repo is None:
                    print_error(
                        "Please select a repository first using /use <repo_name>"
                    )
                    continue

                try:
                    issue_number = int(args[0])
                except ValueError:
                    print_error("Issue number must be an integer.")
                    continue

                full_name = (
                    current_repo
                    if "/" in current_repo
                    else f"{config.github_username}/{current_repo}"
                )

                with CONSOLE.status(
                    f"[bold]Fetching issue #{issue_number}...", spinner="dots"
                ):
                    try:
                        issue = gh.get_issue(full_name, issue_number)
                    except Exception as e:
                        print_error(f"Failed to fetch issue: {e}")
                        continue

                CONSOLE.print(
                    f"[bold blue]Planning for Issue #{issue.number}: {issue.title}[/]"
                )

                prompt = f"Issue #{issue_number}: {issue.title}\n\nDescription:\n{issue.body}"

                from devon.agent import run_agent_plan

                repo_path = str(manager.get_repo_path(current_repo))
                manager.init_devon_workspace(current_repo)

                CONSOLE.print("[bold yellow]Running Devon AI Planning Agent...[/]")
                plan_result = run_agent_plan(prompt, repo_path, issue_number)
                
                CONSOLE.print(f"\n[bold green]Agent Finished:[/] {plan_result}")

            elif cmd == "/delete":
                if not args:
                    print_error("Usage: /delete <repo_name>")
                    continue

                repo_name = args[0]
                try:
                    manager.delete(repo_name)
                    if current_repo == repo_name:
                        current_repo = None
                    print_success(f"Deleted {repo_name}")
                except Exception as e:
                    print_error(str(e))

            else:
                print_error(f"Unknown command: {cmd}")

        except KeyboardInterrupt:
            print_success("\nExiting...")
            break
        except Exception as e:
            print_error(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    main()
