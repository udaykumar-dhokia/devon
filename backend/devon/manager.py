import os
import shutil
import subprocess
from pathlib import Path
from typing import List

from devon.tools import IGNORE_DIRS, IGNORE_FILES


REPOS_DIR = Path.home() / ".devon" / "repos"


def _generate_tree(root_path: Path, prefix: str = "") -> str:
    entries = sorted(root_path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    entries = [
        e for e in entries
        if e.name not in IGNORE_DIRS and e.name not in IGNORE_FILES and not e.name.endswith(".pyc")
    ]

    lines = []
    for i, entry in enumerate(entries):
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        lines.append(f"{prefix}{connector}{entry.name}")

        if entry.is_dir():
            extension = "    " if is_last else "│   "
            lines.append(_generate_tree(entry, prefix + extension))

    return "\n".join(filter(None, lines))


class RepoManager:
    def __init__(self):
        REPOS_DIR.mkdir(parents=True, exist_ok=True)

    def clone(self, clone_url: str, repo_name: str) -> int:
        target_path = REPOS_DIR / repo_name
        if target_path.exists():
            shutil.rmtree(target_path)

        result = subprocess.run(
            ["git", "clone", clone_url, str(target_path)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Git clone failed: {result.stderr}")

        self.init_devon_workspace(repo_name)
        return 0

    def init_devon_workspace(self, repo_name: str):
        target_path = REPOS_DIR / repo_name
        if not target_path.exists():
            raise FileNotFoundError(f"Repository {repo_name} not found.")

        devon_dir = target_path / ".devon"
        devon_dir.mkdir(parents=True, exist_ok=True)
        (devon_dir / "issues").mkdir(parents=True, exist_ok=True)

        tree = _generate_tree(target_path)
        folder_md = f"# Repository Structure\n\n```\n{repo_name}/\n{tree}\n```\n"
        (devon_dir / "folder.md").write_text(folder_md, encoding="utf-8")

    def list_local(self) -> List[str]:
        if not REPOS_DIR.exists():
            return []
        return [d.name for d in REPOS_DIR.iterdir() if d.is_dir()]

    def get_repo_path(self, repo_name: str) -> Path:
        target_path = REPOS_DIR / repo_name
        if not target_path.exists():
             raise FileNotFoundError(f"Repository {repo_name} not found.")
        return target_path

    def get_file_tree(self, repo_name: str):
        repo_path = self.get_repo_path(repo_name)
        return self._walk_tree(repo_path, repo_path)

    def _walk_tree(self, path: Path, repo_root: Path):
        name = path.name
        rel_path = str(path.relative_to(repo_root)).replace("\\", "/")
        if path.is_dir():
            children = []
            try:
                for entry in sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
                    if entry.name in IGNORE_DIRS or entry.name in IGNORE_FILES:
                        continue
                    if entry.name.startswith('.') and entry.name != ".devon":
                        continue
                    children.append(self._walk_tree(entry, repo_root))
            except PermissionError:
                pass
            return {"name": name, "path": rel_path, "type": "directory", "children": children}
        else:
            return {"name": name, "path": rel_path, "type": "file"}

    def delete(self, repo_name: str):
        target_path = REPOS_DIR / repo_name
        if not target_path.exists():
            raise FileNotFoundError(f"Repository {repo_name} not found.")

        for root, dirs, files in os.walk(target_path):
            for d in dirs:
                dir_path = os.path.join(root, d)
                try:
                    os.chmod(dir_path, 0o777)
                except Exception:
                    pass
            for f in files:
                file_path = os.path.join(root, f)
                try:
                    os.chmod(file_path, 0o777)
                except Exception:
                    pass

        shutil.rmtree(target_path)

    def read_file(self, repo_name: str, file_path: str) -> str:
        repo_path = self.get_repo_path(repo_name)
        full_path = repo_path / file_path
        
        if not str(full_path.resolve()).startswith(str(repo_path.resolve())):
            raise PermissionError("Access denied: Path outside repository bounds.")
            
        if not full_path.exists():
            raise FileNotFoundError(f"File {file_path} not found.")
            
        return full_path.read_text(encoding="utf-8")
