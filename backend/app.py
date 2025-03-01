from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from config import setup_config
from chat import ChatService
from errors import handle_chat_error, handle_error
import logging
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from limits.storage.memory import MemoryStorage 

# Add version and description
__version__ = "1.0.0"
__description__ = "ChatGenie Backend Server using Flask and Gemini AI"

# Initialize Flask app with CORS support for frontend
app = Flask(__name__)
app.config['CORS_ORIGINS'] = ['http://localhost:5173']  # Add before CORS setup
CORS(app, resources={
    r"/chat": {
        "origins": ["http://localhost:5173"],  # Allow requests from Vite dev server
        "methods": ["POST", "OPTIONS"],        # Allow POST and preflight requests
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"]
    }
})

# Update rate limiting configuration for development
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # Use memory storage for development
    strategy="fixed-window"
)

# Add logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('chatgenie.log', encoding='utf-8'),  # Add encoding
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Add config validation
def validate_cors_config():
    if not isinstance(app.config.get('CORS_ORIGINS'), list):
        raise ValueError("CORS_ORIGINS must be a list")
    return True

# Add startup checks
def run_startup_checks():
    validate_cors_config()
    # Add other checks as needed
    return True

# Set up AI model and chat service
try:
    model = setup_config()
    chat_service = ChatService(model)
    logger.info("Successfully initialized Gemini 2.0 Flash model")
except Exception as e:
    logger.error(f"Error initializing Gemini: {str(e)}")
    raise

# Main chat endpoint that handles message processing
@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat_endpoint():
    try:
        # Process incoming chat request
        data = chat_service.validate_request(request)
        session = chat_service.get_or_create_session(data)
        response = chat_service.generate_response(session, data)
        return chat_service.format_chat_response(response, data)
    except Exception as e:
        return handle_chat_error(e)

# Add health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "version": __version__,
        "timestamp": datetime.now().isoformat()
    })

# Add after your other routes but before the __main__ block
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "name": "ChatGenie API",
        "version": __version__,
        "description": __description__,
        "endpoints": {
            "chat": "/chat",
            "health": "/health"
        }
    })

# Global error handler for all unhandled exceptions
@app.errorhandler(Exception)
def error_handler(error):
    return handle_error(error)

# Update the server start section
if __name__ == '__main__':
    try:
        run_startup_checks()
        # Display friendly startup messages with plain text
        logger.info("Starting ChatGenie server (Development Mode)...")
        logger.info(f"Server time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("Debug mode: enabled")
        logger.info("Server port: 5000")
        logger.info("CORS enabled for: http://localhost:5173")
        
        # Development server configuration
        app.run(
            host='0.0.0.0', 
            port=5000, 
            debug=True,
            use_reloader=True
        )
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        exit(1)