import os
from pathlib import Path
from langchain_core.tools import tool

IGNORE_DIRS = {".git", ".venv", "venv", "env", ".env", "node_modules", "__pycache__", ".ruff_cache", "dist", "build"}
IGNORE_FILES = {".DS_Store"}

def is_ignored(path_str: str) -> bool:
    path = Path(path_str)
    for part in path.parts:
        if part in IGNORE_DIRS or part in IGNORE_FILES:
            return True
    return False

@tool
def list_directory(path: str = ".", **kwargs) -> str:
    """Lists all files and directories in the given path, ignoring standard virtual environments and cache directories.
    Helps understand the structure of the repository.
    """
    p = Path(path)
    if not p.exists() or not p.is_dir():
        p = Path(".")
        
    result = []
    try:
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            root_path = Path(root)
            rel_root = root_path.relative_to(p)
            rel_str = str(rel_root) if str(rel_root) != "." else ""
            
            for file in files:
                if file not in IGNORE_FILES and not file.endswith(".pyc"):
                    rel_file_path = os.path.join(rel_str, file) if rel_str else file
                    result.append(rel_file_path)
                    
        return "Files found:\n" + "\n".join(sorted(result))
    except Exception as e:
        return f"Error listing directory: {e}"

@tool
def read_file(path: str, start_line: int = None, end_line: int = None, **kwargs) -> str:
    """Read the contents of a specified file.
    If start_line and end_line are provided (1-indexed), it only reads lines within that range.
    Returns the file content contextually as a string, with line numbers if lines are extracted.
    """
    if is_ignored(path):
        return f"Error: Cannot read sensitive or ignored path '{path}'. Restricted."
        
    p = Path(path)
    if not p.exists() or not p.is_file():
        return f"Error: Path '{path}' does not exist or is not a readable file."
        
    try:
        with open(p, "r", encoding="utf-8") as f:
            lines = f.readlines()

        if start_line is not None and end_line is not None:
            start_index = max(0, start_line - 1)
            end_index = min(len(lines), end_line)
            if start_index >= end_index:
                return f"Error: start_line ({start_line}) must be less than end_line ({end_line}) and within file bounds."
            
            snippet = "".join(f"{i + 1}: {line}" for i, line in enumerate(lines[start_index:end_index], start=start_index))
            return f"--- File snippets ({start_line} to {end_line}) ---\n{snippet}"

        return "".join(lines)
    except UnicodeDecodeError:
        return "Error: Cannot read binary file."
    except Exception as e:
        return f"Error reading file '{path}': {e}"

@tool
def write_file(path: str, content, **kwargs) -> str:
    """Writes the given content to absolute or relative file path.
    Overwrites the existing file directly. Content must be a string. If JSON data is provided, it will be serialized automatically.
    """
    if is_ignored(path):
        return f"Error: Cannot write to restricted path '{path}'."

    if not isinstance(content, str):
        import json
        content = json.dumps(content, indent=2)

    p = Path(path)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing to file '{path}': {e}"

@tool
def search(query: str, path: str = ".", **kwargs) -> str:
    """Searches for a text query in the given directory path.
    Ignored directories are skipped.
    """
    p = Path(path)
    if not p.exists() or not p.is_dir():
        p = Path(".")
        
    results = []
    try:
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                if file in IGNORE_FILES or file.endswith(".pyc"):
                    continue
                file_path = Path(root) / file
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        for i, line in enumerate(f):
                            if query.lower() in line.lower():
                                results.append(f"{file_path}:{i+1}: {line.strip()}")
                                if len(results) >= 50:
                                    results.append("... (truncated)")
                                    return "\n".join(results)
                except Exception:
                    pass
        if not results:
            return f"No results found for '{query}'"
        return "\n".join(results)
    except Exception as e:
        return f"Error searching: {e}"

