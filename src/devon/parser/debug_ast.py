import tree_sitter_language_pack as ts_pack
from devon.parser.parser import CodeParser
from pathlib import Path

p = CodeParser()
p.prepare_all_languages()

def debug_file(path, lang):
    print(f"\n--- Debugging {path} ({lang}) ---")
    try:
        parser = ts_pack.get_parser(lang)
        with open(path, 'rb') as f:
            content = f.read()
        tree = parser.parse(content)
        
        print("Top level node types:", [n.type for n in tree.root_node.children])
        
        # Test simplified query
        query_str = "(class_declaration) @symbol (function_declaration) @symbol (import_statement) @symbol"
        try:
            query = parser.language.query(query_str)
            captures = query.captures(tree.root_node)
            print(f"Simple query found {len(captures)} captures.")
        except Exception as qe:
            print(f"Simple query error: {qe}")
            
    except Exception as e:
        print(f"Error: {e}")

debug_file('/home/ud/.devon/repos/nanopet/frontend/src/main.tsx', 'tsx')
debug_file('/home/ud/.devon/repos/nanopet/backend/main.py', 'python')
