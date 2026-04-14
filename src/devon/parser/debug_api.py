import tree_sitter_language_pack as ts_pack
from tree_sitter import Query, Language
import sys

ts_pack.download(['python', 'javascript', 'tsx'])

def debug_api():
    lang_id = 'python'
    parser = ts_pack.get_parser(lang_id)
    language = parser.language
    
    print(f"Language: {lang_id}")
    query_str = "(function_definition) @symbol"
    try:
        # In newer tree-sitter, Query is a constructor
        query = Query(language, query_str)
        print("Query object created successfully.")
        print("Query methods:", [m for m in dir(query) if not m.startswith('_')])
        
        # Test captures on a simple bit of code
        code = b"def hello(): pass"
        tree = parser.parse(code)
        captures = query.captures(tree.root_node)
        print(f"Captures: {captures}")
        
    except Exception as e:
        print(f"Error with {lang_id}: {e}")

debug_api()
