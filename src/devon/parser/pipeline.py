import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from concurrent.futures import ProcessPoolExecutor
from devon.parser.parser import CodeParser

class MarkdownGenerator:
    """Generates LLM-friendly Markdown summaries of files."""
    @staticmethod
    def generate_file_summary(result: Dict[str, Any]) -> str:
        file_path = result.get("file", "unknown")
        lang = result.get("language", "unknown")
        symbols = result.get("symbols", [])
        
        md = [f"# Codebase Knowledge Map: {file_path}"]
        md.append(f"**Language:** {lang}")
        md.append("")
        md.append("## Symbols")
        
        if not symbols:
            md.append("*No significant symbols detected.*")
        else:
            for s in symbols:
                s_type = s["type"].replace("_", " ").title()
                s_name = s["name"]
                s_start = s["range"]["start"][0] + 1
                s_end = s["range"]["end"][0] + 1
                
                md.append(f"### {s_type}: `{s_name}`")
                md.append(f"- **Lines:** {s_start} - {s_end}")
                if s.get("docstring"):
                    doc = s["docstring"].strip().strip('"""').strip("'''").strip()
                    md.append(f"- **Summary:** {doc}")
                md.append("")
        
        return "\n".join(md)

def parse_single_file(file_path: Path, repo_path: Path) -> Optional[Dict[str, Any]]:
    """Helper for multiprocessing."""
    parser = CodeParser()
    result = parser.parse_file(file_path)
    if result and "symbols" in result:
        result["file"] = str(file_path.relative_to(repo_path))
        return result
    return None

class CodebasePipeline:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self.output_dir = repo_path / ".devon" / "codebase"
        self.map_dir = self.output_dir / "map"
        self.jsonl_path = self.output_dir / "symbols.jsonl"
        self.ignore_dirs = {".git", "node_modules", ".devon", "__pycache__", "venv", ".venv"}

    def run(self):
        """Walks the repo, parses files in parallel, and saves Markdown maps and JSONL index."""
        CodeParser.prepare_all_languages()
        
        self.map_dir.mkdir(parents=True, exist_ok=True)
        
        file_paths = []
        from devon.parser.parser import EXTENSION_MAP
        supported_extensions = set(EXTENSION_MAP.keys())
        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix.lower() in supported_extensions and file_path.stat().st_size < 1_000_000:
                    file_paths.append(file_path)

        indexed_count = 0
        all_results = []
        
        with ProcessPoolExecutor() as executor:
            futures = [executor.submit(parse_single_file, fp, self.repo_path) for fp in file_paths]
            
            with open(self.jsonl_path, "w") as jsonl_file:
                for future in futures:
                    try:
                        result = future.result()
                        if result and "symbols" in result:
                            for s in result["symbols"]:
                                entry = {
                                    "file": result["file"],
                                    "language": result["language"],
                                    "name": s["name"],
                                    "type": s["type"],
                                    "start_line": s["range"]["start"][0] + 1,
                                    "end_line": s["range"]["end"][0] + 1,
                                    "docstring": s.get("docstring")
                                }
                                jsonl_file.write(json.dumps(entry) + "\n")
                            
                            md_content = MarkdownGenerator.generate_file_summary(result)
                            target_md_path = self.map_dir / (result["file"] + ".md")
                            target_md_path.parent.mkdir(parents=True, exist_ok=True)
                            with open(target_md_path, "w") as f:
                                f.write(md_content)
                            
                            indexed_count += 1
                    except Exception:
                        continue
        
        self._generate_global_summary(self.repo_path, indexed_count)
        
        return indexed_count

    def _generate_global_summary(self, repo_path: Path, count: int):
        summary_path = self.output_dir / "summary.md"
        with open(summary_path, "w") as f:
            f.write(f"# Codebase Summary: {repo_path.name}\n\n")
            f.write(f"**Total Files Indexed:** {count}\n\n")
            f.write("## Overview\n")
            f.write("This directory contains a semantic map of the codebase, optimized for LLM navigation and search.\n")
            f.write("- **map/**: Contains Markdown summaries of every source file.\n")
            f.write("- **symbols.jsonl**: A text-based database of all symbols across the repository.\n")
