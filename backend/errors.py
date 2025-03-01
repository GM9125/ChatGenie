from flask import jsonify

# Add error categories
ERROR_CATEGORIES = {
    'auth': ['api key', 'unauthorized', 'authentication'],
    'rate_limit': [
        'too many requests',
        'rate exceeded',
        'try again later'
    ],
    'validation': ['invalid', 'missing', 'required'],
    'timeout': ['timeout', 'timed out'],
    'server': ['internal error', 'server error'],
}

def categorize_error(error_message: str) -> str:
    """Categorize error messages for better handling."""
    lower_message = error_message.lower()
    for category, patterns in ERROR_CATEGORIES.items():
        if any(pattern in lower_message for pattern in patterns):
            return category
    return 'unknown'

# Handle chat-specific errors with user-friendly messages
def handle_chat_error(error):
    # Log the chat error for debugging
    print(f"💬 Chat error: {str(error)}")
    error_message = str(error)
    
    # Map common errors to friendly messages
    if "quota" in error_message.lower():
        error_message = "😅 We've hit our limit for now, please try again later"
    elif "invalid" in error_message.lower():
        error_message = "🔑 There's an issue with the API key"
    elif "timeout" in error_message.lower():
        error_message = "⏳ Request took too long, please try again"
    elif "connection" in error_message.lower():
        error_message = "🔌 Having trouble connecting to the AI service"
    elif "memory" in error_message.lower():
        error_message = "💾 System is busy, please try a shorter message"
    
    # Return formatted error response with 500 status
    return jsonify({
        "error": error_message,
        "status": "error"
    }), 500

# Handle general server exceptions with generic messages
def handle_error(error):
    # Log unexpected errors for investigation
    print(f"❌ Unexpected error: {str(error)}")
    
    # Return user-friendly message with error details
    return jsonify({
        "error": "Something went wrong, but we're on it!",
        "details": str(error),
        "status": "error"
    }), 500