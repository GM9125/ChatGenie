import { useState, useRef, useEffect, useCallback } from 'react';
import { throttle } from 'lodash';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { RiDeleteBin6Line, RiChat1Line, RiSendPlaneFill, RiHistoryLine } from 'react-icons/ri';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const TYPING_TIMEOUT = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Popup Component
const Popup = ({ children, onClose, title }) => (
  <div className="popup-overlay" onClick={onClose}>
    <div className="popup-content" onClick={e => e.stopPropagation()}>
      <div className="popup-header">
        <h3>{title}</h3>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// Chat History Component
const ChatHistory = ({ chats, onSelectChat, onDeleteChat }) => (
  <div className="chat-history-popup">
    <div className="chat-history-list">
      {chats.map(chat => (
        <div key={chat.id} className="chat-history-item">
          <span onClick={() => onSelectChat(chat.id)}>{chat.title}</span>
          <button 
            className="delete-chat-button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChat(chat.id);
            }}
          >
            <RiDeleteBin6Line />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// Animated Icon Component
const AnimatedIcon = () => (
  <div className="animated-icon-wrapper">
    <div className="animated-icon-3d">
      <div className="sparkle-star">✨</div>
      <div className="glow-effect"></div>
    </div>
  </div>
);

// Message Bubble Component
const MessageBubble = ({ message }) => {
  const [isCodeLoaded, setIsCodeLoaded] = useState(false);

  useEffect(() => {
    setIsCodeLoaded(true);
  }, []);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="message-container">
      <div className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}>
        <div className="message-header">
          <span className="message-icon">
            {message.isUser ? '👤' : '🤖'}
          </span>
          <span className="message-time">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
        <div className="message-text">
          {message.isUser ? (
            message.text
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={{
                h1: ({children, ...props}) => <h1 className="md-h1" {...props}>{children}</h1>,
                h2: ({children, ...props}) => <h2 className="md-h2" {...props}>{children}</h2>,
                h3: ({children, ...props}) => <h3 className="md-h3" {...props}>{children}</h3>,
                p: ({children, ...props}) => <p className="md-p" {...props}>{children}</p>,
                ul: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.ordered;
                  return <ul className="md-ul" {...filteredProps}>{children}</ul>;
                },
                ol: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.ordered;
                  return <ol className="md-ol" {...filteredProps}>{children}</ol>;
                },
                li: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.ordered;
                  return <li className="md-li" {...filteredProps}>{children}</li>;
                },
                code: ({inline, className, children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return inline ? (
                    <code className="md-inline-code" {...filteredProps}>
                      {children}
                    </code>
                  ) : (
                    <code 
                      className={`md-code-block ${isCodeLoaded ? 'loaded' : ''} ${className || ''}`}
                      {...filteredProps}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <pre className="md-pre pre-highlight" {...filteredProps}>{children}</pre>;
                },
                blockquote: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <blockquote className="md-blockquote" {...filteredProps}>{children}</blockquote>;
                },
                table: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return (
                    <div className="table-container">
                      <table className="md-table" {...filteredProps}>
                        {children}
                      </table>
                    </div>
                  );
                },
                th: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <th className="md-th" {...filteredProps}>{children}</th>;
                },
                td: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <td className="md-td" {...filteredProps}>{children}</td>;
                },
                input: ({...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return (
                    <input
                      {...filteredProps}
                      disabled
                      style={{ marginRight: '0.5em' }}
                    />
                  );
                },
                del: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <del className="md-del" {...filteredProps}>{children}</del>;
                },
                em: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <em className="md-em" {...filteredProps}>{children}</em>;
                },
                strong: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return <strong className="md-strong" {...filteredProps}>{children}</strong>;
                },
                a: ({children, ...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return (
                    <a
                      className="md-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...filteredProps}
                    >
                      {children}
                    </a>
                  );
                },
                img: ({...props}) => {
                  const filteredProps = {...props};
                  delete filteredProps.node;
                  return (
                    <img
                      className="md-img"
                      alt={props.alt || ''}
                      loading="lazy"
                      {...filteredProps}
                    />
                  );
                }
              }}
            >
              {message.text}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Chat() {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chats');
    return saved ? JSON.parse(saved) : [{ 
      id: 'default',
      title: 'New Chat',
      messages: []
    }];
  });
  
  const [currentChatId, setCurrentChatId] = useState('default');
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const currentChat = chats.find(chat => chat.id === currentChatId) || chats[0];

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  const generateChatTitle = (messages) => {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find(m => m.isUser)?.text || '';
    return firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
  };

  const handleScroll = useCallback(
    throttle(() => {
      if (!messagesAreaRef.current) return;
      const { scrollHeight, scrollTop, clientHeight } = messagesAreaRef.current;
      const bottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      setIsAtBottom(bottom);
    }, 100),
    []
  );

  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (messagesArea) {
      messagesArea.addEventListener('scroll', handleScroll);
      return () => messagesArea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const scrollToBottom = useCallback(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isAtBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat.messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChat.id);
    setInput('');
    setShowChatHistory(false);
  };

  const handleDeleteChat = (chatId) => {
    if (chats.length === 1) {
      handleNewChat();
    } else {
      setChats(prev => {
        const filteredChats = prev.filter(chat => chat.id !== chatId);
        if (currentChatId === chatId) {
          setCurrentChatId(filteredChats[0].id);
        }
        return filteredChats;
      });
    }
    setShowDeletePopup(false);
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    setShowChatHistory(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const newMessage = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setChats(prev => prev.map(chat => 
      chat.id === currentChatId
        ? {
            ...chat,
            messages: [...chat.messages, newMessage],
            title: chat.messages.length === 0 ? generateChatTitle([newMessage]) : chat.title
          }
        : chat
    ));

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.error);
      }

      if (data.response) {
        const botMessage = {
          id: Date.now(),
          text: data.response.trim(),
          isUser: false,
          timestamp: new Date().toISOString()
        };

        setChats(prev => prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, botMessage] }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-actions">
            <div className="chat-history-wrapper">
              <button
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="header-button"
                title="Chat History"
              >
                <RiHistoryLine />
              </button>
              {showChatHistory && (
                <ChatHistory
                  chats={chats}
                  onSelectChat={handleSelectChat}
                  onDeleteChat={handleDeleteChat}
                />
              )}
            </div>
            <button
              onClick={handleNewChat}
              className="header-button"
              title="New Chat"
            >
              <RiChat1Line />
            </button>
          </div>
          <div className="header-title">
            <AnimatedIcon />
            <span>{currentChat.title}</span>
          </div>
        </div>

        <div ref={messagesAreaRef} className="messages-area">
          {currentChat.messages.length === 0 && (
            <div className="welcome-message">
              <span className="welcome-icon">✨</span>
              <h2 className="welcome-title">Welcome to ChatGenie</h2>
              <p>How can I assist you today?</p>
            </div>
          )}

          {currentChat.messages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${message.isUser ? 'user' : 'bot'}`}
            >
              <div className="message-content">
                <MessageBubble message={message} />
              </div>
            </div>
          ))}

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

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGenie"
              className="message-input"
              disabled={isLoading}
              rows="1"
            />
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
      </div>
    </div>
  );
}