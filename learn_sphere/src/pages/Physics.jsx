import React, { useState, useEffect } from "react";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const renderWithLatex = (text) => {
    // Split by $$...$$ (block) and $...$ (inline), non-greedy, multiline
    const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+\$)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        return <BlockMath key={index} math={segment.slice(2, -2).trim()} />;
      } else if (segment.startsWith('$') && segment.endsWith('$')) {
        return <InlineMath key={index} math={segment.slice(1, -1).trim()} />;
      }
      return <span key={index}>{segment}</span>;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("http://localhost:3000/physics", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query: input }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      const botMessage = { 
        sender: "bot", 
        text: data.response || "No response found."
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: "bot", 
        text: `Error: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-2xl bg-gray-800 bg-opacity-95 rounded-2xl shadow-2xl flex flex-col">
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-400 mb-2 text-center drop-shadow-lg">Physics Expert Chatbot</h1>
          <p className="text-gray-300 text-center mb-4">Ask any physics question and get expert answers with beautiful formula rendering.</p>
        </div>
        <div className="flex-1 px-6 pb-6 overflow-y-auto h-96">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}
            >
              <div
                className={`max-w-[70%] rounded-xl p-4 text-base break-words shadow-md ${
                  msg.sender === "user" 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : "bg-gray-700 text-gray-100 rounded-bl-none"
                }`}
              >
                <div className="[&>.katex]:text-inherit">
                  {renderWithLatex(msg.text)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-700 text-gray-100 rounded-xl p-4 rounded-bl-none shadow-md">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-700 p-6 bg-gray-800 rounded-b-2xl">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-600 bg-gray-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              type="text"
              placeholder="Ask about physics, maths, or chemistry..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className={`px-6 py-3 rounded-lg text-white font-semibold shadow-md transition duration-200 ${
                isLoading 
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={sendMessage}
              disabled={isLoading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
      <footer className="mt-8 text-gray-500 text-sm">&copy; {new Date().getFullYear()} LearnSphere. All rights reserved.</footer>
    </div>
  );
};

export default ChatBot;