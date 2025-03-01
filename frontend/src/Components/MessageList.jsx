import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import MessageBubble from "./MessageBubble";

// Displays the list of messages and handles auto-scrolling
const MessageList = ({
  messages,              // Array of chat messages
  isLoading,            // Loading state for new messages
  onRegenerateResponse, // Handler for regenerating bot responses
  scrollToBottom,       // Function to scroll to latest message
}) => {
  // Refs for scroll management
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div ref={messagesAreaRef} className="messages-area">
      {/* Welcome message when no messages exist */}
      {messages.length === 0 && (
        <div className="welcome-message">
          <h2 className="welcome-title">Welcome to ChatGenie</h2>
          <p>How can I help you today?</p>
        </div>
      )}

      {/* Render message bubbles */}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-row ${message.isUser ? "user" : "bot"}`}
        >
          <div className="message-content">
            <MessageBubble
              message={message}
              onRegenerateResponse={onRegenerateResponse}
            />
          </div>
        </div>
      ))}

      {/* Loading indicator for new messages */}
      {isLoading && (
        <div className="message-row bot">
          <div className="message-content">
            <div className="typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      )}

      {/* Invisible element for scroll targeting */}
      <div ref={messagesEndRef} />
    </div>
  );
};

// Prop validation with detailed message shape
MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      text: PropTypes.string.isRequired,
      isUser: PropTypes.bool.isRequired,
      timestamp: PropTypes.string.isRequired,
    })
  ).isRequired,
  isLoading: PropTypes.bool.isRequired,
  onRegenerateResponse: PropTypes.func.isRequired,
  scrollToBottom: PropTypes.func.isRequired,
};

export default MessageList;