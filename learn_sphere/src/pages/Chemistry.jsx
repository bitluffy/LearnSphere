import React, { useState } from "react";
import Navbar from "./Navbar";
const Chemistry = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("http://localhost:3000/chemistry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await res.json();
      const botMessage = { sender: "bot", text: data.response || "No response." };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error: " + err.message },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#18181b" }}>
        <div className="w-full max-w-2xl bg-[#23232a] shadow-lg rounded-lg flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-blue-400 mb-2">🧪 Chemistry Expert Chat</h2>
            <p className="text-gray-300 mb-4">
              Ask any chemistry question below to get step-by-step explanations, equations, and real-world applications.
            </p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-2 h-[500px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-xs ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-700 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex" style={{ borderColor: "#333" }}>
            <input
              className="flex-1 border border-gray-700 rounded-l px-4 py-2 focus:outline-none bg-[#18181b] text-gray-100 placeholder-gray-400"
              type="text"
              placeholder="Ask a chemistry question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                background: "#18181b",
                color: "#f3f4f6",
                borderColor: "#333",
              }}
            />
            <button
              className="px-6 py-2 rounded-r hover:bg-blue-700"
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "0 0.5rem 0.5rem 0",
                cursor: "pointer",
              }}
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default Chemistry;