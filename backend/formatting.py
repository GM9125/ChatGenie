import re

language_patterns = {
        'python': [
            r'^(async\s+)?def\s+\w+\s*\(',
            r'^from\s+[\w.]+\s+import\s+',
            r'^import\s+[\w.]+',
            r'^class\s+\w+(\s*\([\w.,\s]+\))?\s*:',
            r'@\w+(\.\w+)*(\(.*\))?'
        ],
        'javascript': [
            r'^(async\s+)?function\s*\w*\s*\(',
            r'^const\s+\w+\s*=',
            r'^let\s+\w+\s*=',
            r'^var\s+\w+\s*=',
            r'^class\s+\w+\s*{',
            r'^import\s+.*from\s+[\'"]',
            r'^export\s+',
            r'=>',
            r'}\s*\(\s*\)\s*{',
        ],
        'typescript': [
            r'^interface\s+\w+\s*{',
            r'^type\s+\w+\s*=',
            r':\s*(string|number|boolean|any)\s*[;=]',
            r'^enum\s+\w+',
            r'(import|export)\s+type\s+',
            r':\s*React\.FC<'
        ],
        'mermaid': [
            r'^graph\s+',
            r'^flowchart\s+',
            r'^sequenceDiagram',
            r'^classDiagram',
            r'^erDiagram',
            r'^gantt',
            r'^pie',
            r'^journey'
        ],
        'jsx': [
            r'<\w+(\s+\w+=".*?")*\s*>',
            r'React\.',
            r'useState|useEffect|useContext',
        ],
        'tsx': [
            r'<\w+(\s+\w+=".*?")*\s*>.*?:\s*(string|number|boolean)',
            r'React\.',
            r'useState<',
        ],
        'plantuml': [
            r'^@startuml',
            r'^@enduml',
            r'^entity\s+',
            r'^class\s+.*{',
            r'^participant\s+',
            r'^actor\s+',
            r'^database\s+',
            r'^usecase\s+',
            r'^package\s+',
            r'^namespace\s+',
            r'^interface\s+',
            r'^enum\s+'
        ],
        'html': [
            r'^<!DOCTYPE\s+html>',
            r'^<html',
            r'^<head',
            r'^<body',
            r'^<div',
            r'^<[a-z]+[^>]*>',
        ],
        'css': [
            r'^[\w.-]+\s*{',
            r'^\s*@media\s',
            r'^\s*@keyframes\s',
            r'^\s*@import\s',
            r'^\s*\.',
            r'^\s*#',
        ],
        'java': [
            r'^public\s+(class|interface)\s+',
            r'^private\s+\w+\s+\w+\s*\(',
            r'^protected\s+\w+\s+\w+\s*\(',
            r'System\.out\.',
        ],
        'kotlin': [
            r'^fun\s+\w+',
            r'^val\s+\w+',
            r'^var\s+\w+',
            r'^class\s+\w+(\s*:\s*\w+)?(\s*\(.*\))?\s*[{]',
        ],
        'swift': [
            r'^import\s+Foundation',
            r'^class\s+\w+:\s*\w+',
            r'^let\s+\w+\s*:\s*\w+',
            r'^var\s+\w+\s*:\s*\w+',
        ],
        'cpp': [
            r'^#include\s+[<"]',
            r'std::\w+',
            r'^template\s*<',
            r'->\s*\w+\s*[{;]',
        ],
        'csharp': [
            r'^using\s+\w+(\.\w+)*;',
            r'^namespace\s+\w+',
            r'public\s+class\s+\w+\s*:\s*\w+',
        ],
        'go': [
            r'^package\s+\w+',
            r'^func\s+\w+',
            r'^type\s+\w+\s+struct\s*{',
            r':=',
        ],
        'rust': [
            r'^fn\s+\w+',
            r'^let\s+mut\s+\w+',
            r'^impl\s+\w+',
            r'->\s*Result<',
        ],
        'php': [
            r'^\s*<\?php',
            r'\$\w+\s*=',
            r'function\s+\w+\s*\(',
        ],
        'ruby': [
            r'^require\s+[\'"]',
            r'^def\s+\w+',
            r'^class\s+\w+\s*<\s*\w+',
            r'=>',
        ],
        'math': [
            r'^[P\u03C1\u03B7][\s+]?[+=/*-]',  
            r'^[P\u03C1\u03B7][\d+]',          
            r'[\u03C1\u03B7].*[=+\-*/^]',      
            r'\([0-9.]+\s*[*/+-]\s*[0-9.]+\)', 
            r'^.*\s*=\s*.*$',                   
        ],
        'sql': [
            r'^SELECT\s+',
            r'^INSERT\s+INTO',
            r'^UPDATE\s+',
            r'^DELETE\s+FROM',
            r'^CREATE\s+TABLE',
        ],
        'shell': [
            r'^#!/bin/\w+',
            r'\$\{.*\}',
            r'^source\s+',
            r'\|\s*grep',
        ],
        'powershell': [
            r'^Get-\w+',
            r'^Set-\w+',
            r'\$PSScriptRoot',
        ],
        'dockerfile': [
            r'^FROM\s+',
            r'^RUN\s+',
            r'^CMD\s+',
            r'^ENTRYPOINT\s+',
        ],
        'yaml': [
            r'^\s*[-\s]*\w+:',
            r'^\s*- name:',
        ],
        'json': [
            r'^\s*{',
            r'^\s*\[',
            r'"\w+":\s*[{\["]\w+[}\]"]',
        ],
        'markdown': [
            r'^#+\s+',
            r'^\[.*\]\(.*\)',
            r'^>\s+',
            r'^-\s+',
            r'^\*\s+',
        ]
    }

