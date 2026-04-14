# Devon

Devon is your professional AI coding assistant. It helps you onboard with GitHub and manage your coding tasks efficiently.

## Features

- **Onboarding**: Easily configure your GitHub credentials.
- **Coding Mode**: Standalone mode for Devon to start working on your codebase.

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

You will be prompted for your GitHub username and token. Credentials are stored securely (masked input) at `~/.devon/config.json`.

### Coding Mode

To start Devon's coding mode:

```bash
uv run devon code
```

## Technical Details

- **Language**: Python 3.14+
- **CLI Framework**: Click
- **Config Management**: Pydantic with masked Secret types.
- **Directory Structure**: SRC layout for modularity and scalability.
