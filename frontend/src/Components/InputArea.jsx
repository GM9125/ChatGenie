import { useRef } from "react";
import PropTypes from "prop-types";
import { RiSendPlaneFill } from "react-icons/ri";

// Handles message input and submission with auto-resizing textarea
const InputArea = ({
  input,         // Current input value
  isLoading,     // Loading state for API requests
  onInputChange, // Input change handler
  onKeyDown,     // Keyboard event handler
  onSubmit,      // Form submission handler
}) => {
  const textareaRef = useRef(null);

  // Handle input changes and auto-resize textarea
  const handleInputChange = (e) => {
    onInputChange(e);
    // Queue resize after React updates
    queueMicrotask(() => {
      if (textareaRef.current) {
        // Reset height to recalculate
        textareaRef.current.style.height = "auto";
        // Limit height between min and max values
        const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
        if (textareaRef.current.style.height !== `${newHeight}px`) {
          textareaRef.current.style.height = `${newHeight}px`;
        }
      }
    });
  };

  return (
    <div className="input-area">
      <form onSubmit={onSubmit} className="input-form">
        {/* Auto-resizing textarea for message input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder="Message ChatGenie"
          className="message-input"
          disabled={isLoading}
          rows="1"
          style={{ height: "auto", minHeight: "56px" }}
        />
        {/* Submit button with loading state */}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <RiSendPlaneFill className="send-icon" />
        </button>
      </form>
    </div>
  );
};

// Prop validation
InputArea.propTypes = {
  input: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default InputArea;