import shutil
import subprocess
from pathlib import Path
from typing import List

REPOS_DIR = Path.home() / ".devon" / "repos"

class RepoManager:
    def __init__(self):
        REPOS_DIR.mkdir(parents=True, exist_ok=True)

    def clone(self, clone_url: str, repo_name: str) -> Path:
        """Clone a repository into the local storage."""
        target_path = REPOS_DIR / repo_name
        if target_path.exists():
            raise FileExistsError(f"Repository {repo_name} already exists locally.")
        
        result = subprocess.run(
            ["git", "clone", clone_url, str(target_path)],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Git clone failed: {result.stderr}")
        
        return target_path

    def list_local(self) -> List[str]:
        """List all cloned repositories."""
        if not REPOS_DIR.exists():
            return []
        return [d.name for d in REPOS_DIR.iterdir() if d.is_dir()]

    def delete(self, repo_name: str):
        """Delete a local repository."""
        target_path = REPOS_DIR / repo_name
        if not target_path.exists():
            raise FileNotFoundError(f"Repository {repo_name} not found.")
        shutil.rmtree(target_path)
