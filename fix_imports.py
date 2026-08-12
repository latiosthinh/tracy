import os
import re

def fix_unused_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all lucide-react imports
    lucide_match = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"];", content)
    if lucide_match:
        imports_str = lucide_match.group(1)
        imports = [x.strip() for x in imports_str.split(',')]
        imports = [x for x in imports if x]
        
        used_imports = []
        for imp in imports:
            # Check if used (apart from the import statement itself)
            # Find all occurrences of the word
            count = len(re.findall(r'\b' + imp + r'\b', content))
            if count > 1:
                used_imports.append(imp)
                
        if len(used_imports) != len(imports):
            print(f"Removed unused imports in {file_path}: {set(imports) - set(used_imports)}")
            new_imports_str = ',\n  '.join(used_imports)
            new_import_stmt = f"import {{\n  {new_imports_str}\n}} from 'lucide-react';"
            content = content.replace(lucide_match.group(0), new_import_stmt)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_unused_imports(os.path.join(root, file))
