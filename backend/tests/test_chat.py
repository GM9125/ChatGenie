import pytest
from datetime import datetime, timedelta
from flask import Flask, Request
from chat import ChatService, SESSION_TIMEOUT
from validation import validate_model_response
from collections import Counter

# Mock Gemini model for testing
class MockGeminiModel:
    def start_chat(self, history):
        return MockChatInstance()
        
    def generate_content(self, text):
        return MockResponse(text="Test response with proper punctuation.")

class MockChatInstance:
    def send_message(self, text, stream=False):
        return MockResponse(text="Test response with proper punctuation.")

class MockResponse:
    def __init__(self, text):
        self.text = text

class MockRequest:
    def __init__(self, json_data):
        self.json = json_data

# Flask app fixture for testing
@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app

# Fixture for ChatService instance with app context
@pytest.fixture
def chat_service(app):
    model = MockGeminiModel()
    return ChatService(model)

def test_validate_request_success(chat_service):
    request = MockRequest({
        "message": "Hello",
        "username": "TestUser",
        "timestamp": "2025-03-01 12:00:00",
        "sessionId": "test-123"
    })
    data = chat_service.validate_request(request)
    assert data["message"] == "Hello"
    assert data["username"] == "TestUser"
    assert "timestamp" in data
    assert "session_id" in data

def test_validate_request_empty(chat_service):
    with pytest.raises(ValueError, match="No data was sent"):
        chat_service.validate_request(MockRequest(None))

def test_validate_request_no_message(chat_service):
    with pytest.raises(ValueError, match="include a message"):
        chat_service.validate_request(MockRequest({"username": "TestUser"}))

def test_validate_request_null(chat_service):
    """Test validation with null request"""
    with pytest.raises(ValueError, match="No request object provided"):
        chat_service.validate_request(None)

def test_validate_request_invalid_format(chat_service):
    """Test validation with invalid request format"""
    class InvalidRequest:
        pass
    
    with pytest.raises(ValueError, match="Invalid request format"):
        chat_service.validate_request(InvalidRequest())

def test_validate_request_empty_json(chat_service):
    """Test validation with empty JSON"""
    request = MockRequest({})
    with pytest.raises(ValueError, match="🚫 Oops! No data was sent with the request"):
        chat_service.validate_request(request)

def test_validate_request_full(chat_service):
    """Test validation with all optional fields"""
    request = MockRequest({
        "message": "Hello",
        "username": "TestUser",
        "timestamp": "2025-03-01 12:00:00",
        "sessionId": "test-123",
        "regenerate": True
    })
    data = chat_service.validate_request(request)
    assert data["message"] == "Hello"
    assert data["username"] == "TestUser"
    assert data["timestamp"] == "2025-03-01 12:00:00"
    assert data["session_id"] == "test-123"
    assert data["regenerate"] is True

