import threading
import queue
from typing import Dict, List, Optional, Any
import io
import json
from rich.console import Console

class AgentOutputBuffer:
    def __init__(self):
        self.logs: Dict[str, List[Dict[str, Any]]] = {}
        self.lock = threading.Lock()

    def append(self, job_id: str, event: Dict[str, Any]):
        with self.lock:
            if job_id not in self.logs:
                self.logs[job_id] = []
            import time
            event["timestamp"] = time.time()
            self.logs[job_id].append(event)

    def get_logs(self, job_id: str, clear: bool = False) -> List[Dict[str, Any]]:
        with self.lock:
            logs = self.logs.get(job_id, [])
            if clear:
                self.logs[job_id] = []
            return logs

class APIConsole(Console):
    """A rich console that also sends structured events to a buffer."""
    def __init__(self, job_id: str, buffer: AgentOutputBuffer, *args, **kwargs):
        self.job_id = job_id
        self.buffer = buffer
        self.string_io = io.StringIO()
        super().__init__(file=self.string_io, force_terminal=False, color_system=None, *args, **kwargs)

    def print(self, *args, **kwargs):
        """Standard print falls back to a 'log' event."""
        super().print(*args, **kwargs)
        new_content = self.string_io.getvalue()
        self.string_io.seek(0)
        self.string_io.truncate(0)
        if new_content.strip():
            self.log_event("log", new_content)

    def log_event(self, event_type: str, content: Any):
        self.buffer.append(self.job_id, {"type": event_type, "content": content})

    def log_thought(self, text: str):
        self.log_event("thought", text)

    def log_tool_call(self, tool: str, args: Any):
        self.log_event("tool_call", {"name": tool, "args": args})

    def log_tool_result(self, result: Any):
        self.log_event("tool_result", result)

    def log_phase(self, name: str):
        self.log_event("phase", name)

    def log_status(self, text: str):
        self.log_event("status", text)

global_output_buffer = AgentOutputBuffer()

def get_job_id(repo_name: str, issue_number: Optional[int] = None) -> str:
    if issue_number:
        return f"{repo_name}_{issue_number}"
    return repo_name
