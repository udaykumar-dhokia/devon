from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from devon.manager import RepoManager
from devon.config import load_config
import os

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