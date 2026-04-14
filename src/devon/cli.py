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
    """Onboard Devon with GitHub credentials."""
    from devon.config import Config
    username = click.prompt("Enter your GitHub username")
    token = click.prompt("Enter your GitHub token", hide_input=True)
    
    config = Config(github_username=username, github_token=token)
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
    CONSOLE.print(f"Authenticated as [bold underline]{config.github_username}[/]. Ready to build.")
    CONSOLE.print("Type [bold]/exit[/] to quit. Type [bold]/help[/] to explore.\n")

    current_repo = None

    while True:
        try:
            prompt_text = f"devon" + (f" [[bold]{current_repo}[/]]" if current_repo else "")
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
                
                table = Table(title="YOUR GITHUB REPOSITORIES", box=box.ASCII2, header_style="bold")
                table.add_column("Repository")
                table.add_column("Visibility")
                table.add_column("Stars", justify="right")
                
                for r in repos:
                    table.add_row(r.full_name, "Private" if r.private else "Public", str(r.stargazers_count))
                
                CONSOLE.print(table)

            elif cmd == "/help":
                table = Table(title="COMMAND HELP", box=box.ASCII2, header_style="bold")
                table.add_column("Command")
                table.add_column("Description")
                
                table.add_row("/list", "Fetch and display all your GitHub repositories.")
                table.add_row("/clone <repo>", "Clone a repository (prepends your username if owner is omitted).")
                table.add_row("/repos", "List all repositories currently cloned on your system.")
                table.add_row("/use <repo_name>", "Select a local repository for the current session context.")
                table.add_row("/delete <repo_name>", "Completely remove a repository folder from your local system.")
                table.add_row("/help", "Show this help message with detailed command explanations.")
                table.add_row("/exit", "Securely close the Devon interactive shell.")
                
                CONSOLE.print(table)

            elif cmd == "/clone":
                if not args:
                    print_error("Usage: /clone <repo_name> or /clone <owner/repo>")
                    continue
                
                repo_name = args[0]
                repo_full_name = repo_name if "/" in repo_name else f"{config.github_username}/{repo_name}"
                
                try:
                    with CONSOLE.status(f"[bold]Preparing grammars and Indexing {repo_full_name}..."):
                        repo = gh.get_repo(repo_full_name)
                        clone_url = gh.get_authenticated_clone_url(repo)
                        indexed_count = manager.clone(clone_url, repo.name)
                        current_repo = repo.name
                    print_success(f"Cloned and indexed {indexed_count} files in {repo_full_name}")
                except Exception as e:
                    print_error(f"Failed to clone: {e}")

            elif cmd == "/repos":
                local_repos = manager.list_local()
                if not local_repos:
                    CONSOLE.print("No local repositories found. Try [bold]/clone[/].")
                    continue
                
                table = Table(title="LOCAL REPOSITORIES", box=box.ASCII, header_style="bold")
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
                    print_error(f"Repository {repo_name} not found locally. Use [bold]/repos[/] to list.")

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
