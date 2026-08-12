import os
import re

project_root = r"c:\Projects\AI\tracy"
src_dir = os.path.join(project_root, "src")

import_pattern = re.compile(r"(import\s+.*?from\s+['\"])([.]{1,2}/.*?)(['\"];?)", re.DOTALL)
dynamic_import_pattern = re.compile(r"(import\(['\"])([.]{1,2}/.*?)(['\"]\))", re.DOTALL)

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        prefix = match.group(1)
        rel_path = match.group(2)
        suffix = match.group(3)

        # file_path is the absolute path to the current file
        file_dir = os.path.dirname(file_path)
        
        # Resolve the relative import path
        # os.path.normpath resolves the '.' and '..'
        abs_imported_path = os.path.normpath(os.path.join(file_dir, rel_path))
        
        # Convert to a path relative to the project root
        try:
            rel_to_root = os.path.relpath(abs_imported_path, project_root)
            # Ensure we use forward slashes for TS imports
            rel_to_root = rel_to_root.replace('\\', '/')
            new_import_path = f"@/{rel_to_root}"
            return f"{prefix}{new_import_path}{suffix}"
        except ValueError:
            # If it somehow escapes the project root, just return original
            return match.group(0)

    new_content = import_pattern.sub(replacer, content)
    new_content = dynamic_import_pattern.sub(replacer, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
