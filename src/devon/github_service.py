from github import Github
from typing import List
from github.Repository import Repository
from github.Issue import Issue


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

    def get_repo_issues(self, full_name: str) -> List[Issue]:
        """Fetch all open issues for a repository."""
        repo = self.gh.get_repo(full_name)
        return list(repo.get_issues(state="open"))

    def get_issue(self, full_name: str, issue_number: int) -> Issue:
        """Fetch a specific issue by number."""
        repo = self.gh.get_repo(full_name)
        return repo.get_issue(number=issue_number)
