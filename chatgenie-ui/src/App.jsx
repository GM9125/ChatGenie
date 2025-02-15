import React from 'react';
import Chat from './Chat.jsx';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-center py-6 bg-blue-500 text-white">
        ChatGenie
      </h1>
      <Chat />
    </div>
  );
}

export default App;