def test_session_management(chat_service):
    data = {
        "session_id": "test_session",
        "message": "Hello",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    session = chat_service.get_or_create_session(data)
    assert "messages" in session
    assert "chat_instance" in session
    assert isinstance(session["messages"], list)

def test_generate_response(chat_service):
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    session = chat_service.get_or_create_session(data)
    
    response = chat_service.generate_response(session, data)
    assert response.text == "Test response with proper punctuation."

def test_format_chat_response(chat_service, app):
    with app.app_context():
        data = {
            "session_id": "test_session",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        mock_response = MockResponse("Test response with proper punctuation.")
        
        response = chat_service.format_chat_response(mock_response, data)
        assert response.json["status"] == "success"
        assert response.json["response"] == "Test response with proper punctuation."
        assert response.json["sessionId"] == "test_session"

def test_session_cleanup(chat_service):
    old_session_id = "old_session"
    old_time = datetime.now() - timedelta(seconds=SESSION_TIMEOUT + 1)
    chat_service.chat_history[old_session_id] = {
        'messages': [],
        'chat_instance': None,
        'last_access': old_time
    }
    
    chat_service.last_cleanup = datetime.now() - timedelta(hours=2)
    chat_service.cleanup_old_sessions()
    
    assert old_session_id not in chat_service.chat_history

def test_session_retention(chat_service):
    active_session_id = "active_session"
    current_time = datetime.now()
    chat_service.chat_history[active_session_id] = {
        'messages': [],
        'chat_instance': None,
        'last_access': current_time
    }
    chat_service.cleanup_old_sessions()
    assert active_session_id in chat_service.chat_history

def test_metrics_tracking(chat_service, app):
    """Test metrics tracking for all operations"""
    with app.app_context():
        data = {
            "message": "Hello",
            "username": "TestUser",
            "session_id": "test_session",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        chat_service.metrics = {
            'total_requests': 0,
            'successful_responses': 0,
            'errors': Counter(),
            'cleaned_sessions': 0
        }
        
        session = chat_service.get_or_create_session(data)
        initial_requests = chat_service.metrics['total_requests']
        initial_successes = chat_service.metrics['successful_responses']
        
        response = chat_service.generate_response(session, data)
        chat_service.format_chat_response(response, data)
        
        assert chat_service.metrics['total_requests'] == initial_requests + 1
        assert chat_service.metrics['successful_responses'] == initial_successes + 1

def test_cleanup_metrics(chat_service):
    for i in range(3):
        session_id = f"old_session_{i}"
        old_time = datetime.now() - timedelta(seconds=SESSION_TIMEOUT + 1)
        chat_service.chat_history[session_id] = {
            'messages': [],
            'chat_instance': None,
            'last_access': old_time
        }
    
    initial_count = len(chat_service.chat_history)
    chat_service.cleanup_old_sessions()
    final_count = len(chat_service.chat_history)
    
    assert final_count < initial_count
    assert chat_service.metrics['cleaned_sessions'] == initial_count - final_count

def test_error_metrics(chat_service, app):
    """Test error metrics tracking"""
    with app.app_context():
        data = {
            "message": None,
            "session_id": "test_session",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        initial_error_count = len(chat_service.metrics['errors'])
        
        try:
            chat_service.validate_request(MockRequest(data))
        except ValueError:
            pass
            
        assert len(chat_service.metrics['errors']) > initial_error_count

def test_cleanup_no_expired_sessions(chat_service):
    """Test cleanup with no expired sessions"""
    session_id = "active_session"
    chat_service.chat_history[session_id] = {
        'messages': [],
        'chat_instance': None,
        'last_access': datetime.now()
    }
    
    initial_count = len(chat_service.chat_history)
    chat_service.cleanup_old_sessions()
    assert len(chat_service.chat_history) == initial_count

def test_validate_request_attribute_error(chat_service):
    """Test validation with attribute error"""
    class BrokenRequest:
        def __init__(self):
            pass
    
    with pytest.raises(ValueError, match="Invalid request format"):
        chat_service.validate_request(BrokenRequest())

def test_error_metrics_comprehensive(chat_service, app):
    """Test comprehensive error metrics tracking"""
    with app.app_context():
        initial_errors = len(chat_service.metrics['errors'])
        try:
            chat_service.validate_request(MockRequest(None))
        except ValueError:
            pass
            
        try:
            chat_service.validate_request(MockRequest({"username": "test"}))
        except ValueError:
            pass
            
        try:
            chat_service.generate_response(None, {})
        except Exception:
            pass
            
        assert len(chat_service.metrics['errors']) > initial_errors

def test_generate_response_with_history(chat_service):
    """Test response generation with chat history"""
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    
    session = chat_service.get_or_create_session(data)
    session['messages'].extend([
        {"role": "user", "content": "Previous message"},
        {"role": "assistant", "content": "Previous response"}
    ])
    
    response = chat_service.generate_response(session, data)
    assert response.text == "Test response with proper punctuation."

def test_generate_response_complete_flow(chat_service):
    """Test complete response generation flow with all features"""
    chat_service.metrics = {
        'total_requests': 0,
        'successful_responses': 0,
        'errors': Counter(),
        'cleaned_sessions': 0
    }
    
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    
    session = chat_service.get_or_create_session(data)
    
    session['messages'] = [
        {"role": "user", "content": "Previous message 1"},
        {"role": "assistant", "content": "Previous response 1"},
        {"role": "user", "content": "Previous message 2"},
        {"role": "assistant", "content": "Previous response 2"}
    ]
    
    response = chat_service.generate_response(session, data)
    
    assert response is not None
    assert response.text == "Test response with proper punctuation."
    assert len(session['messages']) == 6
    assert session['messages'][-2]['role'] == "user"
    assert session['messages'][-1]['role'] == "assistant"
    assert chat_service.metrics['successful_responses'] == 1
    assert chat_service.metrics['total_requests'] == 1

def test_generate_response_no_history(chat_service):
    """Test response generation with empty history"""
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    
    session = chat_service.get_or_create_session(data)
    session['messages'] = []
    
    response = chat_service.generate_response(session, data)
    assert response.text == "Test response with proper punctuation."
    assert len(session['messages']) == 2

def test_generate_response_invalid_session(chat_service):
    """Test response generation with invalid session"""
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    
    with pytest.raises(ValueError, match="Invalid session object"):
        chat_service.generate_response(None, data)
    
    with pytest.raises(ValueError, match="Invalid session object"):
        chat_service.generate_response({}, data)

def test_format_chat_response_error(chat_service, app):
    """Test error handling in format_chat_response"""
    with app.app_context():
        data = {
            "session_id": "test_session",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        class BrokenResponse:
            @property
            def text(self):
                raise AttributeError("Simulated error")
        
        broken_response = BrokenResponse()
        initial_error_count = len(chat_service.metrics['errors'])
        
        with pytest.raises(AttributeError):
            chat_service.format_chat_response(broken_response, data)
            
        assert len(chat_service.metrics['errors']) > initial_error_count

def test_format_chat_response_missing_data(chat_service, app):
    """Test format_chat_response with missing data"""
    with app.app_context():
        response = MockResponse("Test response.")
        data = {}
        
        initial_error_count = len(chat_service.metrics['errors'])
        
        with pytest.raises(KeyError):
            chat_service.format_chat_response(response, data)
            
        assert len(chat_service.metrics['errors']) > initial_error_count

def test_complete_chat_flow_with_errors(chat_service, app):
    """Test complete chat flow including error handling"""
    with app.app_context():
        chat_service.metrics = {
            'total_requests': 0,
            'successful_responses': 0,
            'errors': Counter(),
            'cleaned_sessions': 0
        }
        
        data = {
            "message": "Hello",
            "username": "TestUser",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "session_id": "test_session"
        }
        
        session = chat_service.get_or_create_session(data)
        
        response = chat_service.generate_response(session, data)
        formatted = chat_service.format_chat_response(response, data)
        assert formatted.json["status"] == "success"
        assert chat_service.metrics['successful_responses'] == 1
        
        try:
            chat_service.generate_response(None, {"invalid": "data"})
        except ValueError:
            pass
        
        assert len(chat_service.metrics['errors']) > 0

def test_generate_response_history_formatting(chat_service):
    """Test history formatting in generate_response"""
    data = {
        "message": "Hello",
        "username": "TestUser",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "session_id": "test_session"
    }
    
    session = chat_service.get_or_create_session(data)
    
    test_messages = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there"},
        {"role": "user", "content": "Test: special!"},
        {"role": "assistant", "content": "Response: ok!"},
        {"role": "user", "content": "This is a longer message to test formatting"},
        {"role": "assistant", "content": "This is a longer response to test the formatting properly"}
    ]
    
    for i in range(0, len(test_messages), 2):
        session['messages'] = test_messages[0:i+2]
        
        response = chat_service.generate_response(session, data)
        assert response is not None
        
        history_len = len(session['messages'])
        assert history_len >= 2
        
        for msg in session['messages']:
            assert "role" in msg
            assert "content" in msg
            assert isinstance(msg["role"], str)
            assert isinstance(msg["content"], str)
    
    session['messages'] = []
    response = chat_service.generate_response(session, data)
    assert response is not None
    assert len(session['messages']) == 2
    
    session['messages'] = test_messages[:5]
    response = chat_service.generate_response(session, data)
    assert response is not None
    assert len(session['messages']) == 7
    
    session['messages'] = test_messages
    response = chat_service.generate_response(session, data)
    assert response is not None
    history = session['messages'][-7:]
    assert len(history) == 7

# Updated test to cover line 75 in validate_request
def test_validate_request_unique_exception(chat_service):
    """Test validate_request with a unique exception to cover line 75."""
    # Create a request that raises a unique exception outside inner try block
    class CustomBrokenRequest:
        @property
        def json(self):
            raise ValueError("Unique validation error")
    
    request = CustomBrokenRequest()
    initial_error_count = len(chat_service.metrics['errors'])
    
    with pytest.raises(ValueError, match="Unique validation error"):
        chat_service.validate_request(request)
    
    assert len(chat_service.metrics['errors']) > initial_error_count
    assert "Unique validation error" in chat_service.metrics['errors']

# Updated test to cover lines 81-82 in format_chat_response
def test_format_chat_response_custom_exception(chat_service, app):
    """Test format_chat_response with a custom exception to cover lines 81-82."""
    with app.app_context():
        data = {
            "session_id": "test_session",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Use MockResponse but override text to raise a unique exception
        response = MockResponse("Test response.")
        original_text = response.text
        def raise_custom_error():
            raise ValueError("Unique formatting error")
        response.text = property(raise_custom_error)
        
        initial_error_count = len(chat_service.metrics['errors'])
        
        with pytest.raises(ValueError, match="Unique formatting error"):
            chat_service.format_chat_response(response, data)
        
        assert len(chat_service.metrics['errors']) > initial_error_count
        assert "Unique formatting error" in chat_service.metrics['errors']
        
        # Restore original text
        response.text = original_text

if __name__ == "__main__":
    pytest.main(["-v", "--cov=chat", "--cov-report=term-missing", "--cov-fail-under=100"])