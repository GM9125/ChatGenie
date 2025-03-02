# ChatGenie - A Full-Stack Chat Application

ChatGenie is an interactive chat application that integrates a Python-based backend with a React-based frontend to provide a seamless chatting experience. The project is designed with a clear separation of backend and frontend components, leveraging modern development tools like Flask, Vite, and ESLint to ensure a robust and maintainable codebase.

---

## Project Structure

The "ChatGenie" project is organized into a well-defined directory structure with both backend and frontend components. Below is a detailed breakdown:

### Root Directory: CHATGENIE
- **backend**: Contains server-side logic.
  - `env`: Virtual environment for Python dependencies.
  - `app.py`: Main Flask application file, serving as the backend entry point.
  - `chat.py`: Manages chat operations and AI responses.
  - `config.py`: Configuration settings for the backend.
  - `errors.py`: Error handling logic.
  - `formatting.py`: Utilities for formatting responses.
  - `requirements.txt`: List of Python dependencies.
  - `validation.py`: Input validation logic.
  - `tests`: Directory for test files.
    - `test_chat.py`: Test script for chat functionality.
  - `chatgenie.log`: Log file for application events.

- **frontend**: Contains the client-side React application.
  - `node_modules`: Node.js dependencies installed via npm.
  - `public`: Static assets directory.
    - `ChatGenie-logo.png`: Project logo file (may also appear in `src/assets`).
  - `src`: Source code for the React application.
    - `components`: Reusable React components.
      - `AnimatedIcon.jsx`: Animated icon component.
      - `Chat.jsx`: Main chat interface component.
      - `ChatHeader.jsx`: Chat header component.
      - `CopyButton.jsx`: Button for copying content.
      - `InputArea.jsx`: Input area for sending messages.
      - `MessageBubble.jsx`: Renders individual chat messages.
      - `MessageList.jsx`: Displays the list of messages.
      - `Sidebar.jsx`: Sidebar for navigation or chat history.
      - `UserInfo.jsx`: Displays user information.
    - `Styles`: Directory for CSS files.
      - `index.css`: Global styles for the application.
    - `utils`: Utility scripts.
      - `utils.js` (or `JS_utils.js`): JavaScript helper functions.
    - `App.jsx`: Main React application component.
    - `main.jsx`: Entry point for rendering the React app.
  - `.eslintrc.config.js`: ESLint configuration for code quality.
  - `index.html`: Main HTML template for the web application.
  - `package-lock.json`: Locks dependency versions for reproducible builds.
  - `package.json`: Metadata and dependencies for the frontend.
  - `vite.config.js`: Vite configuration for development and build.

- **Root Files**:
  - `README.md`: This documentation file.
  - `.gitignore`: Specifies files and directories to exclude from Git.
  - `images`: Directory for additional image assets (if present).
  - `.pyteste_cache` / `coverage`: Cache and coverage reports from testing (may appear in some setups).
  - `chatgenie.log`: Application log file (may appear in root or backend).

---

## Key Components

### Backend
- `app.py`: The Flask server that handles API requests and responses.
- `chat.py`: Core logic for chat functionality, including session management and AI interactions.
- `requirements.txt`: Lists dependencies like Flask, ensuring consistent setup.

### Frontend
- `Chat.jsx`: The primary chat interface where users interact with the application.
- `Sidebar.jsx`: Displays chat history or navigation options.
- `MessageBubble.jsx`: Renders individual messages in the chat.
- `InputArea.jsx`: Allows users to type and send messages.
- `App.jsx`: The root React component tying the application together.

---

## Development Environment

- **Backend**: Built with Python and Flask, managed within a virtual environment (`env`).
- **Frontend**: Developed using React with Vite as the build tool and development server, and ESLint for maintaining code quality.
- **Version Control**: Managed with Git, as indicated by `.gitignore`.

---

## Known Issues

The following issues have been identified during development and are documented for awareness and resolution:

### TypeScript File Name Conflicts
- **Description**: Errors such as "Already included file name 'c:/Users/AT/ChatGenie/frontend/src/components/Sidebar.jsx' differs from file name 'c:/Us...ts(1261)" appear in the IDE's "Problems" tab.
- **Affected Files**: 
  - `Sidebar.jsx` (imported in `Chat.jsx`, Line 4)
  - `ChatHeader.jsx` (imported in `Chat.jsx`, Line 5)
  - `MessageList.jsx` (imported in `Chat.jsx`, Line 6)
  - `InputArea.jsx` (imported in `Chat.jsx`, Line 7)
  - `AnimatedIcon.jsx` (imported in `ChatHeader.jsx`, Line 3)
  - `MessageBubble.jsx` (imported in `MessageList.jsx`, Line 3)
  - `UserInfo.jsx` (imported in `Sidebar.jsx`, Line 3)
- **Cause**: Likely due to case sensitivity mismatches or duplicate file inclusions in TypeScript compilation.
- **Resolution**: Ensure consistent file name casing (e.g., `Sidebar.jsx` not `sidebar.jsx`) and verify import paths.

### Import Resolution Error
- **Description**: Vite error: "Failed to resolve import './components/Sidebar.jsx' from 'src/components/Chat.jsx'. Does the file exist?" (Line 21 in `Chat.jsx`).
- **Cause**: Incorrect relative path or missing file at the specified location.
- **Resolution**: Confirm the file exists at `src/components/Sidebar.jsx` and adjust the import path if needed (e.g., use `../components/Sidebar.jsx` if the structure requires it).

---

## Setup Instructions

Follow these steps to set up the "ChatGenie" project locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ChatGenie.git
   cd ChatGenie
   ```

2. **Backend Setup**:
   - Navigate to the backend directory:
     ```bash
     cd backend
     ```
   - Activate the virtual environment:
     ```bash
     source env/bin/activate  # On Windows: env\Scripts\activate
     ```
   - Install dependencies:
     ```bash
     pip install -r requirements.txt
     ```

3. **Frontend Setup**:
   - Navigate to the frontend directory:
     ```bash
     cd frontend
     ```
   - Install Node.js dependencies:
     ```bash
     npm install
     ```

---

## Usage

1. **Start the Backend Server**:
   - From the `backend` directory:
     ```bash
     python app.py
     ```
   - The Flask server will typically run on `http://localhost:5000`.

2. **Start the Frontend Server**:
   - From the `frontend` directory:
     ```bash
     npm run dev
     ```
   - Access the application in your browser at `http://localhost:5173` (default Vite port).

---

## Troubleshooting

- **File Name Conflicts**:
  - **Symptom**: TypeScript errors like `ts(1261)` about differing file names.
  - **Fix**: Check file names for consistent casing (e.g., `Sidebar.jsx` not `sidebar.jsx`) and ensure no duplicates exist in the project.

- **Import Errors**:
  - **Symptom**: Vite cannot resolve imports (e.g., `./components/Sidebar.jsx`).
  - **Fix**: Verify the file path relative to the importing file. For example, adjust `./` to `../` if the component is in a parent directory.

- **HMR Overlay**:
  - **Symptom**: Error overlay appears during development.
  - **Fix**: Dismiss by clicking outside, pressing Esc, or fixing the code. To disable permanently, add `server: { hmr: { overlay: false } }` to `vite.config.js`.

---

## Contributing

We welcome contributions to "ChatGenie"! To contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Submit a pull request.

Please ensure your code adheres to ESLint rules and includes appropriate tests where applicable.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file in the repository for details (if not present, assume MIT unless otherwise specified).

---
```
