import { useState } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  RiFileCopyLine,
  RiRefreshLine,
  RiThumbUpLine,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbDownFill,
} from "react-icons/ri";
import CopyButton from "./CopyButton.jsx";
import {
  cleanCodeContent,
  getLanguageName,
  formatLanguageName,
} from "../utils/utils";
import '../Styles/MessageBubble.css';

/**
 * MessageBubble component renders individual chat messages
 * Supports markdown, code highlighting, and interactive features
 */
const MessageBubble = ({ message, onRegenerateResponse }) => {
  // State for message interactions
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Prevent click propagation except for specific actions
  const handleMessageClick = (e) => {
    if (
      e.target.closest(".code-copy-button") ||
      e.target.closest(".message-actions")
    )
      return;
    e.stopPropagation();
  };

  // Copy message text to clipboard
  const handleCopyResponse = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy response:", err);
    }
  };

  // Handle message feedback actions
  const handleLike = () => {
    setIsLiked(!isLiked);
    setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    setIsLiked(false);
  };

  // Custom markdown components configuration
  const markdownComponents = {
    // Code block rendering with syntax highlighting
    code: ({ inline, className, children, ...props }) => {
      const filteredProps = { ...props };
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
    // Other markdown components (p, h1, h2, etc.)
    p: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <p className="md-p selectable" {...filteredProps}>
          {children}
        </p>
      );
    },
    h1: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <h1 className="md-h1 selectable" {...filteredProps}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <h2 className="md-h2 selectable" {...filteredProps}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <h3 className="md-h3 selectable" {...filteredProps}>
          {children}
        </h3>
      );
    },
    ul: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.ordered;
      delete filteredProps.node;
      return (
        <ul className="md-ul selectable" {...filteredProps}>
          {children}
        </ul>
      );
    },
    ol: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.ordered;
      delete filteredProps.node;
      return (
        <ol className="md-ol selectable" {...filteredProps}>
          {children}
        </ol>
      );
    },
    li: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.ordered;
      delete filteredProps.node;
      return (
        <li className="md-li selectable" {...filteredProps}>
          {children}
        </li>
      );
    },
    blockquote: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <blockquote className="md-blockquote selectable" {...filteredProps}>
          {children}
        </blockquote>
      );
    },
    table: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      delete filteredProps.isHeader;
      return (
        <div className="table-container selectable">
          <table className="md-table" {...filteredProps}>
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      delete filteredProps.isHeader;
      return <thead {...filteredProps}>{children}</thead>;
    },
    tbody: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return <tbody {...filteredProps}>{children}</tbody>;
    },
    th: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      delete filteredProps.isHeader;
      return (
        <th className="md-th table-header selectable" {...filteredProps}>
          {children}
        </th>
      );
    },
    td: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <td className="md-td selectable" {...filteredProps}>
          {children}
        </td>
      );
    },
    a: ({ children, ...props }) => {
      const filteredProps = { ...props };
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
    img: ({ ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <img
          className="md-img"
          alt={props.alt || ""}
          loading="lazy"
          {...filteredProps}
        />
      );
    },
    em: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <em className="md-em selectable" {...filteredProps}>
          {children}
        </em>
      );
    },
    strong: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <strong className="md-strong selectable" {...filteredProps}>
          {children}
        </strong>
      );
    },
    del: ({ children, ...props }) => {
      const filteredProps = { ...props };
      delete filteredProps.node;
      return (
        <del className="md-del selectable" {...filteredProps}>
          {children}
        </del>
      );
    },
  };

  return (
    <div
      className="message-container"
      onClick={handleMessageClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={`message ${message.isUser ? "user-message" : "bot-message"}`}
      >
        <div className="message-text">
          {message.isUser ? (
            // Simple text display for user messages
            <span className="selectable">{message.text}</span>
          ) : (
            <>
              {/* Rich markdown rendering for bot messages */}
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>

              {/* Action buttons for bot messages */}
              {!message.isUser && (
                <div className="message-actions">
                  {/* Like/Dislike buttons */}
                  <div className="action-group">
                    <button
                      className={`action-button ${isLiked ? "active" : ""}`}
                      onClick={handleLike}
                      title="Like response"
                    >
                      {isLiked ? <RiThumbUpFill /> : <RiThumbUpLine />}
                    </button>
                    <button
                      className={`action-button ${isDisliked ? "active" : ""}`}
                      onClick={handleDislike}
                      title="Dislike response"
                    >
                      {isDisliked ? <RiThumbDownFill /> : <RiThumbDownLine />}
                    </button>
                  </div>
                  <div className="action-separator" />
                  {/* Regenerate and copy buttons */}
                  <div className="action-group">
                    <button
                      className="action-button"
                      onClick={() => onRegenerateResponse(message.id)}
                      title="Regenerate response"
                    >
                      <RiRefreshLine />
                    </button>
                    <button
                      className={`action-button ${isCopied ? "copied" : ""}`}
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

// Prop validation
MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.string.isRequired,
    isUser: PropTypes.bool.isRequired,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
  onRegenerateResponse: PropTypes.func.isRequired,
  alt: PropTypes.string,
};

export default MessageBubble;