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

    try {
      const data = await fetchWithRetry('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      setMessages(prev => [...prev, {
        id: Date.now(),
        text: data.response,
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const MessageBubble = ({ message }) => {
    const [isCodeLoaded, setIsCodeLoaded] = useState(false);

    useEffect(() => {
      setIsCodeLoaded(true);
    }, []);

    return (
      <div className="message-container">
        <div className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}>
          <div className="message-header">
            <span className="message-icon">
              {message.isUser ? '👤' : '🤖'}
            </span>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
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
                  h1: ({node, ...props}) => <h1 className="md-h1" {...props} />,
                  h2: ({node, ...props}) => <h2 className="md-h2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="md-h3" {...props} />,
                  p: ({node, ...props}) => <p className="md-p" {...props} />,
                  ul: ({node, ...props}) => <ul className="md-ul" {...props} />,
                  ol: ({node, ...props}) => <ol className="md-ol" {...props} />,
                  li: ({node, ...props}) => <li className="md-li" {...props} />,
                  code: ({node, inline, className, children, ...props}) => 
                    inline ? (
                      <code className="md-inline-code" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code 
                        className={`md-code-block ${isCodeLoaded ? 'loaded' : ''} ${className || ''}`}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  pre: ({node, ...props}) => (
                    <pre className="md-pre pre-highlight" {...props} />
                  ),
                  blockquote: ({node, ...props}) => <blockquote className="md-blockquote" {...props} />,
                  table: ({node, ...props}) => <table className="md-table" {...props} />,
                  th: ({node, ...props}) => <th className="md-th" {...props} />,
                  td: ({node, ...props}) => <td className="md-td" {...props} />
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