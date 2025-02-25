from flask import Flask, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os
from flask_cors import CORS
import re
from datetime import datetime

# Load environment variables first
load_dotenv()
API_KEY = os.getenv('GEMINI_API_KEY')

# Then define validation functions
def validate_environment():
    """Validate environment variables and configuration."""
    if not os.getenv('GEMINI_API_KEY'):
        raise ValueError("GEMINI_API_KEY environment variable is not set")

def validate_model_response(response):
    """Validate model response."""
    if not response:
        raise ValueError("Empty response from model")
    if not response.text:
        raise ValueError("Empty text in model response")
    return True

# Now validate environment
validate_environment()

# Configure the API
genai.configure(api_key=API_KEY)

# Enhanced generation config for Gemini 2.0 Flash
generation_config = {
    "temperature": 0.7,        # Creativity vs consistency
    "top_p": 0.8,             # Nucleus sampling
    "top_k": 40,              # Top-k sampling
    "max_output_tokens": 2048, # Maximum response length
    "candidate_count": 1,      # Number of response candidates
    "stop_sequences": [],      # No special stop sequences
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Initialize model with Gemini 2.0 Flash
try:
    model = genai.GenerativeModel(
        model_name='models/gemini-2.0-flash',
        generation_config=generation_config,
        safety_settings=safety_settings
    )

    chat_history = {}  # Store chat history by session ID
    # Start a new chat session
    chat = model.start_chat(history=[])
    print("Successfully initialized Gemini 2.0 Flash model")
    
except Exception as e:
    print(f"Error initializing Gemini: {str(e)}")
    raise

# Create Flask app with enhanced CORS
app = Flask(__name__)
CORS(app, resources={
    r"/chat": {
        "origins": ["http://localhost:5173"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"]
    }
})

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
        'math': [
            r'^[P\u03C1\u03B7][\s+]?[+=/*-]',  # Basic math operations with P, ρ, η
            r'^[P\u03C1\u03B7][\d+]',          # Variables with subscripts
            r'[\u03C1\u03B7].*[=+\-*/^]',      # Greek letters in equations
            r'\([0-9.]+\s*[*/+-]\s*[0-9.]+\)', # Basic arithmetic
            r'^.*\s*=\s*.*$',                   # Equations with equals sign
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
    
    # First check if it's a mathematical equation
    for pattern in language_patterns['math']:
        if re.match(pattern, code_line, re.IGNORECASE):
            return 'math'
    
    # Then check other languages
    for lang, patterns in language_patterns.items():
        if lang != 'math':  # Skip math patterns as we already checked them
            for pattern in patterns:
                if re.match(pattern, code_line, re.IGNORECASE):
                    return lang

    # If no specific language is detected, but contains equation-like content
    if re.search(r'[=+\-*/^(){}[\]]', code_line):
        return 'math'  # Default to math for equation-like content
        
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
                    # Special handling for diagrams and math
                    if '@startuml' in current_block[0]:
                        formatted_lines.append('```plantuml')
                    elif 'graph' in current_block[0] or 'sequenceDiagram' in current_block[0]:
                        formatted_lines.append('```mermaid')
                    else:
                        lang = infer_language(current_block[0])
                        if lang == 'math':
                            # Format math blocks specially
                            formatted_lines.append('```math')
                        else:
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
                    elif existing_lang in ['math', 'equation']:
                        formatted_lines.append('```math')
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
            if lang == 'math':
                formatted_lines.append('```math')
            else:
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
    
    # Enhanced table formatting - Fixed regex pattern
    text = re.sub(
        r'(\n\|.*\|)\n(\|.*\|)\n(\|.*\|(\n|$))',
        lambda m: f"{m.group(1)}\n{m.group(2).replace(' ', '')}\n{m.group(3)}",
        text
    )

    # Ensure at least 3 dashes in separator
    text = re.sub(
        r'(\|-+)\|(\s*)\n',
        lambda m: f"|{'|'.join(['---' for _ in m.group(1).split('|') if _])}|\n",
        text
    )
    
    # Ensure proper list indentation
    text = re.sub(r'^\s*[-*+]\s', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s', lambda m: f"{m.group().rstrip()} ", text, flags=re.MULTILINE)
    
    return text

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.json
        print(f"\nReceived request at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Request data: {data}")
        
        # Validate request data
        if not data:
            return jsonify({"error": "No data provided", "status": "error"}), 400
        
        # Extract request data
        question = data.get('message')
        timestamp = data.get('timestamp') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        username = data.get('username', 'GM9125')
        is_regenerate = data.get('regenerate', False)
        session_id = data.get('sessionId', str(datetime.now().timestamp()))
        
        if not question:
            return jsonify({"error": "No message provided", "status": "error"}), 400

        try:
            # Get or create chat session
            if session_id not in chat_history:
                chat_history[session_id] = {
                    'messages': [],
                    'chat_instance': model.start_chat(history=[])
                }
            
            current_session = chat_history[session_id]
            
            # Add user message to history
            current_session['messages'].append({
                'role': 'user',
                'content': question,
                'timestamp': timestamp
            })
            
            # Prepare context with chat history
            context = f"""
Current Time: {timestamp}
Current User: {username}
Chat History:
{chr(10).join([f"{msg['role']}: {msg['content']}" for msg in current_session['messages'][-5:]])}

Instructions: You are ChatGenie, an enhanced AI assistant developed by Ghulam Mustafa using Gemini 2.0 Flash model.
Question: {question}

Response Guidelines:
1. Structure:
   - Use ## for main sections
   - Use ### for subsections
   - Single line breaks between sections
   - No horizontal rules

2. Formatting:
   - **Bold** for important terms
   - *Italic* for emphasis
   - `code` for technical terms
   - > for important notes

3. Code Blocks:
   - Use ```language
   - Include comments
   - Proper indentation

4. Lists and Tables:
   - Numbered lists for steps
   - Bullet points for items
   - Clear table headers
   - 3-dash separators
"""
            
            # Generate response
            response = current_session['chat_instance'].send_message(
                context,
                stream=False
            )
            
            # Validate and format response
            validate_model_response(response)
            formatted_response = format_response(response.text)
            
            # Add bot response to history
            current_session['messages'].append({
                'role': 'assistant',
                'content': formatted_response,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
            
            # Trim history if too long
            if len(current_session['messages']) > 50:
                current_session['messages'] = current_session['messages'][-50:]
            
            print(f"Generated response length: {len(formatted_response)}")
            
            return jsonify({
                "response": formatted_response,
                "timestamp": timestamp,
                "status": "success",
                "sessionId": session_id
            })
            
        except Exception as model_error:
            print(f"Model error: {str(model_error)}")
            error_details = str(model_error)
            if "quota" in error_details.lower():
                error_message = "API quota exceeded"
            elif "invalid" in error_details.lower():
                error_message = "Invalid API key"
            else:
                error_message = f"Model error: {error_details}"
            
            return jsonify({
                "error": error_message,
                "status": "error"
            }), 500

    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({
            "error": f"Server error: {str(e)}",
            "status": "error"
        }), 500

# Add error handler
@app.errorhandler(Exception)
def handle_error(error):
    print(f"Unhandled error: {str(error)}")
    response = {
        "error": "Internal server error",
        "details": str(error),
        "status": "error"
    }
    return jsonify(response), 500


if __name__ == '__main__':
    try:
        print(f"Starting server with Gemini 2.0 Flash model...")
        print(f"Server time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Debug mode: enabled")
        print(f"Server port: 5000")
        print(f"CORS enabled for: http://localhost:5173")
        app.run(port=5000, debug=True)
        
    except Exception as e:
        print(f"Failed to start server: {str(e)}")
        exit(1)