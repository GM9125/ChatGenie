import { useState } from "react";
import PropTypes from "prop-types";
import { RiFileCopyLine } from "react-icons/ri";
import { cleanCodeContent } from "../utils/utils";

// Button component that copies text to clipboard with visual feedback
const CopyButton = ({ text }) => {
  // Track copied state for UI feedback
  const [isCopied, setIsCopied] = useState(false);

  // Handle copy action with error handling
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Clean and copy text to clipboard
      const cleanText = cleanCodeContent(text);
      await navigator.clipboard.writeText(cleanText);
      
      // Show success state briefly
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`code-copy-button ${isCopied ? "copied" : ""}`}
      title={isCopied ? "Copied!" : "Copy to clipboard"}
      aria-label={isCopied ? "Copied" : "Copy code"}
    >
      {/* Show checkmark when copied, copy icon otherwise */}
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

// Prop validation
CopyButton.propTypes = {
  text: PropTypes.string.isRequired,
};

export default CopyButton;