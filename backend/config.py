import os
from typing import Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai
import logging

# Add logging configuration
logger = logging.getLogger(__name__)

# Add default configurations
DEFAULT_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 2048,
    "model_name": "models/gemini-2.0-flash"
}

# Add model configurations
MODEL_CONFIG = {
    "model_name": "models/gemini-2.0-flash",
    "generation_config": {
        "temperature": 0.7,
        "top_p": 0.8,
        "top_k": 40,
        "max_output_tokens": 4096,  # Increased from 2048 to 4096
        "candidate_count": 1,
        "stop_sequences": []
    },
    "safety_settings": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
    ]
}

def get_env_or_default(key: str, default: Any) -> Any:
    """Get environment variable with fallback to default."""
    return os.getenv(key) or default

def setup_config():
    """Set up environment variables and initialize the Gemini model."""
    try:
        # Load environment variables
        load_dotenv()
        API_KEY = os.getenv('GEMINI_API_KEY')
        if not API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        # Configure Gemini
        genai.configure(api_key=API_KEY)
        
        # Initialize model with configurations
        model = genai.GenerativeModel(
            model_name=MODEL_CONFIG["model_name"],
            generation_config=MODEL_CONFIG["generation_config"],
            safety_settings=MODEL_CONFIG["safety_settings"]
        )
        
        logger.info(f"✨ Initialized {MODEL_CONFIG['model_name']} successfully")
        return model
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Gemini model: {str(e)}")
        raise