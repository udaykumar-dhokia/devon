# Tree-sitter S-expression queries for symbol extraction
# Using robust patterns adapted for tree-sitter 0.21+ grammars

LANGUAGE_QUERIES = {
    "python": """
        (class_definition name: (identifier) @name) @symbol
        (function_definition name: (identifier) @name) @symbol
        (import_statement) @import
        (import_from_statement) @import
    """,
    "javascript": """
        (class_declaration name: (identifier) @name) @symbol
        (function_declaration name: (identifier) @name) @symbol
        (method_definition name: (property_identifier) @name) @symbol
        (import_statement) @import
    """,
    "typescript": """
        (class_declaration name: (type_identifier) @name) @symbol
        (function_declaration name: (identifier) @name) @symbol
        (method_definition name: (property_identifier) @name) @symbol
        (import_statement) @import
    """,
    "tsx": """
        (class_declaration name: (type_identifier) @name) @symbol
        (function_declaration name: (identifier) @name) @symbol
        (method_definition name: (property_identifier) @name) @symbol
        (import_statement) @import
    """,
    "go": """
        (type_declaration (type_spec name: (type_identifier) @name)) @symbol
        (function_declaration name: (identifier) @name) @symbol
        (method_declaration name: (field_identifier) @name) @symbol
        (import_declaration) @import
    """,
    "java": """
        (class_declaration name: (identifier) @name) @symbol
        (method_declaration name: (identifier) @name) @symbol
        (import_declaration) @import
    """,
    "rust": """
        (struct_item name: (type_identifier) @name) @symbol
        (enum_item name: (type_identifier) @name) @symbol
        (function_item name: (identifier) @name) @symbol
        (impl_item) @symbol
    """,
    "ruby": """
        (class name: (constant) @name) @symbol
        (method name: (identifier) @name) @symbol
    """,
    "php": """
        (class_declaration name: (name) @name) @symbol
        (function_definition name: (name) @name) @symbol
        (method_declaration name: (name) @name) @symbol
    """,
}
