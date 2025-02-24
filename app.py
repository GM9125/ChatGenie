from flask import Flask, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os
from flask_cors import CORS
import re
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure the API with your key
API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=API_KEY)

# Initialize the model with specific configuration
generation_config = {
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 2048,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name='gemini-1.0-pro',
    generation_config=generation_config,
    safety_settings=safety_settings
)

# Start a new chat session
chat = model.start_chat(history=[])

# Create Flask app
app = Flask(__name__)
CORS(app)

def infer_language(code_line):
    """Infer the programming language from code snippet."""
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

    code_line = code_line.strip()
    for lang, patterns in language_patterns.items():
        for pattern in patterns:
            if re.match(pattern, code_line, re.IGNORECASE):
                return lang

    # If no specific language is detected, analyze content
    if re.search(r'[{}()]', code_line):
        return 'javascript'  # Default to JavaScript for code-like content
    return 'plaintext'

def format_code_blocks(text):
    """Format code blocks with proper language detection and syntax."""
    lines = text.split('\n')
    formatted_lines = []
    in_code_block = False
    current_block = []
    
    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                # End of code block
                if current_block:
                    # Special handling for diagrams
                    if '@startuml' in current_block[0]:
                        formatted_lines.append('```plantuml')
                    elif 'graph' in current_block[0] or 'sequenceDiagram' in current_block[0]:
                        formatted_lines.append('```mermaid')
                    else:
                        lang = infer_language(current_block[0])
                        formatted_lines.append(f'```{lang}')
                    formatted_lines.extend(current_block)
                formatted_lines.append('```')
                current_block = []
                in_code_block = False
            else:
                # Start of code block
                in_code_block = True
                # Strip any existing language identifier
                if len(line) > 3:
                    existing_lang = line[3:].strip().lower()
                    if existing_lang in ['plantuml', 'uml']:
                        formatted_lines.append('```plantuml')
                    elif existing_lang in ['mermaid']:
                        formatted_lines.append('```mermaid')
                    elif existing_lang:
                        formatted_lines.append(f'```{existing_lang}')
                    else:
                        continue
                else:
                    continue
        elif in_code_block:
            current_block.append(line)
        else:
            formatted_lines.append(line)
    
    # Handle any remaining code block
    if in_code_block and current_block:
        if '@startuml' in current_block[0]:
            formatted_lines.append('```plantuml')
        elif 'graph' in current_block[0] or 'sequenceDiagram' in current_block[0]:
            formatted_lines.append('```mermaid')
        else:
            lang = infer_language(current_block[0])
            formatted_lines.append(f'```{lang}')
        formatted_lines.extend(current_block)
        formatted_lines.append('```')
    
    return '\n'.join(formatted_lines)

def format_response(text):
    """Format the response with enhanced styling and structure."""
    # Pre-process the text
    text = text.strip()
    
    # Handle mathematical equations
    text = re.sub(r'\\\((.*?)\\\)', r'$\1$', text)
    text = re.sub(r'\\\[(.*?)\\\]', r'$$\1$$', text)
    
    # Format code blocks
    text = format_code_blocks(text)
    
    # Ensure proper spacing around headers
    text = re.sub(r'(#{1,6}\s.*?)\n', r'\1\n\n', text)
    
    # Ensure proper spacing around lists
    text = re.sub(r'((?:\d+\.|\*|\-)\s+.*?)\n(?!\d+\.|\*|\-|\s)', r'\1\n\n', text)
    
    # Ensure proper spacing around blockquotes
    text = re.sub(r'(>\s+.*?)\n(?!>)', r'\1\n\n', text)
    
    # Format inline code
    text = re.sub(r'(?<!`)`(?!`)(.*?)(?<!`)`(?!`)', r'`\1`', text)
    
    # Format table separators
    text = re.sub(r'\n\|([\-:]+\|)+\n', lambda m: '\n' + m.group(0).replace(' ', '') + '\n', text)
    
    # Ensure proper list indentation
    text = re.sub(r'^\s*[-*+]\s', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s', lambda m: f"{m.group().rstrip()} ", text, flags=re.MULTILINE)
    
    return text

@app.route('/chat', methods=['POST'])

def chat_endpoint():
    try:
        data = request.json
        print("Received request with data:", data)  # Debug log
        
        if not data:
            return jsonify({"error": "No data provided", "status": "error"}), 400
        
        question = data.get('message')
        timestamp = data.get('timestamp', '2025-02-24 08:38:51')  # Updated default timestamp
        username = data.get('username', 'GM9125')
        is_regenerate = data.get('regenerate', False)
        
        if not question:
            return jsonify({"error": "No message provided", "status": "error"}), 400

        print(f"Processing request - Question: {question}, Time: {timestamp}, User: {username}")  # Debug log

        # Enhanced system prompt
        system_prompt = f"""
You are ChatGenie, an enhanced AI assistant. Format your responses professionally and clearly:

1. Structure and Headers:
   - Use ## for main sections
   - Use ### for subsections
   - Add line breaks between sections

2. Code and Diagram Formatting:
   - Use ```language for code blocks
   - Use ```plantuml for PlantUML diagrams
   - Use ```mermaid for Mermaid.js diagrams
   - Always begin PlantUML with @startuml and end with @enduml
   - Always specify the language for code blocks
   - Include helpful code comments

3. Lists and Points:
   - Use numbered lists (1., 2., etc.) for sequential steps
   - Use bullet points (-) for unordered lists
   - Maintain consistent indentation

4. Emphasis and Formatting:
   - Use **bold** for important concepts
   - Use *italics* for emphasis
   - Use > for important notes or quotes
   - Use --- for horizontal rules between sections

5. Technical Content:
   - Use $ for inline math equations
   - Use $$ for display math equations
   - Format tables using proper markdown alignment
   - Include links when referencing external content
   - Use proper syntax for all diagrams

6. Response Structure:
   - Start with a brief overview
   - Provide detailed explanations
   - Include relevant examples
   - End with a clear conclusion
   - Add next steps or related topics when appropriate

Current Time: {timestamp}
Current User: {username}
"""
        if is_regenerate:
            system_prompt += "\nNote: This is a regenerated response. Providing an alternative perspective."

        # Send the message to the model
        try:
            response = chat.send_message(f"{system_prompt}\n\nUser: {question}")
            print("Got response from model, length:", len(response.text))  # Debug log
        except Exception as model_error:
            print("Model error:", str(model_error))  # Debug log
            raise Exception(f"Model error: {str(model_error)}")

        # Format the response
        formatted_response = format_response(response.text)
        print("Formatted response length:", len(formatted_response))  # Debug log
        
        return jsonify({
            "response": formatted_response,
            "timestamp": timestamp,
            "status": "success"
        })

    except Exception as e:
        print("Error in chat_endpoint:", str(e))  # Debug log
        error_message = f"Server error: {str(e)}"
        return jsonify({
            "error": error_message,
            "timestamp": timestamp if 'timestamp' in locals() else '2025-02-24 08:38:51',
            "status": "error"
        }), 500

if __name__ == '__main__':
    # Enable CORS properly
    CORS(app, resources={
        r"/chat": {
            "origins": ["http://localhost:5173"],  # Your frontend URL
            "methods": ["POST"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    app.run(port=5000, debug=True)