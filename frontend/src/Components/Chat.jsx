import { useState, useRef, useEffect, useCallback } from "react";
import { throttle } from "lodash";
import { RiArrowRightSLine } from "react-icons/ri";
import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import InputArea from "../components/InputArea";
import { formatDateTime } from "../utils/utils";
import '../Styles/Chat.css';

/*
 * Main Chat component that manages the entire chat interface
 * Handles state management, message handling, and UI interactions
 */
export default function Chat() {
  // === State Management ===

  // Chat history state with localStorage persistence
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("chats");
    return saved
      ? JSON.parse(saved)
      : [{ id: "default", title: "ChatGenie", messages: [] }];
  });

  // Active chat tracking with localStorage persistence
  const [currentChatId, setCurrentChatId] = useState(() => {
    const savedCurrentChatId = localStorage.getItem("currentChatId");
    return savedCurrentChatId &&
      chats.some((chat) => chat.id === savedCurrentChatId)
      ? savedCurrentChatId
      : chats[chats.length - 1].id;
  });

  // UI state
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(formatDateTime());
  const [username] = useState("Ghulam Mustafa");
  const [showScrollButton, setShowScrollButton] = useState(false);

  // DOM refs for scroll management
  const messagesAreaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Get current active chat data
  const currentChat =
    chats.find((chat) => chat.id === currentChatId) || chats[0];

  // === Effects ===

  // Persist chats to localStorage
  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  // Persist current chat ID
  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId);
  }, [currentChatId]);

  // Update datetime every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(formatDateTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // === Utility Functions ===

  // Generate chat title from first user message
  const generateChatTitle = (messages) => {
    if (messages.length === 0) return "ChatGenie";
    const firstUserMessage = messages.find((m) => m.isUser)?.text || "";
    return (
      firstUserMessage.slice(0, 30) +
      (firstUserMessage.length > 30 ? "..." : "")
    );
  };

  // === Scroll Management ===

  // Handle scroll position and show/hide scroll button
  const handleScroll = throttle(() => {
    if (!messagesAreaRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = messagesAreaRef.current;
    const bottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    setShowScrollButton(!bottom);
  }, 100);

  // Add scroll listener
  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (messagesArea) {
      messagesArea.addEventListener("scroll", handleScroll);
      return () => messagesArea.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Scroll to latest message
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    }
  }, []);

  // === Chat Management Functions ===

  // Create new chat conversation
  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };
    setChats((prev) => [...prev, newChat]);
    setCurrentChatId(newChat.id);
    setInput("");
    localStorage.setItem("currentChatId", newChat.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Delete chat conversation
  const handleDeleteChat = (chatId) => {
    if (chats.length === 1) {
      handleNewChat();
    } else {
      setChats((prev) => {
        const filteredChats = prev.filter((chat) => chat.id !== chatId);
        if (currentChatId === chatId) {
          const currentIndex = prev.findIndex((chat) => chat.id === chatId);
          const nextChatId = filteredChats[Math.max(0, currentIndex - 1)].id;
          setCurrentChatId(nextChatId);
          localStorage.setItem("currentChatId", nextChatId);
        }
        return filteredChats;
      });
    }
  };

  // Switch active chat
  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    localStorage.setItem("currentChatId", chatId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Update chat title
  const handleUpdateTitle = (chatId, newTitle) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, title: newTitle }
          : chat
      )
    );
  };

  // === Message Handling ===

  // Update input field
  const handleInputChange = (e) => setInput(e.target.value);

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Send message and get AI response
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Add user message to chat
    const newMessage = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
      timestamp: formatDateTime(),
    };

    // Update chat with user message
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              title:
                chat.messages.length === 0
                  ? generateChatTitle([newMessage])
                  : chat.title,
            }
          : chat
      )
    );

    // Get AI response
    setIsLoading(true);
    try {
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Make API request
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          timestamp: formatDateTime(),
          username,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Handle response
      if (!response.ok)
        throw new Error(
          `Server Error: ${response.status} ${response.statusText}`
        );
      const data = await response.json();
      if (data.status === "error") throw new Error(data.error);

      // Add AI response to chat
      if (data.response) {
        const botMessage = {
          id: Date.now(),
          text: data.response.trim(),
          isUser: false,
          timestamp: formatDateTime(),
        };
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, botMessage] }
              : chat
          )
        );
      }
    } catch (error) {
      // Handle errors and show appropriate messages
      console.error("Error:", error);
      let errorMessage = "Failed to send message: ";
      if (error.name === "AbortError") errorMessage += "Request timed out";
      else if (error.message.includes("NetworkError"))
        errorMessage += "Network connection error";
      else errorMessage += error.message;

      setError(errorMessage);
      const errorBotMessage = {
        id: Date.now(),
        text: `⚠️ ${errorMessage}`,
        isUser: false,
        isError: true,
        timestamp: formatDateTime(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, errorBotMessage] }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate AI response for a specific message
  const handleRegenerateResponse = async (messageId) => {
    const currentMessages = currentChat.messages;
    const botMessageIndex = currentMessages.findIndex(
      (m) => m.id === messageId
    );
    if (botMessageIndex === -1 || currentMessages[botMessageIndex].isUser)
      return;

    let userMessageIndex = botMessageIndex - 1;
    while (userMessageIndex >= 0 && !currentMessages[userMessageIndex].isUser)
      userMessageIndex--;
    if (userMessageIndex < 0) return;
    const userMessage = currentMessages[userMessageIndex];

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: userMessage.text,
          timestamp: formatDateTime(),
          username,
          regenerate: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok)
        throw new Error(
          `Server Error: ${response.status} ${response.statusText}`
        );
      const data = await response.json();
      if (data.status === "error") throw new Error(data.error);

      if (data.response) {
        const regeneratedMessage = {
          id: Date.now(),
          text: data.response.trim(),
          isUser: false,
          timestamp: formatDateTime(),
        };
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg) =>
                    msg.id === messageId ? regeneratedMessage : msg
                  ),
                }
              : chat
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      let errorMessage = "Failed to regenerate response: ";
      if (error.name === "AbortError") errorMessage += "Request timed out";
      else if (error.message.includes("NetworkError"))
        errorMessage += "Network connection error";
      else errorMessage += error.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // === Render Component ===
  return (
    <div className="main-container">
      {/* Sidebar toggle button */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="Toggle Chat History"
      >
        <RiArrowRightSLine className={isSidebarOpen ? "rotate-180" : ""} />
      </button>

      {/* Chat sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        isSidebarOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onSelectChat={handleSelectChat}
        onUpdateTitle={handleUpdateTitle} // Add this prop
        username={username}
        currentDateTime={currentDateTime}
      />

      {/* Main chat area */}
      <div className="chat-container">
        <ChatHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <MessageList
          messages={currentChat.messages}
          isLoading={isLoading}
          onRegenerateResponse={handleRegenerateResponse}
          scrollToBottom={scrollToBottom}
        />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            className="scroll-to-bottom-button"
            onClick={scrollToBottom}
            title="Scroll to Bottom"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v18M5 16l7 7 7-7" />
            </svg>
          </button>
        )}

        {/* Error display */}
        {error && <div className="error-alert">{error}</div>}

        {/* Message input area */}
        <InputArea
          input={input}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
