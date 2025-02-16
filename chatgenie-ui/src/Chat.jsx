import { useState, useRef, useEffect, useCallback } from 'react';
import { throttle } from 'lodash';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { RiDeleteBin6Line, RiChat1Line, RiSendPlaneFill } from 'react-icons/ri';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const TYPING_TIMEOUT = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// New Animated Icon Component
const AnimatedIcon = () => (
  <div className="animated-icon-wrapper">
    <div className="animated-icon-3d">
      <div className="sparkle-star">✨</div>
      <div className="glow-effect"></div>
    </div>
  </div>
);

export default function Chat() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

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
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      if (window.confirm('Start a new chat? This will clear the current conversation.')) {
        setMessages([]);
        localStorage.removeItem('chatMessages');
      }
    }
  };

  // In the handleSubmit function, update the error handling:

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
  
    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    setMessages(prev => [...prev, { 
      id: Date.now(),
      text: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    }]);
  
    setIsLoading(true);
  
    let retries = MAX_RETRIES;
    while (retries > 0) {
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
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: data.response.trim(),
            isUser: false,
            timestamp: new Date().toISOString()
          }]);
          break;
        }
      } catch (error) {
        console.error(`Attempt ${MAX_RETRIES - retries + 1} failed:`, error);
        retries--;
        
        if (retries === 0) {
          setError(`Failed to send message: ${error.message}`);
        } else {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    setIsLoading(false);
  };

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
                // Updated list components
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

  return (
    <div className="main-container">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-actions">
            <button
              onClick={handleNewChat}
              className="header-button"
              title="New Chat"
            >
              <RiChat1Line />
            </button>
            <button
              onClick={handleClearChat}
              className="header-button"
              title="Clear Chat"
            >
              <RiDeleteBin6Line />
            </button>
          </div>
          <div className="header-title">
            <AnimatedIcon />
            <span>ChatGenie</span>
          </div>
        </div>

        <div 
          ref={messagesAreaRef}
          className="messages-area"
        >
          {messages.length === 0 && (
            <div className="welcome-message">
              <span className="welcome-icon">✨</span>
              <h2 className="welcome-title">Welcome to ChatGenie</h2>
              <p>How can I assist you today?</p>
            </div>
          )}

          {messages.map((message) => (
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