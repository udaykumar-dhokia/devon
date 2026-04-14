import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, SecretStr

CONFIG_DIR = Path.home() / ".devon"
CONFIG_FILE = CONFIG_DIR / "config.json"

class Config(BaseModel):
    github_username: str
    github_token: SecretStr

    def save(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        data = self.model_dump()
        data["github_token"] = self.github_token.get_secret_value()
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=4)

def load_config() -> Optional[Config]:
    if not CONFIG_FILE.exists():
        return None
    try:
        with open(CONFIG_FILE, "r") as f:
            data = json.load(f)
            return Config(**data)
    except Exception:
        return None
