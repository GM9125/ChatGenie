import React, { useState } from 'react';
import axios from 'axios';

const Chat = () => {
  const [messages, setMessages] = useState([]); // Stores the chat history
  const [input, setInput] = useState(''); // Stores the user's input

  // Function to send a message to the backend
  const sendMessage = async () => {
    if (!input.trim()) return; // Don't send empty messages

    // Add the user's message to the chat
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput(''); // Clear the input field

    try {
      // Send the message to the Flask backend
      const response = await axios.post('http://127.0.0.1:5000/chat', {
        message: input,
      });

      // Add the bot's response to the chat
      setMessages((prev) => [...prev, { sender: 'bot', text: response.data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Sorry, something went wrong!' }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 my-2 rounded-lg max-w-[70%] ${
              msg.sender === 'user'
                ? 'ml-auto bg-blue-500 text-white'
                : 'mr-auto bg-gray-200 text-gray-800'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="px-4 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;