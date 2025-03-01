import PropTypes from "prop-types";
import { RiChat1Line, RiDeleteBin6Line } from "react-icons/ri";
import UserInfo from "../components/UserInfo";

// Sidebar component handles chat history and user information display
const Sidebar = ({
  chats,           // Array of chat conversations
  currentChatId,   // ID of the active chat
  isSidebarOpen,   // Controls sidebar visibility
  onNewChat,       // Handler for creating new chat
  onDeleteChat,    // Handler for deleting chat
  onSelectChat,    // Handler for selecting chat
  username,        // Current user's name
  currentDateTime, // Current date and time
}) => (
  <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
    {/* Header with title and new chat button */}
    <div className="sidebar-header">
      <h3>Chat History</h3>
      <button onClick={onNewChat} className="new-chat-button" title="New Chat">
        <RiChat1Line />
      </button>
    </div>

    {/* Main content area with user info and chat list */}
    <div className="sidebar-content">
      <UserInfo username={username} currentDateTime={currentDateTime} />
      
      {/* List of chat conversations */}
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`sidebar-chat-item ${chat.id === currentChatId ? "active" : ""}`}
          onClick={() => onSelectChat(chat.id)}
        >
          <span className="chat-title">{chat.title}</span>
          {/* Show delete button only if more than one chat exists */}
          {chats.length > 1 && (
            <button
              className="delete-chat-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              title="Delete Chat"
            >
              <RiDeleteBin6Line />
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

// PropTypes validation for component props
Sidebar.propTypes = {
  chats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      messages: PropTypes.array.isRequired,
    })
  ).isRequired,
  currentChatId: PropTypes.string.isRequired,
  isSidebarOpen: PropTypes.bool.isRequired,
  onNewChat: PropTypes.func.isRequired,
  onDeleteChat: PropTypes.func.isRequired,
  onSelectChat: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
  currentDateTime: PropTypes.string.isRequired,
};

export default Sidebar;