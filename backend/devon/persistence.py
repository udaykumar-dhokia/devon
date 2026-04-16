import json
import sqlite3
import unicodedata
import os
from datetime import datetime, timezone
from contextlib import contextmanager
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.load import dumpd
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

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

def _message_to_frontend_dict(m):
    """Converts a message into a standardized format for frontend use."""
    m_dict = dumpd(m)
    data = m_dict.get("kwargs", {}) if "kwargs" in m_dict else m_dict
    
    role = "user"
    if isinstance(m, SystemMessage):
        role = "system"
    elif isinstance(m, AIMessage):
        role = "assistant"
    elif isinstance(m, ToolMessage):
        role = "tool"
    elif isinstance(m, HumanMessage):
        role = "user"
    
    return {
        "role": role,
        "content": str(data.get("content", "")),
        "tool_calls": data.get("tool_calls", []),
        "tool_call_id": data.get("tool_call_id", ""),
        "name": data.get("name", ""),
        "id": str(m_dict.get("id", "")),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "raw": m_dict
    }

def append_to_conversation_log(repo_path: str, issue_number: int, messages: list):
    """Appends new messages to the conversation log JSON file, avoiding duplicates."""
    issue_dir = os.path.join(repo_path, ".devon", "issues", str(issue_number))
    os.makedirs(issue_dir, exist_ok=True)
    log_path = os.path.join(issue_dir, "conversation.json")
    
    existing_log = []
    if os.path.exists(log_path):
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                existing_log = json.load(f)
        except (json.JSONDecodeError, IOError):
            existing_log = []

    def get_fingerprint(item):
        """Unified fingerprint for deduplication."""
        m_dict = item.get("raw") if isinstance(item, dict) and "raw" in item else item
        try:
            data = m_dict.get("kwargs", {}) if "kwargs" in m_dict else m_dict
            return (
                str(m_dict.get("id", "")),
                str(m_dict.get("lc", "")),
                str(data.get("content", "")),
                str(data.get("tool_calls", [])),
                str(data.get("tool_call_id", ""))
            )
        except Exception:
            return str(m_dict)

    existing_fingerprints = {get_fingerprint(m) for m in existing_log}
    
    new_entries_added = False
    for m in messages:
        frontend_item = _message_to_frontend_dict(m)
        fp = get_fingerprint(frontend_item)
        if fp not in existing_fingerprints:
            existing_log.append(frontend_item)
            existing_fingerprints.add(fp)
            new_entries_added = True
            
    if new_entries_added:
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(existing_log, f, indent=2)
