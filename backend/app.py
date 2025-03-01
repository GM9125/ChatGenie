# Basic imports and setup
import os
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# API and environment setup
load_dotenv()
API_KEY = os.getenv('GEMINI_API_KEY')

# Validation functions
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


# Setting up ChatGenie
validate_environment()
genai.configure(api_key=API_KEY)

# Enhanced model configuration for Gemini 2.0 Flash
generation_config = {
    "temperature": 0.7,        # How creative should responses be?
    "top_p": 0.8,              # How focused should responses be?
    "top_k": 40,               # How many options to consider
    "max_output_tokens": 2048, # Maximum words in response
    "candidate_count": 1,      # Number of responses to generate
    "stop_sequences": [],      # When to stop generating
}

# Safety rules to keep conversations appropriate
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Creates our web app and allow it to talk to the frontend
app = Flask(__name__)
CORS(app, resources={
    r"/chat": {
        "origins": ["http://localhost:5173"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"]
    }
})

# Initializing model Gemini 2.0 Flash for ChatGenie
try:
    model = genai.GenerativeModel(
         model_name='models/gemini-2.0-flash',  # Which AI to use
        generation_config=generation_config,    # How it should behave
        safety_settings=safety_settings         # Safety rules
    )

    chat_history = {}   #Remember conversations with users
    # Starts a new chat session
    chat = model.start_chat(history=[])
    print("Successfully initialized Gemini 2.0 Flash model")
    
except Exception as e:
    print(f"Error initializing Gemini: {str(e)}")
    raise

# Language detection patterns for code formatting
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

# Content detection and formatting functions

def infer_language(code_line):
    """Infer the programming language from code snippet."""
    code_line = code_line.strip() # Clean up any extra spaces
    
    for pattern in language_patterns['math']:
        if re.match(pattern, code_line, re.IGNORECASE):
            return 'math'
    
    for lang, patterns in language_patterns.items():
        if lang != 'math':
            for pattern in patterns:
                if re.match(pattern, code_line, re.IGNORECASE):
                    return lang
    
    # If we can't figure it out, just treat it as plain text
    return 'plaintext'

def format_code_blocks(text):
    lines = text.split('\n')
    formatted_lines = []
    in_code_block = False    
    current_block = []     
    
    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                # We found the end of a code block
                if current_block:
                    # Format the code we collected and add it
                    formatted_lines.extend(handle_code_block(current_block))
                formatted_lines.append('```')
                current_block = []
                in_code_block = False
            else:
                # We found the start of a code block
                in_code_block = handle_code_block_start(line, formatted_lines)
        elif in_code_block:
            # We're inside a code block, collect the line
            current_block.append(line)
        else:
            # Regular text, just add it as it is
            formatted_lines.append(line)
    
    # If we have any unfinished code block, handle it
    if in_code_block and current_block:
        formatted_lines.extend(handle_remaining_block(current_block))
    
    # Join everything back together with newlines
    return '\n'.join(formatted_lines)


# Master formatter that applies all formatting rules
def format_response(text):
   
    text = text.strip()  # Remove extra spaces at start and end
    
    # Apply each formatting rule in sequence
    text = handle_math_equations(text)    # Format math equations first
    text = format_code_blocks(text)       # Then handle code blocks
    text = format_markdown_elements(text)  # Then markdown elements
    text = format_tables(text)            # Then tables
    text = format_lists(text)             # Finally, format lists
    
    return text


# Handlers for different types of content blocks
def handle_code_block(block):
   
    if not block:
        return []
    
    # Join the code lines together
    code_content = '\n'.join(block)
    # Try to figure out what programming language it is
    language = infer_language(block[0])
    
    # Add the right language marker
    if language == 'math':
        return [f"```math\n{code_content}"]              # Math equations
    elif language in ['mermaid', 'plantuml']:
        return [f"```{language}\n{code_content}"]        # Diagrams
    else:
        return [f"```{language}\n{code_content}"]
    
    
def handle_code_block_start(line, formatted_lines):
  
    if len(line) > 3:  # If there's a language specified after ```
        lang = line[3:].strip().lower()
        if lang in ['plantuml', 'uml']:
            formatted_lines.append('```plantuml')         # PlantUML diagrams
        elif lang == 'mermaid':
            formatted_lines.append('```mermaid')          # Mermaid diagrams
        elif lang in ['math', 'equation']:
            formatted_lines.append('```math')             # Math equations
        elif lang:
            formatted_lines.append(f"```{lang}")          # Other languages
    return True


def handle_remaining_block(block):
   
    # Check if it's a PlantUML diagram
    if '@startuml' in block[0]:
        return ['```plantuml'] + block
    # Check if it's a Mermaid diagram
    elif any(x in block[0] for x in ['graph', 'sequenceDiagram']):
        return ['```mermaid'] + block
    # For any other code, try to guess the language
    else:
        lang = infer_language(block[0])
        return [f"```{lang}"] + block


# Special formatters for different content types
def handle_math_equations(text):

    # Handle inline math (single $)
    text = re.sub(r'\$([^$]+)\$', r'\\(\1\\)', text)
    # Handle display math (double $$)
    text = re.sub(r'\$\$([^$]+)\$\$', r'\\[\1\\]', text)
    return text


def format_markdown_elements(text):
   
    # Make headers look nice (add space after #)
    text = re.sub(r'^(#{1,6})\s*(.*?)$', r'\1 \2\n', text, flags=re.MULTILINE)
    
    # Make lists consistent (convert * and + to -)
    text = re.sub(r'^\s*[-*+]\s+(.*?)$', r'- \1', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*(\d+\.)\s+(.*?)$', r'\1 \2', text, flags=re.MULTILINE)
    
    # Fix blockquote spacing
    text = re.sub(r'^>\s*(.*?)$', r'> \1', text, flags=re.MULTILINE)
    
    return text


def format_tables(text):
    
    lines = text.split('\n')
    in_table = False
    formatted_lines = []
    
    for line in lines:
        # Check if line is part of a table
        if re.match(r'\|.*\|', line):
            if not in_table:
                in_table = True
            formatted_lines.append(line)
            # Add the separator row (---) after header
            if in_table and len(formatted_lines) == 1:
                cells = line.count('|') - 1
                formatted_lines.append('|' + '---|' * cells)
        else:
            in_table = False
            formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)


def format_lists(text):

    lines = text.split('\n')
    formatted_lines = []
    list_indent = 0
    
    for line in lines:
        # Find list items and their indentation level
        list_match = re.match(r'^(\s*)([-*+]|\d+\.)\s', line)
        if list_match:
            indent = len(list_match.group(1))
            # Add empty line when indentation increases
            if indent > list_indent:
                formatted_lines.append('')
            list_indent = indent
        else:
            list_indent = 0
        formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)


