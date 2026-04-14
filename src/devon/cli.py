import click
from devon.config import Config, load_config

@click.group()
def main():
    """Devon CLI - Your AI coding assistant."""
    pass

@main.command()
def onboard():
    """Onboard Devon with GitHub credentials."""
    username = click.prompt("Enter your GitHub username")
    token = click.prompt("Enter your GitHub token", hide_input=True)
    
    config = Config(github_username=username, github_token=token)
    config.save()
    
    click.echo(f"Successfully onboarded {username}!")
    click.echo("Credentials stored at ~/.devon/config.json")

@main.command()
def code():
    """Start Devon's coding mode."""
    config = load_config()
    if not config:
        click.echo("Devon is not onboarded yet. Please run 'devon onboard' first.")
        return
    
    click.echo(f"Welcome back, {config.github_username}! Devon is ready to code.")
    click.echo("Searching for tasks...")

if __name__ == "__main__":
    main()
