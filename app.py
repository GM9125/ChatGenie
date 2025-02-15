from flask import Flask, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configure the API with your key
API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=API_KEY)

# Initialize the model
model = genai.GenerativeModel('gemini-1.0-pro')

# Start a new chat session
chat = model.start_chat(history=[])

# Create Flask app
app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    question = data.get('message')

    if not question:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Send the message to the model and get a response
        response = chat.send_message(question)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)