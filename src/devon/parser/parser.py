import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import tree_sitter_language_pack as ts_pack

EXTENSION_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".cjs": "javascript",
    ".mjs": "javascript",
    ".mts": "typescript",
    ".go": "go",
    ".java": "java",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".h": "cpp",
    ".hpp": "cpp",
    ".rb": "ruby",
    ".php": "php",
    ".html": "html",
    ".css": "css",
}

from devon.parser.queries import LANGUAGE_QUERIES
from tree_sitter import Query, QueryCursor

class CodeParser:
    def __init__(self):
        self.parsers = {}

    @staticmethod
    def prepare_all_languages():
        """Ensures all supported languages are downloaded and ready for use."""
        languages = list(set(EXTENSION_MAP.values()))
        try:
            ts_pack.download(languages)
            return True
        except Exception:
            return False

    def get_supported_language(self, extension: str) -> Optional[str]:
        return EXTENSION_MAP.get(extension.lower())

    def parse_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Parses a file and extracts high-level symbols with a robust fallback mechanism."""
        lang_id = self.get_supported_language(file_path.suffix)
        if not lang_id:
            return None

        try:
            parser = ts_pack.get_parser(lang_id)
            language = parser.language
            
            with open(file_path, "rb") as f:
                content = f.read()
            
            tree = parser.parse(content)
            
            query_str = LANGUAGE_QUERIES.get(lang_id)
            symbols = []
            
            if query_str:
                try:
                    query = Query(language, query_str)
                    cursor = QueryCursor()
                    captures = cursor.captures(query, tree.root_node)
                    
                    for node, tag in captures:
                        if tag == "symbol" or tag == "import":
                            symbols.append({
                                "type": node.type,
                                "name": self._get_symbol_name(node, content),
                                "docstring": self._get_docstring(node, content),
                                "range": {
                                    "start": node.start_point,
                                    "end": node.end_point
                                }
                            })
                except Exception as qe:
                    # Log error internally and fallback to traversal
                    # In a real CLI we might send this to a log file
                    symbols = self._extract_symbols(tree.root_node, content)
            else:
                symbols = self._extract_symbols(tree.root_node, content)
            
            return {
                "file": str(file_path),
                "language": lang_id,
                "symbols": symbols
            }
        except Exception as e:
            return {"file": str(file_path), "error": str(e)}

    def _get_symbol_name(self, node, content: bytes) -> str:
        """Heuristic to find the name identifier of a class or function node."""
        for child in node.children:
            if child.type in ("identifier", "name", "field_identifier", "type_identifier", "property_identifier", "constant"):
                return content[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
        return "anonymous"

    def _get_docstring(self, node, content: bytes) -> Optional[str]:
        """Simple heuristic to extract docstrings or leading comments."""
        for child in node.children:
            if child.type in ("block", "body", "compound_statement"):
                for sub in child.children:
                    if sub.type in ("string", "comment", "expression_statement"):
                        text = content[sub.start_byte:sub.end_byte].decode("utf-8", errors="ignore").strip()
                        if text: return text
                break
        return None

    def _extract_symbols(self, node, content: bytes) -> List[Dict[str, Any]]:
        """Traverses the AST recursively (robust fallback method)."""
        symbols = []
        interesting_types = {
            "class_definition", "function_definition", "method_definition",
            "class_declaration", "function_declaration", "method_declaration",
            "import_statement", "import_from_statement", "package_declaration"
        }

        def traverse(n):
            if n.type in interesting_types:
                symbols.append({
                    "type": n.type,
                    "name": self._get_symbol_name(n, content),
                    "docstring": self._get_docstring(n, content),
                    "range": {
                        "start": n.start_point,
                        "end": n.end_point
                    }
                })
            for child in n.children:
                traverse(child)

        traverse(node)
        return symbols
