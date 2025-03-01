// Date and time formatting utility
export const formatDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  
  // Code content cleaning utility
  export const cleanCodeContent = (content) => {
    if (Array.isArray(content)) {
      return content
        .map((child) => {
          if (typeof child === "string") return child;
          if (child?.props?.children) return cleanCodeContent(child.props.children);
          return "";
        })
        .join("")
        .replace(/^\n+|\n+$/g, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/^\d+[:.]\s*/gm, "")
        .replace(/^(```\w*\s*\n|\n```)/g, "")
        .trim();
    }
    return String(content)
      .replace(/^\n+|\n+$/g, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/^\d+[:.]\s*/gm, "")
      .replace(/^(```\w*\s*\n|\n```)/g, "")
      .trim();
  };
  
  // Language identification and mapping
  export const getLanguageName = (className) => {
    if (!className) return "";
    const match = className.match(/language-(\w+)/);
    if (!match) return "";
  
    const languageMap = {
      cpp: "cpp",
      "c++": "cpp",
      js: "javascript",
      javascript: "javascript",
      py: "python",
      python: "python",
      ts: "typescript",
      typescript: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      html: "html",
      css: "css",
      java: "java",
      cs: "csharp",
      csharp: "csharp",
      rb: "ruby",
      ruby: "ruby",
      go: "go",
      golang: "go",
      rs: "rust",
      rust: "rust",
      php: "php",
      sh: "bash",
      bash: "bash",
      shell: "bash",
      sql: "sql",
      json: "json",
      yml: "yaml",
      yaml: "yaml",
      md: "markdown",
      markdown: "markdown",
    };
  
    const lang = match[1].toLowerCase();
    return languageMap[lang] || lang;
  };
  
  // Language display name formatting
  export const formatLanguageName = (lang) => {
    if (!lang) return "plaintext";
  
    const languageNames = {
      js: "JavaScript",
      jsx: "React/JSX",
      ts: "TypeScript",
      tsx: "React/TSX",
      py: "Python",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      sql: "SQL",
      bash: "Bash",
      shell: "Shell",
      powershell: "PowerShell",
      ps1: "PowerShell",
      java: "Java",
      cpp: "C++",
      c: "C",
      cs: "C#",
      go: "Go",
      rust: "Rust",
      rb: "Ruby",
      php: "PHP",
      kt: "Kotlin",
      swift: "Swift",
      dart: "Dart",
      json: "JSON",
      yaml: "YAML",
      xml: "XML",
      markdown: "Markdown",
      md: "Markdown",
      dockerfile: "Dockerfile",
      plaintext: "Plain Text",
    };
  
    const normalizedLang = lang.toLowerCase();
    return languageNames[normalizedLang] || lang.charAt(0).toUpperCase() + lang.slice(1);
  };