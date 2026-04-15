# Graph Report - C:\Users\Udaykumar Dhokia\Desktop\Personal\devon  (2026-04-15)

## Corpus Check
- Corpus is ~1,118 words - fits in a single context window. You may not need a graph.

## Summary
- 46 nodes · 63 edges · 8 communities detected
- Extraction: 68% EXTRACTED · 32% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.66)
- Token cost: 1,458 input · 892 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CLI & Repo Management|CLI & Repo Management]]
- [[_COMMUNITY_GitHub Integration|GitHub Integration]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Configuration & Onboarding|Configuration & Onboarding]]
- [[_COMMUNITY_CLI Output Functions|CLI Output Functions]]
- [[_COMMUNITY_Main Entry Point|Main Entry Point]]
- [[_COMMUNITY_Graphify Scripts|Graphify Scripts]]
- [[_COMMUNITY_Python Version Requirements|Python Version Requirements]]

## God Nodes (most connected - your core abstractions)
1. `code()` - 14 edges
2. `GitHubService` - 9 edges
3. `RepoManager` - 9 edges
4. `Config` - 8 edges
5. `onboard()` - 5 edges
6. `Devon` - 5 edges
7. `Devon CLI - Your AI coding assistant.` - 4 edges
8. `Onboard Devon with GitHub credentials.` - 4 edges
9. `Start Devon's interactive coding shell.` - 4 edges
10. `print_success()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `code()` --calls--> `load_config()`  [INFERRED]
  src\devon\cli.py → src\devon\config.py
- `code()` --calls--> `GitHubService`  [INFERRED]
  src\devon\cli.py → src\devon\github_service.py
- `code()` --calls--> `RepoManager`  [INFERRED]
  src\devon\cli.py → src\devon\manager.py
- `Devon CLI - Your AI coding assistant.` --uses--> `GitHubService`  [INFERRED]
  src\devon\cli.py → src\devon\github_service.py
- `Devon CLI - Your AI coding assistant.` --uses--> `Config`  [INFERRED]
  src\devon\cli.py → src\devon\config.py

## Hyperedges (group relationships)
- **GitHub Integration Stack** — README_devon, README_github, README_pygithub [EXTRACTED 1.00]
- **Technical Stack** — README_python314, README_click_rich, README_pydantic, README_uv [EXTRACTED 1.00]

## Communities

### Community 0 - "CLI & Repo Management"
Cohesion: 0.18
Nodes (6): main(), Devon CLI - Your AI coding assistant., Clone a repository into local storage.         Returns 0 because indexing is no, List all cloned repositories., Delete a local repository., RepoManager

### Community 1 - "GitHub Integration"
Cohesion: 0.2
Nodes (5): Start Devon's interactive coding shell., GitHubService, Fetch all repositories for the authenticated user., Fetch a specific repository by its full name (e.g., 'owner/repo')., Construct an authenticated clone URL using the token.

### Community 2 - "Project Documentation"
Cohesion: 0.22
Nodes (9): Click & Rich, Devon, GitHub, Premium Black & White Monochrome Design, Pydantic, PyGithub, Secret Types, Secure Credential Handling (+1 more)

### Community 3 - "Configuration & Onboarding"
Cohesion: 0.43
Nodes (5): BaseModel, onboard(), Onboard Devon with GitHub credentials., Config, load_config()

### Community 4 - "CLI Output Functions"
Cohesion: 0.7
Nodes (4): code(), print_error(), print_header(), print_success()

### Community 5 - "Main Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 6 - "Graphify Scripts"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Python Version Requirements"
Cohesion: 1.0
Nodes (1): Python 3.14+

## Knowledge Gaps
- **12 isolated node(s):** `Fetch all repositories for the authenticated user.`, `Fetch a specific repository by its full name (e.g., 'owner/repo').`, `Construct an authenticated clone URL using the token.`, `Clone a repository into local storage.         Returns 0 because indexing is no`, `List all cloned repositories.` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Main Entry Point`** (2 nodes): `main()`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Graphify Scripts`** (1 nodes): `run_ast.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Python Version Requirements`** (1 nodes): `Python 3.14+`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `code()` connect `CLI Output Functions` to `CLI & Repo Management`, `GitHub Integration`, `Configuration & Onboarding`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `GitHubService` connect `GitHub Integration` to `CLI & Repo Management`, `Configuration & Onboarding`, `CLI Output Functions`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `RepoManager` connect `CLI & Repo Management` to `GitHub Integration`, `Configuration & Onboarding`, `CLI Output Functions`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `code()` (e.g. with `load_config()` and `GitHubService`) actually correct?**
  _`code()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GitHubService` (e.g. with `Devon CLI - Your AI coding assistant.` and `Onboard Devon with GitHub credentials.`) actually correct?**
  _`GitHubService` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `RepoManager` (e.g. with `Devon CLI - Your AI coding assistant.` and `Onboard Devon with GitHub credentials.`) actually correct?**
  _`RepoManager` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Config` (e.g. with `Devon CLI - Your AI coding assistant.` and `Onboard Devon with GitHub credentials.`) actually correct?**
  _`Config` has 4 INFERRED edges - model-reasoned connections that need verification._