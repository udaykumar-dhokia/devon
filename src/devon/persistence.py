import os
import sqlite3
from contextlib import contextmanager
from langgraph.checkpoint.sqlite import SqliteSaver

def get_issue_checkpoint_path(repo_path: str, issue_number: int) -> str:
    """Returns the path to the SQLite checkpoint database for a specific issue."""
    issue_dir = os.path.join(repo_path, ".devon", "issues", str(issue_number))
    os.makedirs(issue_dir, exist_ok=True)
    return os.path.join(issue_dir, "session.db")

@contextmanager
def get_checkpointer(db_path: str):
    """Context manager to provide a SqliteSaver checkpointer."""
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        checkpointer = SqliteSaver(conn)
        yield checkpointer
    finally:
        conn.close()
