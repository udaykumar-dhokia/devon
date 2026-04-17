from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from devon.manager import RepoManager
from devon.config import load_config
from devon.github_service import GitHubService
from devon.agent import run_agent_plan, set_global_console as set_planner_console
from devon.coder import run_agent_code, set_global_console as set_coder_console
from devon.server.output_buffer import global_output_buffer, APIConsole, get_job_id
import os
import threading

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Devon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repo_manager = RepoManager()

class RepoInfo(BaseModel):
    name: str

class CloneRequest(BaseModel):
    url: str
    name: str

class CommandRequest(BaseModel):
    command: str

class FeedbackRequest(BaseModel):
    feedback: str

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/repos", response_model=List[RepoInfo])
async def list_repos():
    repos = repo_manager.list_local()
    return [{"name": name} for name in repos]

@app.post("/repos/clone")
async def clone_repo(req: CloneRequest):
    try:
        repo_manager.clone(req.url, req.name)
        return {"status": "success", "repo_name": req.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/repos/{name}/tree")
async def get_repo_tree(name: str):
    try:
        return repo_manager.get_file_tree(name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Repository not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/repos/{name}")
async def delete_repo(name: str):
    try:
        repo_manager.delete(name)
        return {"status": "success"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Repository not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_config():
    config = load_config()
    if not config:
        return {"configured": False}
    return {"configured": True, "data": config.model_dump()}

@app.get("/repos/{name}/file")
async def get_file_content(name: str, path: str):
    try:
        content = repo_manager.read_file(name, path)
        return {"content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/repos/{name}/issues")
async def get_repo_issues(name: str):
    config = load_config()
    if not config:
        raise HTTPException(status_code=401, detail="Devon not onboarded")
    
    try:
        gh = GitHubService(config.github_token.get_secret_value())
        full_name = f"{config.github_username}/{name}"
        issues = gh.get_repo_issues(full_name)
        return [{"number": i.number, "title": i.title, "author": i.user.login} for i in issues]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/repos/{name}/command")
async def execute_command(name: str, req: CommandRequest):
    cmd_text = req.command.strip()
    if not cmd_text.startswith("/"):
        return {"status": "error", "message": "Only slash commands are supported"}

    parts = cmd_text.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd == "/plan":
        if not args:
            return {"status": "error", "message": "Usage: /plan <issue_number>"}
        try:
            issue_number = int(args[0])
        except ValueError:
            return {"status": "error", "message": "Issue number must be an integer"}
        
        job_id = get_job_id(name, issue_number)
        
        thread = threading.Thread(
            target=_run_planner_background,
            args=(name, issue_number)
        )
        thread.start()
        return {"status": "started", "job_id": job_id}

    elif cmd == "/code":
        if not args:
            return {"status": "error", "message": "Usage: /code <issue_number>"}
        try:
            issue_number = int(args[0])
        except ValueError:
            return {"status": "error", "message": "Issue number must be an integer"}
            
        job_id = get_job_id(name, issue_number)
        
        thread = threading.Thread(
            target=_run_coder_background,
            args=(name, issue_number)
        )
        thread.start()
        return {"status": "started", "job_id": job_id}

    elif cmd == "/repos":
        repos = repo_manager.list_local()
        if not repos:
            return {"status": "success", "message": "No local repositories found."}
        return {"status": "success", "message": "Local repositories:\n" + "\n".join([f"- {r}" for r in repos])}

    elif cmd == "/issues":
        try:
            issues = await get_repo_issues(name)
            if not issues:
                return {"status": "success", "message": "No open issues found."}
            issue_list = "\n".join([f"#{i['number']}: {i['title']} (@{i['author']})" for i in issues])
            return {"status": "success", "message": f"Open issues for {name}:\n{issue_list}"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to fetch issues: {e}"}

    elif cmd == "/list":
        config = load_config()
        if not config:
            return {"status": "error", "message": "Devon not onboarded"}
        try:
            gh = GitHubService(config.github_token.get_secret_value())
            repos = gh.get_user_repos()
            repo_list = "\n".join([f"- {r.full_name} ({'Private' if r.private else 'Public'})" for r in repos])
            return {"status": "success", "message": f"Your GitHub Repositories:\n{repo_list}"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to fetch repos: {e}"}

    elif cmd == "/clone":
        if not args:
            return {"status": "error", "message": "Usage: /clone <repo_name> or /clone <owner/repo>"}
        config = load_config()
        if not config:
            return {"status": "error", "message": "Devon not onboarded"}
        repo_input = args[0]
        full_name = repo_input if "/" in repo_input else f"{config.github_username}/{repo_input}"
        try:
            gh = GitHubService(config.github_token.get_secret_value())
            repo = gh.get_repo(full_name)
            clone_url = gh.get_authenticated_clone_url(repo)
            repo_manager.clone(clone_url, repo.name)
            return {"status": "success", "message": f"Successfully cloned {full_name}"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to clone: {e}"}

    elif cmd == "/delete":
        if not args:
            return {"status": "error", "message": "Usage: /delete <repo_name>"}
        repo_name = args[0]
        try:
            repo_manager.delete(repo_name)
            return {"status": "success", "message": f"Deleted local repository: {repo_name}"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to delete: {e}"}

    elif cmd == "/provider":
        config = load_config()
        if not config:
            return {"status": "error", "message": "Devon not onboarded"}
        return {"status": "success", "message": f"Current LLM Provider: {config.llm_provider}"}

    elif cmd == "/model":
        config = load_config()
        if not config:
            return {"status": "error", "message": "Devon not onboarded"}
        if not args:
            return {"status": "success", "message": f"Current Model: {config.llm_model_name}"}
        else:
            new_model = args[0]
            config.llm_model_name = new_model
            config.save()
            return {"status": "success", "message": f"Model updated to: {new_model}"}

    elif cmd == "/models":
        config = load_config()
        if not config:
            return {"status": "error", "message": "Devon not onboarded"}
        if config.llm_provider.lower() == "ollama":
            import urllib.request
            import json
            try:
                url = f"{config.llm_base_url.rstrip('/')}/api/tags"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    models = [m["name"] for m in data.get("models", [])]
                if models:
                    model_list = "\n".join([f"- {m}" for m in sorted(models)])
                    return {"status": "success", "message": f"Available Ollama Models:\n{model_list}"}
                return {"status": "success", "message": "No models found."}
            except Exception as e:
                return {"status": "error", "message": f"Failed to fetch models: {e}"}
        else:
            return {"status": "error", "message": "/models is currently only supported for Ollama provider."}

    elif cmd == "/unuse" or cmd == "/unselect":
        return {"status": "success", "message": "Stopped using the current repository."}

    elif cmd == "/help":
        help_text = """
Available Commands:
- `/plan <issue_number>`: Start the planning agent for an issue
- `/code <issue_number>`: Start the coding agent for an issue
- `/issues`: List open GitHub issues for the current repo
- `/repos`: List local repositories
- `/use <repo_name>`: Switch to a different repository
- `/help`: Show this help message
"""
        return {"status": "success", "message": help_text}

    return {"status": "success", "message": f"Command {cmd} received"}

@app.get("/agent/logs/{repo_name}/{issue_number}")
async def get_agent_logs(repo_name: str, issue_number: int):
    job_id = get_job_id(repo_name, issue_number)
    logs = global_output_buffer.get_logs(job_id, clear=True)
    return {"logs": logs}

@app.post("/agent/input/{repo_name}/{issue_number}")
async def provide_agent_feedback(repo_name: str, issue_number: int, req: FeedbackRequest):
    thread = threading.Thread(
        target=_run_planner_background, 
        args=(repo_name, issue_number, req.feedback)
    )
    thread.start()
    return {"status": "resumed"}

def _run_planner_background(repo_name: str, issue_number: int, feedback: Optional[str] = None):
    job_id = get_job_id(repo_name, issue_number)
    api_console = APIConsole(job_id, global_output_buffer)
    set_planner_console(api_console)
    
    config = load_config()
    gh = GitHubService(config.github_token.get_secret_value())
    full_repo_name = f"{config.github_username}/{repo_name}"
    issue = gh.get_issue(full_repo_name, issue_number)
    prompt = f"Issue #{issue_number}: {issue.title}\n\nDescription:\n{issue.body}"
    repo_path = str(repo_manager.get_repo_path(repo_name))
    
    run_agent_plan(prompt, repo_path, issue_number)

def _run_coder_background(repo_name: str, issue_number: int, feedback: Optional[str] = None):
    job_id = get_job_id(repo_name, issue_number)
    api_console = APIConsole(job_id, global_output_buffer)
    set_coder_console(api_console)
    
    repo_path = str(repo_manager.get_repo_path(repo_name))
    run_agent_code(repo_path, issue_number)