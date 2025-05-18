import React, { useRef, useState, useEffect } from "react";
import mermaid from "mermaid";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import Navbar from "./Navbar";

const Chemistry = () => {
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("chat");
  const [chatMessages, setChatMessages] = useState([]);
  const [flowchartData, setFlowchartData] = useState(null);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState(0);
  const subject = "Chemistry";
  const storageKey = "chemistryChat";

  // Load saved chat from session storage
  useEffect(() => {
    const savedChat = sessionStorage.getItem(storageKey);
    if (savedChat) {
      setChatMessages(JSON.parse(savedChat));
    }
  }, []);

  // Save chat messages to session storage on update
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Scroll & Focus
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatMessages, flowchartData]);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        setRetryCount(0); // Reset retry count on successful start
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        console.log('Transcript:', transcript);
        setUserPrompt(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'Speech recognition failed. ';
        
        switch(event.error) {
          case 'no-speech':
            errorMessage += 'No speech was detected.';
            break;
          case 'aborted':
            errorMessage += 'Speech recognition was aborted.';
            break;
          case 'audio-capture':
            errorMessage += 'No microphone was found.';
            break;
          case 'network':
            errorMessage += 'Network error occurred.';
            if (retryCount < 3) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
                startRecording();
              }, 1000 * (retryCount + 1)); // Exponential backoff
              errorMessage += ' Retrying...';
            }
            break;
          case 'not-allowed':
            errorMessage += 'Microphone permission was denied.';
            break;
          case 'service-not-allowed':
            errorMessage += 'Speech recognition service is not allowed.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }

        setChatMessages(prev => [
          ...prev,
          { role: "bot", text: errorMessage }
        ]);
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
      };

      setRecognition(recognition);
    } else {
      console.error('Speech recognition not supported');
      setIsSpeechSupported(false);
      setChatMessages(prev => [
        ...prev,
        { role: "bot", text: "Speech recognition is not supported in your browser. Please use Chrome or Edge." }
      ]);
    }
  }, [retryCount]);

  const startRecording = () => {
    if (!isSpeechSupported) {
      setChatMessages(prev => [
        ...prev,
        { role: "bot", text: "Speech recognition is not supported in your browser. Please use Chrome or Edge." }
      ]);
      return;
    }

    if (recognition) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting recording:', error);
        setChatMessages(prev => [
          ...prev,
          { role: "bot", text: "Could not start speech recognition. Please check your microphone permissions and try again." }
        ]);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recording:', error);
        setChatMessages(prev => [
          ...prev,
          { role: "bot", text: "Error stopping speech recognition. Please try again." }
        ]);
      }
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;
    setLoading(true);

    if (mode === "chat") {
      setChatMessages((prev) => [...prev, { role: "user", text: userPrompt }]);
    }
    setFlowchartData(null);

    try {
      if (mode === "flowchart") {
        const res = await fetch("http://localhost:3000/generate-flowchart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, content: userPrompt }),
        });
        const data = await res.json();
        if (data.structuredData?.mermaid) {
          mermaid.initialize({ startOnLoad: false });
          const svgId = "mermaid-chem-chart";
          mermaid.render(svgId, data.structuredData.mermaid).then(({ svg }) => {
            setFlowchartData({
              svg,
              description: data.structuredData.description || "",
            });
          }).catch(() => {
            setFlowchartData({
              svg: "<div style='color:red'>Invalid Mermaid code</div>",
              description: "",
            });
          });
        } else {
          setFlowchartData({
            svg: "<div style='color:red'>No flowchart generated</div>",
            description: "",
          });
        }
      } else if (mode === "chat") {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in to use the chat feature");

        if (isWebSearch) {
          const res = await fetch("http://localhost:3000/api/web-search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query: userPrompt }),
          });
          
          if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('retry-after')) || 600;
            setIsRateLimited(true);
            setRateLimitRetryAfter(retryAfter);
            throw new Error(`Rate limit reached. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`);
          }

          const data = await res.json();
          if (data.success) {
            setChatMessages((prev) => [
              ...prev,
              { 
                role: "bot", 
                text: `Web Search Results:\n${data.data.answer || "No direct answer found."}\n\nSources:\n${data.data.sources?.map(source => `- ${source.title}: ${source.url}`).join('\n') || "No sources available."}`
              },
            ]);
          } else {
            throw new Error(data.error || "Web search failed");
          }
        } else {
          const res = await fetch("http://localhost:3000/chemistry", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query: userPrompt }),
          });

          if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('retry-after')) || 600;
            setIsRateLimited(true);
            setRateLimitRetryAfter(retryAfter);
            throw new Error(`Rate limit reached. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`);
          }

          const data = await res.json();
          setChatMessages((prev) => [
            ...prev,
            { role: "bot", text: data.response || "No response." },
          ]);
        }
      }
    } catch (err) {
      console.error("Error in handleGenerate:", err);
      if (mode === "flowchart") {
        setFlowchartData({
          svg: "<div style='color:red'>Failed to load flowchart</div>",
          description: "",
        });
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "bot", text: "Error: " + err.message },
        ]);
      }
    }
    setUserPrompt("");
    setLoading(false);
    setIsWebSearch(false);
  };

  // Add rate limit countdown effect
  useEffect(() => {
    let timer;
    if (isRateLimited && rateLimitRetryAfter > 0) {
      timer = setInterval(() => {
        setRateLimitRetryAfter(prev => {
          if (prev <= 1) {
            setIsRateLimited(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRateLimited, rateLimitRetryAfter]);

  const renderWithLatex = (text) => {
    const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+\$)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith("$$") && segment.endsWith("$$")) {
        return <BlockMath key={index} math={segment.slice(2, -2).trim()} errorColor="#cc0000" />;
      } else if (segment.startsWith("$") && segment.endsWith("$")) {
        return <InlineMath key={index} math={segment.slice(1, -1).trim()} errorColor="#cc0000" />;
      }
      return <span key={index}>{segment}</span>;
    });
  };

  return (
    <>
      <Navbar />
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f0f0f",
          color: "#e4e4e7",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #333",
            backgroundColor: "#1e1e20",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#60a5fa" }}>
            🧪 Chemistry Assistant
          </h2>
          <div
            style={{
              display: "flex",
              background: "#2a2a2e",
              borderRadius: "0.5rem",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setMode("chat")}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: mode === "chat" ? "#2563eb" : "transparent",
                color: mode === "chat" ? "#fff" : "#aaa",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Chat
            </button>
            <button
              onClick={() => setMode("flowchart")}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: mode === "flowchart" ? "#2563eb" : "transparent",
                color: mode === "flowchart" ? "#fff" : "#aaa",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Flowchart
            </button>
          </div>
        </div>

        {/* Add rate limit warning */}
        {isRateLimited && (
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#dc2626",
              color: "#fff",
              textAlign: "center",
              fontSize: "0.875rem",
            }}
          >
            Rate limit reached. Please wait {Math.ceil(rateLimitRetryAfter / 60)} minutes before trying again.
          </div>
        )}

        {/* Scrollable Output Area */}
        <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
          {mode === "chat" && chatMessages.length === 0 && (
            <p style={{ textAlign: "center", color: "#777", marginTop: "2rem" }}>
              Start a conversation by asking a chemistry question.
            </p>
          )}

          {mode === "chat" &&
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  margin: "0.5rem 0",
                }}
              >
                <div
                  style={{
                    background: msg.role === "user" ? "#2563eb" : "#2c2c35",
                    color: "#fff",
                    borderRadius: "1rem",
                    padding: "0.75rem 1rem",
                    maxWidth: "75%",
                    fontSize: "1rem",
                  }}
                >
                  {renderWithLatex(msg.text)}
                </div>
              </div>
            ))}

          {mode === "flowchart" && flowchartData && (
            <div style={{ color: "#fff" }}>
              <div dangerouslySetInnerHTML={{ __html: flowchartData.svg }} />
              {flowchartData.description && (
                <p style={{ marginTop: "1rem", color: "#aaa" }}>
                  <strong>Description:</strong> {flowchartData.description}
                </p>
              )}
            </div>
          )}

          {loading && (
            <p style={{ textAlign: "center", color: "#60a5fa", marginTop: "1rem" }}>
              {mode === "flowchart" ? "Generating flowchart..." : "Getting answer..."}
            </p>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleGenerate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem",
            borderTop: "1px solid #333",
            background: "#1a1a1c",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }}
        >
          <textarea
            ref={textareaRef}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate(e);
              }
            }}
            rows={1}
            placeholder={
              isRateLimited
                ? `Rate limited. Please wait ${Math.ceil(rateLimitRetryAfter / 60)} minutes...`
                : mode === "flowchart"
                ? "Describe chemistry process for flowchart..."
                : isWebSearch
                ? "Search the web for chemistry information..."
                : "Ask a chemistry question..."
            }
            style={{
              flex: 1,
              resize: "none",
              background: "#121212",
              border: "1px solid #333",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              color: "#fff",
              fontSize: "1rem",
            }}
            disabled={loading || isRateLimited}
            required
          />

          <button
            type="button"
            onClick={() => setIsWebSearch(!isWebSearch)}
            disabled={loading || isRateLimited}
            style={{
              background: isWebSearch ? "#2563eb" : "#2a2a2e",
              color: "#fff",
              border: "none",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              cursor: (loading || isRateLimited) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isWebSearch ? "Disable web search" : "Enable web search"}
          >
            🔍
          </button>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading || isRateLimited}
            style={{
              background: isRecording ? "#dc2626" : "#2a2a2e",
              color: "#fff",
              border: "none",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              cursor: (loading || isRateLimited) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>

          <button
            type="submit"
            disabled={loading || isRateLimited}
            style={{
              background: isRateLimited ? "#4b5563" : "#2563eb",
              color: "#fff",
              border: "none",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              fontWeight: "bold",
              cursor: (loading || isRateLimited) ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "..." : isRateLimited ? "Rate Limited" : "Send"}
          </button>
        </form>
      </div>
    </>
  );
};

export default Chemistry;
