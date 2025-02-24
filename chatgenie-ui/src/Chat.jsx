import { useState, useRef, useEffect, useCallback } from 'react';
import { throttle } from 'lodash';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { 
  RiDeleteBin6Line, 
  RiChat1Line, 
  RiSendPlaneFill, 
  RiHistoryLine, 
  RiArrowRightSLine,
  RiTimeLine,
  RiUser3Line,
  RiFileCopyLine,
  RiRefreshLine,
  RiThumbUpLine,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbDownFill
} from 'react-icons/ri';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
  dracula,
  vscDarkPlus
} from 'react-syntax-highlighter/dist/esm/styles/prism';


const formatDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const TYPING_TIMEOUT = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Add formatMessageTime utility function
const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Utility functions for code handling
const cleanCodeContent = (content) => {
  if (Array.isArray(content)) {
    return content
      .map(child => {
        if (typeof child === 'string') return child;
        if (child?.props?.children) return cleanCodeContent(child.props.children);
        return '';
      })
      .join('')
      .replace(/^\n+|\n+$/g, '') // Remove leading/trailing newlines
      .replace(/\n\s*\n/g, '\n') // Remove multiple blank lines
      .replace(/^\d+[:.]\s*/gm, '') // Remove line numbers with dots or colons
      .replace(/^(```\w*\s*\n|\n```)/g, '') // Remove markdown code block syntax
      .trim();
  }
  return String(content)
    .replace(/^\n+|\n+$/g, '')
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\d+[:.]\s*/gm, '')
    .replace(/^(```\w*\s*\n|\n```)/g, '')
    .trim();
};

const getLanguageName = (className) => {
  if (!className) return '';
  const match = className.match(/language-(\w+)/);
  if (!match) return '';
  
  const languageMap = {
    'cpp': 'cpp',
    'c++': 'cpp',
    'js': 'javascript',
    'javascript': 'javascript',
    'py': 'python',
    'python': 'python',
    'ts': 'typescript',
    'typescript': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'html': 'html',
    'css': 'css',
    'java': 'java',
    'cs': 'csharp',
    'csharp': 'csharp',
    'rb': 'ruby',
    'ruby': 'ruby',
    'go': 'go',
    'golang': 'go',
    'rs': 'rust',
    'rust': 'rust',
    'php': 'php',
    'sh': 'bash',
    'bash': 'bash',
    'shell': 'bash',
    'sql': 'sql',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'markdown': 'markdown'
  };
  
  const lang = match[1].toLowerCase();
  return languageMap[lang] || lang;
};

const formatLanguageName = (lang) => {
  if (!lang) return 'plaintext';
  
  const languageNames = {
    'js': 'JavaScript',
    'jsx': 'React/JSX',
    'ts': 'TypeScript',
    'tsx': 'React/TSX',
    'py': 'Python',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sql': 'SQL',
    'bash': 'Bash',
    'shell': 'Shell',
    'powershell': 'PowerShell',
    'ps1': 'PowerShell',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'rb': 'Ruby',
    'php': 'PHP',
    'kt': 'Kotlin',
    'swift': 'Swift',
    'dart': 'Dart',
    'json': 'JSON',
    'yaml': 'YAML',
    'xml': 'XML',
    'markdown': 'Markdown',
    'md': 'Markdown',
    'dockerfile': 'Dockerfile',
    'plaintext': 'Plain Text'
  };

  const normalizedLang = lang.toLowerCase();
  return languageNames[normalizedLang] || lang.charAt(0).toUpperCase() + lang.slice(1);
};


// Animated Icon Component
const AnimatedIcon = () => (
  <div className="animated-icon-wrapper">
    <div className="animated-icon-3d">
      <div className="sparkle-star">✨</div>
      <div className="glow-effect"></div>
    </div>
  </div>
);

const CopyButton = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const cleanText = cleanCodeContent(text);
      await navigator.clipboard.writeText(cleanText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`code-copy-button ${isCopied ? 'copied' : ''}`}
      title={isCopied ? "Copied!" : "Copy to clipboard"}
      aria-label={isCopied ? "Copied" : "Copy code"}
    >
      {isCopied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <RiFileCopyLine />
      )}
    </button>
  );
};

const UserInfo = ({ username, currentDateTime }) => {
  // Add local state to sync with updates
  const [localDateTime, setLocalDateTime] = useState(currentDateTime);

  useEffect(() => {
    setLocalDateTime(currentDateTime);
  }, [currentDateTime]);

  return (
    <div className="user-info">
      <div className="user-detail">
        <RiUser3Line />
        <span>{username}</span>
      </div>
      <div className="datetime-detail">
        <RiTimeLine />
        <span className="datetime">
          {localDateTime}
        </span>
      </div>
    </div>
  );
};

