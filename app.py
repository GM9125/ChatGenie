from flask import Flask, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os
from flask_cors import CORS

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

def format_response(text):
    """Format the response to handle markdown and equations properly."""
    # Ensure proper line breaks for markdown
    text = text.replace('\n', '\n\n')
    
    # Format code blocks
    lines = text.split('\n')
    formatted_lines = []
    in_code_block = False
    
    for line in lines:
        if line.startswith('```'):
            in_code_block = not in_code_block
            formatted_lines.append(line)
        else:
            if in_code_block:
                formatted_lines.append(line)
            else:
                # Format math equations
                if '$' in line:
                    line = line.replace('\\(', '$').replace('\\)', '$')
                    line = line.replace('\\[', '$$').replace('\\]', '$$')
                formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    question = data.get('message')

    if not question:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Add system prompt to format responses
        system_prompt = """
        Format your responses using markdown:
        - Use ** for bold text
        - Use ` for inline code
        - Use ``` for code blocks
        - Use $ for inline math equations
        - Use $$ for display math equations
        - Use # for main headers
        - Use ## for subheaders
        - Use * for bullet points
        - Properly format numbered lists
        """
        
        # Send the message to the model
        response = chat.send_message(f"{system_prompt}\n\nUser: {question}")
        
        # Format the response
        formatted_response = format_response(response.text)
        
        return jsonify({"response": formatted_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)