def infer_language(code_line):
    # Try to determine code language from its syntax
    code_line = code_line.strip()
    # Check math patterns first
    for pattern in language_patterns['math']:
        if re.match(pattern, code_line, re.IGNORECASE):
            return 'math'
    # Check other language patterns
    for lang, patterns in language_patterns.items():
        if lang != 'math':
            for pattern in patterns:
                if re.match(pattern, code_line, re.IGNORECASE):
                    return lang
    return 'plaintext'

def format_code_blocks(text):
    # Process and format code blocks in markdown
    lines = text.split('\n')
    formatted_lines = []
    in_code_block = False
    current_block = []
    
    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                # End current code block
                if current_block:
                    formatted_lines.extend(handle_code_block(current_block))
                formatted_lines.append('```')
                current_block = []
                in_code_block = False
            else:
                # Start new code block
                in_code_block = handle_code_block_start(line, formatted_lines)
        elif in_code_block:
            current_block.append(line)
        else:
            formatted_lines.append(line)
    
    # Handle any remaining code block
    if in_code_block and current_block:
        formatted_lines.extend(handle_remaining_block(current_block))
    
    return '\n'.join(formatted_lines)

def format_response(text):
    # Apply all formatting rules to the response text
    text = text.strip()
    text = handle_math_equations(text)      # Format math expressions
    text = format_code_blocks(text)         # Handle code blocks
    text = format_markdown_elements(text)    # Format markdown syntax
    text = format_tables(text)              # Format tables
    text = format_lists(text)               # Format lists
    return text

def handle_code_block(block):
    # Process content within code blocks
    if not block:
        return []
    code_content = '\n'.join(block)
    language = infer_language(block[0])
    if language == 'math':
        return [f"```math\n{code_content}"]
    elif language in ['mermaid', 'plantuml']:
        return [f"```{language}\n{code_content}"]
    else:
        return [f"```{language}\n{code_content}"]

def handle_code_block_start(line, formatted_lines):
    # Handle the start of a code block with language specification
    if len(line) > 3:
        lang = line[3:].strip().lower()
        if lang in ['plantuml', 'uml']:
            formatted_lines.append('```plantuml')
        elif lang == 'mermaid':
            formatted_lines.append('```mermaid')
        elif lang in ['math', 'equation']:
            formatted_lines.append('```math')
        elif lang:
            formatted_lines.append(f"```{lang}")
    return True

def handle_remaining_block(block):
    # Process any unclosed code blocks
    if '@startuml' in block[0]:
        return ['```plantuml'] + block
    elif any(x in block[0] for x in ['graph', 'sequenceDiagram']):
        return ['```mermaid'] + block
    else:
        lang = infer_language(block[0])
        return [f"```{lang}"] + block

def handle_math_equations(text):
    # Convert math delimiters to proper format
    text = re.sub(r'\$([^$]+)\$', r'\\(\1\\)', text)         # Inline math
    text = re.sub(r'\$\$([^$]+)\$\$', r'\\[\1\\]', text)     # Display math
    return text

def format_markdown_elements(text):
    # Format basic markdown syntax elements
    text = re.sub(r'^(#{1,6})\s*(.*?)$', r'\1 \2\n', text, flags=re.MULTILINE)  # Headers
    text = re.sub(r'^\s*[-*+]\s+(.*?)$', r'- \1', text, flags=re.MULTILINE)     # Bullet lists
    text = re.sub(r'^\s*(\d+\.)\s+(.*?)$', r'\1 \2', text, flags=re.MULTILINE)  # Numbered lists
    text = re.sub(r'^>\s*(.*?)$', r'> \1', text, flags=re.MULTILINE)            # Blockquotes
    return text

def format_tables(text):
    # Format markdown tables with proper alignment
    lines = text.split('\n')
    in_table = False
    formatted_lines = []
    
    for line in lines:
        if re.match(r'\|.*\|', line):
            if not in_table:
                in_table = True
            formatted_lines.append(line)
            if in_table and len(formatted_lines) == 1:
                cells = line.count('|') - 1
                formatted_lines.append('|' + '---|' * cells)
        else:
            in_table = False
            formatted_lines.append(line)
    return '\n'.join(formatted_lines)


def format_lists(text):
    # Format nested lists with proper spacing
    lines = text.split('\n')
    formatted_lines = []
    list_indent = 0
    
    for line in lines:
        list_match = re.match(r'^(\s*)([-*+]|\d+\.)\s', line)
        if list_match:
            indent = len(list_match.group(1))
            if indent > list_indent:
                formatted_lines.append('')
            list_indent = indent
        else:
            list_indent = 0
        formatted_lines.append(line)
    return '\n'.join(formatted_lines)