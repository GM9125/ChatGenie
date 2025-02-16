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
        ],
        'javascript': [
            r'^(async\s+)?function\s*\w*\s*\(',
            r'^const\s+\w+\s*=',
            r'^let\s+\w+\s*=',
            r'^var\s+\w+\s*=',
            r'^class\s+\w+\s*{',
            r'^import\s+.*from\s+[\'"]',
            r'^export\s+',
        ],
        'typescript': [
            r'^interface\s+\w+\s*{',
            r'^type\s+\w+\s*=',
            r':\s*(string|number|boolean|any)\s*[;=]',
        ],
        'html': [
            r'^<!DOCTYPE\s+html>',
            r'^<html',
            r'^<div',
            r'^<[a-z]+[^>]*>',
        ],
        'css': [
            r'^[\w.-]+\s*{',
            r'^\s*@media\s',
            r'^\s*@keyframes\s',
        ],
        'java': [
            r'^public\s+class\s+',
            r'^private\s+\w+\s+\w+\s*\(',
            r'^protected\s+\w+\s+\w+\s*\(',
        ],
        'cpp': [
            r'^#include\s+[<"]',
            r'std::\w+',
        ],
        'sql': [
            r'^SELECT\s+',
            r'^INSERT\s+INTO',
            r'^UPDATE\s+',
            r'^DELETE\s+FROM',
        ],
        'bash': [
            r'^#!/bin/bash',
            r'\$\{.*\}',
            r'^source\s+',
        ],
        'markdown': [
            r'^#+\s+',
            r'^\[.*\]\(.*\)',
            r'^>\s+',
        ]
    }

    code_line = code_line.strip()
    for lang, patterns in language_patterns.items():
        for pattern in patterns:
            if re.match(pattern, code_line, re.IGNORECASE):
                return lang
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
                    lang = infer_language(current_block[0])
                    formatted_lines.append(f'```{lang}')
                    formatted_lines.extend(current_block)
                formatted_lines.append('```')
                current_block = []
                in_code_block = False
            else:
                # Start of code block
                in_code_block = True
                if len(line) > 3:
                    # If language is specified, keep it
                    formatted_lines.append(line)
                # else language will be inferred when block ends
        elif in_code_block:
            current_block.append(line)
        else:
            formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)

def format_response(text):
    """Format the response to be more like modern AI chatbots."""
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
    
    return text

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    question = data.get('message')

    if not question:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Enhanced system prompt for better formatting
        system_prompt = """
        You are ChatGenie, an enhanced AI assistant. Format your responses professionally and clearly:

        1. Structure and Headers:
           - Use ## for main sections
           - Use ### for subsections
           - Add line breaks between sections

        2. Code Formatting:
           - Use ```language for code blocks
           - Use `backticks` for inline code
           - Always specify the language for code blocks
           - Include helpful code comments

        3. Lists and Points:
           - Use numbered lists (1., 2., etc.) for sequential steps
           - Use bullet points (-) for unordered lists
           - Maintain consistent indentation

        4. Emphasis:
           - Use **bold** for important concepts
           - Use *italics* for emphasis
           - Use > for important notes or quotes

        5. Technical Content:
           - Use $ for inline math equations
           - Use $$ for display math equations
           - Format tables using proper markdown
           - Include links when referencing external content

        6. Remember:
           - Keep explanations clear and concise
           - Use examples when helpful
           - Break down complex concepts
           - End with a clear conclusion or next steps
        """
        
        # Send the message to the model
        response = chat.send_message(f"{system_prompt}\n\nUser: {question}")
        
        # Format the response
        formatted_response = format_response(response.text)
        
        # Add timestamp to response
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        return jsonify({
            "response": formatted_response,
            "timestamp": timestamp,
            "status": "success"
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

if __name__ == '__main__':
    app.run(port=5000)