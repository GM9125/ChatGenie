from datetime import datetime
from flask import jsonify
from validation import validate_model_response
from formatting import format_response
from collections import Counter

# Add constants
MAX_HISTORY_LENGTH = 50
# Update SESSION_TIMEOUT if needed
SESSION_TIMEOUT = 3600  # 1 hour in seconds

# Handles chat operations, sessions, and AI responses
class ChatService:
    def __init__(self, model):
        self.model = model
        self.chat_history = {}
        self.last_cleanup = datetime.now()
        self.metrics = {
            'total_requests': 0,
            'successful_responses': 0,
            'errors': Counter(),
            'cleaned_sessions': 0
        }

    def cleanup_old_sessions(self):
        """Remove expired chat sessions."""
        current_time = datetime.now()
        initial_count = len(self.chat_history)
        
        expired_sessions = [
            session_id for session_id, session in self.chat_history.items()
            if (current_time - session.get('last_access', current_time)).seconds > SESSION_TIMEOUT
        ]
        
        for session_id in expired_sessions:
            del self.chat_history[session_id]
        
        cleaned = initial_count - len(self.chat_history)
        self.metrics['cleaned_sessions'] = self.metrics.get('cleaned_sessions', 0) + cleaned

    def validate_request(self, request):
        """Validate and process incoming request data."""
        try:
            if not request:
                error_msg = "No request object provided"
                self.metrics['errors'][error_msg] += 1
                raise ValueError(error_msg)
                
            try:
                data = request.json
                if not data:
                    error_msg = "🚫 Oops! No data was sent with the request"
                    self.metrics['errors'][error_msg] += 1
                    raise ValueError(error_msg)
                
                message = data.get('message')
                if not message:
                    error_msg = "📝 Hey! You need to include a message"
                    self.metrics['errors'][error_msg] += 1
                    raise ValueError(error_msg)
                    
                return {
                    'message': message,
                    'timestamp': data.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                    'username': data.get('username', 'User'),
                    'session_id': data.get('sessionId', str(datetime.now().timestamp())),
                    'regenerate': data.get('regenerate', False)
                }
            except AttributeError:
                error_msg = "Invalid request format"
                self.metrics['errors'][error_msg] += 1
                raise ValueError(error_msg)
        except Exception as e:
            if str(e) not in self.metrics['errors']:
                self.metrics['errors'][str(e)] += 1
            raise

    def get_or_create_session(self, data):
        # Add periodic cleanup check
        if (datetime.now() - self.last_cleanup).seconds > 3600:
            self.cleanup_old_sessions()
            self.last_cleanup = datetime.now()
        # Get existing chat session or create new one
        session_id = data['session_id']
        if session_id not in self.chat_history:
            self.chat_history[session_id] = {
                'messages': [],
                'chat_instance': self.model.start_chat(history=[])
            }
        return self.chat_history[session_id]

    def generate_response(self, session, data):
        """Generate AI response using chat context."""
        self.metrics['total_requests'] += 1
        try:
            if not session or not isinstance(session, dict):
                error_msg = "Invalid session object"
                self.metrics['errors'][error_msg] += 1
                raise ValueError(error_msg)
                
            # Get chat history
            history = session.get('messages', [])[-5:]
            history_text = chr(10).join([
                f"{msg['role']}: {msg['content']}" 
                for msg in history
            ]) if history else "No previous messages"
                
            # Enhanced context with formatting guidelines
            context = f"""
Current Time: {data['timestamp']}
Current User: {data['username']}
Chat History:
{history_text}

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

            # Get response and validate
            response = session['chat_instance'].send_message(context, stream=False)
            validate_model_response(response)
            
            # Update history
            session['messages'].extend([
                {"role": "user", "content": data['message']},
                {"role": "assistant", "content": response.text}
            ])
            
            # Update metrics
            self.metrics['successful_responses'] += 1
            return response
            
        except Exception as e:
            self.metrics['errors'][str(e)] += 1
            raise

    def format_chat_response(self, response, data):
        """Format the chat response with metadata."""
        try:
            formatted_text = response.text.strip()
            # Remove metrics increment from here
            return jsonify({
                "response": formatted_text,
                "timestamp": data['timestamp'],
                "status": "success",
                "sessionId": data['session_id']
            })
        except Exception as e:
            self.metrics['errors'][str(e)] += 1
            raise