const MessageBubble = ({ message, onRegenerateResponse }) => {
  const [isCodeLoaded, setIsCodeLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setIsCodeLoaded(true);
  }, []);

  const handleMessageClick = (e) => {
    if (e.target.closest('.code-copy-button') || e.target.closest('.message-actions')) return;
    e.stopPropagation();
  };

  const handleCopyResponse = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    setIsLiked(false);
  };

  return (
    <div 
      className="message-container" 
      onClick={handleMessageClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}>
        <div className="message-text">
          {message.isUser ? (
            <span className="selectable">{message.text}</span>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                  code: ({inline, className, children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    
                    if (inline) {
                      return (
                        <code className="md-inline-code selectable" {...filteredProps}>
                          {cleanCodeContent(children)}
                        </code>
                      );
                    }
                    
                    const languageId = getLanguageName(className);
                    const displayLanguage = formatLanguageName(languageId);
                    const codeContent = cleanCodeContent(children);

                    return (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span className="code-language unselectable">
                            {displayLanguage}
                          </span>
                          <CopyButton text={codeContent} />
                        </div>
                        <div className="code-block-content">
                          <SyntaxHighlighter
                            language={languageId || "text"}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: "1em",
                              background: "transparent",
                              fontSize: "var(--code-font-size)",
                              fontFamily: "'Fira Code', monospace",
                              lineHeight: "var(--code-line-height)",
                              minWidth: "100%",
                              boxSizing: "border-box",
                            }}
                            wrapLongLines={true}
                            showLineNumbers={false}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    );
                  },
                  p: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <p className="md-p selectable" {...filteredProps}>{children}</p>
                    );
                  },
                  h1: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <h1 className="md-h1 selectable" {...filteredProps}>{children}</h1>
                    );
                  },
                  h2: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <h2 className="md-h2 selectable" {...filteredProps}>{children}</h2>
                    );
                  },
                  h3: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <h3 className="md-h3 selectable" {...filteredProps}>{children}</h3>
                    );
                  },
                  ul: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.ordered;
                    delete filteredProps.node;
                    return (
                      <ul className="md-ul selectable" {...filteredProps}>
                        {children}
                      </ul>
                    );
                  },
                  ol: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.ordered;
                    delete filteredProps.node;
                    return (
                      <ol className="md-ol selectable" {...filteredProps}>
                        {children}
                      </ol>
                    );
                  },
                  li: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.ordered;
                    delete filteredProps.node;
                    return (
                      <li className="md-li selectable" {...filteredProps}>
                        {children}
                      </li>
                    );
                  },
                  blockquote: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <blockquote className="md-blockquote selectable" {...filteredProps}>
                        {children}
                      </blockquote>
                    );
                  },
                  table: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <div className="table-container selectable">
                        <table className="md-table" {...filteredProps}>{children}</table>
                      </div>
                    );
                  },
                  th: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <th className="md-th selectable" {...filteredProps}>{children}</th>
                    );
                  },
                  td: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <td className="md-td selectable" {...filteredProps}>{children}</td>
                    );
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
                  },
                  em: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <em className="md-em selectable" {...filteredProps}>{children}</em>
                    );
                  },
                  strong: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <strong className="md-strong selectable" {...filteredProps}>
                        {children}
                      </strong>
                    );
                  },
                  del: ({children, ...props}) => {
                    const filteredProps = {...props};
                    delete filteredProps.node;
                    return (
                      <del className="md-del selectable" {...filteredProps}>{children}</del>
                    );
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
              
              {!message.isUser && (
                <div className="message-actions">
                  <div className="action-group">
                    <button
                      className={`action-button ${isLiked ? 'active' : ''}`}
                      onClick={handleLike}
                      title="Like response"
                    >
                      {isLiked ? <RiThumbUpFill /> : <RiThumbUpLine />}
                    </button>
                    <button
                      className={`action-button ${isDisliked ? 'active' : ''}`}
                      onClick={handleDislike}
                      title="Dislike response"
                    >
                      {isDisliked ? <RiThumbDownFill /> : <RiThumbDownLine />}
                    </button>
                  </div>

                  <div className="action-separator" />
                  
                  <div className="action-group">
                    <button
                      className="action-button"
                      onClick={() => onRegenerateResponse(message.id)}
                      title="Regenerate response"
                    >
                      <RiRefreshLine />
                    </button>
                    <button
                      className={`action-button ${isCopied ? 'copied' : ''}`}
                      onClick={handleCopyResponse}
                      title={isCopied ? "Copied!" : "Copy response"}
                    >
                      <RiFileCopyLine />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Chat() {
  // Load chats and current chat ID from localStorage
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chats');
    return saved ? JSON.parse(saved) : [{ 
      id: 'default',
      title: 'ChatGenie',
      messages: []
    }];
  });
  
  // Initialize currentChatId with persisted value
  const [currentChatId, setCurrentChatId] = useState(() => {
    const savedCurrentChatId = localStorage.getItem('currentChatId');
    if (savedCurrentChatId && chats.some(chat => chat.id === savedCurrentChatId)) {
      return savedCurrentChatId;
    }
    return chats[chats.length - 1].id;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(formatDateTime());
  const [username] = useState('GM9125');
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const currentChat = chats.find(chat => chat.id === currentChatId) || chats[0];

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Save currentChatId to localStorage
  useEffect(() => {
    localStorage.setItem('currentChatId', currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime());
    }, 1000);
  
    // Cleanup on unmount
    return () => clearInterval(timer);
  }, []);

  const generateChatTitle = (messages) => {
    if (messages.length === 0) return 'ChatGenie';
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
    localStorage.setItem('currentChatId', newChat.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteChat = (chatId) => {
    if (chats.length === 1) {
      handleNewChat();
    } else {
      setChats(prev => {
        const filteredChats = prev.filter(chat => chat.id !== chatId);
        if (currentChatId === chatId) {
          const currentIndex = prev.findIndex(chat => chat.id === chatId);
          const nextChatId = filteredChats[Math.max(0, currentIndex - 1)].id;
          setCurrentChatId(nextChatId);
          localStorage.setItem('currentChatId', nextChatId);
        }
        return filteredChats;
      });
    }
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    localStorage.setItem('currentChatId', chatId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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
      timestamp: formatDateTime(),
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
  
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage,
          timestamp: formatDateTime(),
          username: username
        }),
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${response.statusText}`);
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
          timestamp: formatDateTime(),
        };
  
        setChats(prev => prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, botMessage] }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Failed to send message: ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out';
      } else if (error.message.includes('NetworkError')) {
        errorMessage += 'Network connection error';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      
      const errorBotMessage = {
        id: Date.now(),
        text: `⚠️ ${errorMessage}`,
        isUser: false,
        isError: true,
        timestamp: formatDateTime(),
      };
  
      setChats(prev => prev.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, errorBotMessage] }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };
  const handleRegenerateResponse = async (messageId) => {
    // Find the original user message that generated this response
    const currentMessages = currentChat.messages;
    const botMessageIndex = currentMessages.findIndex(m => m.id === messageId);
    if (botMessageIndex === -1 || currentMessages[botMessageIndex].isUser) return;
  
    // Find the last user message before this bot message
    let userMessageIndex = botMessageIndex - 1;
    while (userMessageIndex >= 0 && !currentMessages[userMessageIndex].isUser) {
      userMessageIndex--;
    }
  
    if (userMessageIndex < 0) return;
    const userMessage = currentMessages[userMessageIndex];
  
    setIsLoading(true);
    setError(null);
  
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
  
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage.text, // Send the original user message
          timestamp: formatDateTime(),
          username: username,
          regenerate: true
        }),
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.error);
      }
  
      if (data.response) {
        const regeneratedMessage = {
          id: Date.now(),
          text: data.response.trim(),
          isUser: false,
          timestamp: formatDateTime(),
        };
  
        setChats(prev => prev.map(chat =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === messageId ? regeneratedMessage : msg
                )
              }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Failed to regenerate response: ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out';
      } else if (error.message.includes('NetworkError')) {
        errorMessage += 'Network connection error';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="main-container">
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="Toggle Chat History"
      >
        <RiArrowRightSLine className={isSidebarOpen ? "rotate-180" : ""} />
      </button>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button
            onClick={handleNewChat}
            className="new-chat-button"
            title="New Chat"
          >
            <RiChat1Line />
          </button>
        </div>
        <div className="sidebar-content">
          <UserInfo username={username} currentDateTime={currentDateTime} />
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-chat-item ${
                chat.id === currentChatId ? "active" : ""
              }`}
              onClick={() => handleSelectChat(chat.id)}
            >
              <span className="chat-title">{chat.title}</span>
              {chats.length > 1 && (
                <button
                  className="delete-chat-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
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

      <div className="chat-container">
        <div className="chat-header">
          <div className="header-actions">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="header-button mobile-only"
              title="Chat History"
            >
              <RiHistoryLine />
            </button>
          </div>
          <div className="header-title">
            <AnimatedIcon />
            <span>ChatGenie</span>
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
              className={`message-row ${message.isUser ? "user" : "bot"}`}
            >
              <div className="message-content">
                <MessageBubble
                  message={message}
                  onRegenerateResponse={handleRegenerateResponse}
                />
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

        {error && <div className="error-alert">{error}</div>}

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