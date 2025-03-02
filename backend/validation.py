# Update validation constants
MIN_RESPONSE_LENGTH = 10
MAX_RESPONSE_LENGTH = 8192  # Increased from 4096 to 8192
ALLOWED_ROLES = {'user', 'assistant', 'system'}

# Validate model responses for quality and completeness
def validate_model_response(response):
    # Check for empty response object
    if not response:
        raise ValueError("Empty response from model")
    
    # Check for empty response text
    if not response.text:
        raise ValueError("Empty text in model response")
    
    # Check for content quality
    text = response.text.strip()
    if len(text) < MIN_RESPONSE_LENGTH:
        raise ValueError("Response too short")
    
    # Add length validation
    if len(text) > MAX_RESPONSE_LENGTH:
        raise ValueError("Response exceeds maximum length")
    
    # Check for error indicators
    error_phrases = ["error occurred", "unable to process", "failed to"]
    if any(phrase in text.lower() for phrase in error_phrases):
        raise ValueError("Error detected in model response")
    
    # Check for response completeness
    if text.endswith(("...", "…")):
        raise ValueError("Incomplete response detected")
    
    # Check for inappropriate content
    bad_words = ["profanity", "offensive", "inappropriate"]  # Add more as needed
    if any(word in text.lower() for word in bad_words):
        raise ValueError("Inappropriate content detected")
    
    # Add content structure validation
    if not any(char in text for char in '.!?'):
        raise ValueError("Response lacks proper punctuation")
    
    return True

def validate_chat_history(history):
    # Check for valid chat history format
    if not isinstance(history, list):
        raise ValueError("Chat history must be a list")
    
    # Validate each message in history
    for msg in history:
        if not isinstance(msg, dict):
            raise ValueError("Invalid message format in history")
        
        # Check required message fields
        required_fields = ['role', 'content']
        if not all(field in msg for field in required_fields):
            raise ValueError("Missing required fields in message")
        
        # Validate message role
        if msg['role'] not in ALLOWED_ROLES:
            raise ValueError("Invalid message role")
    
    return True

def validate_request_data(data):
    # Validate request payload
    required_fields = ['message']
    optional_fields = ['timestamp', 'username', 'sessionId']
    
    if not isinstance(data, dict):
        raise ValueError("Invalid request format")
        
    # Check required fields
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")