# Chat request handlers and session management
def validate_request(request):
    
    # Get the JSON data from the request
    data = request.json
    if not data:
        raise ValueError("🚫 Oops! No data was sent with the request")
    
    # Check for the actual message
    message = data.get('message')
    if not message:
        raise ValueError("📝 Hey! You need to include a message")
    
    # Return a nice package of all the info we need
    return {
        'message': message,
        'timestamp': data.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
        'username': data.get('username', 'User'),
        'session_id': data.get('sessionId', str(datetime.now().timestamp())),
        'regenerate': data.get('regenerate', False)
    }


def get_or_create_session(data):
    
    session_id = data['session_id']
    
    # If this is a new conversation, set up a fresh chat session
    if session_id not in chat_history:
        chat_history[session_id] = {
            'messages': [], # Store chat messages
            'chat_instance': model.start_chat(history=[]) # Create new chat
        }
    
    return chat_history[session_id]


def generate_response(session, data):

    # Prepare the context for the AI
    context = f"""
Current Time: {data['timestamp']}
Current User: {data['username']}
Chat History:
{chr(10).join([f"{msg['role']}: {msg['content']}" for msg in session['messages'][-5:]])}

Instructions: You are ChatGenie, an enhanced AI assistant developed by Ghulam Mustafa using Gemini 2.0 Flash model.
Question: {data['message']}

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
    
    # Get the AI's response and make sure it's valid
    response = session['chat_instance'].send_message(context, stream=False)
    validate_model_response(response)
    
    return response


def format_chat_response(response, data):
    
    formatted_text = format_response(response.text)
    
    return jsonify({
        "response": formatted_text,          # The formatted message
        "timestamp": data['timestamp'],      # When it was created
        "status": "success",                 # Everything worked! 🎉
        "sessionId": data['session_id']      # Which chat this belongs to
    })


# Error handlers
def handle_chat_error(error):
   
    print(f"💬 Chat error: {str(error)}")
    error_message = str(error)
    
    # Convert technical errors into friendly messages
    if "quota" in error_message.lower():
        error_message = "😅 We've hit our limit for now, please try again later"
    elif "invalid" in error_message.lower():
        error_message = "🔑 There's an issue with the API key"
    
    return jsonify({
        "error": error_message,
        "status": "error"
    }), 500


# Main chat endpoint 
@app.route('/chat', methods=['POST'])
def chat_endpoint():
 
    try:
        # Process the chat request step by step
        data = validate_request(request)           # Check the request
        session = get_or_create_session(data)      # Get or create chat session
        response = generate_response(session, data) # Generate AI response
        return format_chat_response(response, data) # Send it back nicely formatted
    
    except Exception as e:
        return handle_chat_error(e)                # Handle any problems smoothly


# Main chat error handlers
@app.errorhandler(Exception)
def handle_error(error):
    
    print(f"❌ Unexpected error: {str(error)}")
    return jsonify({
        "error": "Something went wrong, but we're on it!",
        "details": str(error),
        "status": "error"
    }), 500


# Server startup
if __name__ == '__main__':
    
    try:
        # Show some nice startup messages
        print("🧞 Starting ChatGenie server...")
        print(f"⏰ Server time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("🐛 Debug mode: enabled")
        print("🚪 Server port: 5000")
        print("🔗 CORS enabled for: http://localhost:5173")
        
        # Start the server
        app.run(port=5000, debug=True)
        
    except Exception as e:
        print(f"❌ Couldn't start server: {str(e)}")
        exit(1)