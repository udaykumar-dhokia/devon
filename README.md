# Devon

Devon is your professional AI coding assistant. It helps you onboard with GitHub and manage your coding projects with a high-performance interactive shell.

## Features

- **Onboarding**: Configure your GitHub credentials securely.
- **Interactive Shell**: A premium, monochrome command environment for repository management.
- **GitHub Integration**: Direct connection to your GitHub account via `PyGithub`.

## Installation

This project uses `uv` for package management.

```bash
uv sync
```

## Usage

### Onboarding

To set up your GitHub credentials:

```bash
uv run devon onboard
```

### Interactive Shell

To enter Devon's interactive coding mode:

```bash
uv run devon code
```

#### Supported Commands in Shell:

- `/list` - List all your GitHub repositories.
- `/clone <repo>` - Clone a repository into `~/.devon/repos/` and select it. (Automatically prepends your username if owner is omitted).
- `/repos` - List all locally cloned repositories.
- `/use <repo_name>` - Select a local repository for the current session.
- `/delete <repo_name>` - Delete a repository from your local system.
- `/help` - Show detailed command help and explanations.
- `/exit` - Exit the interactive shell.

## Technical Details

- **Language**: Python 3.14+
- **CLI Framework**: Click & Rich
- **GitHub API**: PyGithub
- **Config Management**: Pydantic with Secret types.
- **Aesthetics**: Premium Black & White monochrome design.
