from github import Github
from typing import List
from github.Repository import Repository

class GitHubService:
    def __init__(self, token: str):
        self.gh = Github(token)
        self.token = token

    def get_user_repos(self) -> List[Repository]:
        """Fetch all repositories for the authenticated user."""
        return list(self.gh.get_user().get_repos())

    def get_repo(self, full_name: str) -> Repository:
        """Fetch a specific repository by its full name (e.g., 'owner/repo')."""
        return self.gh.get_repo(full_name)

    def get_authenticated_clone_url(self, repo: Repository) -> str:
        """Construct an authenticated clone URL using the token."""
        url = repo.clone_url
        if url.startswith("https://"):
            return f"https://{self.token}@{url[8:]}"
        return url
