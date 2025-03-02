import PropTypes from "prop-types";
import { RiHistoryLine } from "react-icons/ri";
import AnimatedIcon from "./AnimatedIcon";
import '../Styles/ChatHeader.css';

/**
 * ChatHeader component displays the app title and mobile menu button
 * Appears at the top of the chat interface
 */
const ChatHeader = ({ onToggleSidebar }) => (
  <div className="chat-header">
    {/* Mobile-only history toggle button */}
    <div className="header-actions">
      <button
        onClick={onToggleSidebar}
        className="header-button mobile-only"
        title="Chat History"
      >
        <RiHistoryLine />
      </button>
    </div>
    {/* App title with animated icon */}
    <div className="header-title">
      <AnimatedIcon />
      <span>ChatGenie</span>
    </div>
  </div>
);

// Prop validation
ChatHeader.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
};

export default ChatHeader;
