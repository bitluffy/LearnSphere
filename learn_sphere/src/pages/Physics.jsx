import React, { useRef, useState, useEffect } from "react";
import mermaid from "mermaid";
import { InlineMath, BlockMath } from "react-katex";
import Navbar from "./Navbar";

const Physics = () => {
  const containerRef = useRef(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("chat");
  const [chatMessages, setChatMessages] = useState([]);
  const [flowchartData, setFlowchartData] = useState(null);

  const subject = "Physics";

  const renderWithLatex = (text) => {
    const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+\$)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith("$$") && segment.endsWith("$$")) {
        return <BlockMath key={index} math={segment.slice(2, -2).trim()} />;
      } else if (segment.startsWith("$") && segment.endsWith("$")) {
        return <InlineMath key={index} math={segment.slice(1, -1).trim()} />;
      }
      return <span key={index}>{segment}</span>;
    });
  };

  useEffect(() => {
    // Auto scroll to bottom on new message or flowchart
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatMessages, flowchartData]);

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
        if (data.structuredData && data.structuredData.mermaid) {
          mermaid.initialize({ startOnLoad: false });
          const svgId = "mermaid-physics-chart";
          mermaid
            .render(svgId, data.structuredData.mermaid)
            .then(({ svg }) => {
              setFlowchartData({
                svg,
                description: data.structuredData.description || "",
              });
            })
            .catch(() => {
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
        const res = await fetch("http://localhost:3000/physics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userPrompt }),
        });
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "bot", text: data.response || "No response." },
        ]);
      }
    } catch (err) {
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
          <h2
            style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#60a5fa" }}
          >
            🌌 Physics Assistant
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

        {/* Scrollable Chat/Flowchart */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 1.5rem",
          }}
        >
          {mode === "chat" && chatMessages.length === 0 && (
            <p
              style={{ textAlign: "center", color: "#777", marginTop: "2rem" }}
            >
              Start a conversation by asking a physics question.
            </p>
          )}
          {mode === "chat" &&
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
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
                  <div className="[&>.katex]:text-inherit">
                    {renderWithLatex(msg.text)}
                  </div>
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
            <p
              style={{
                textAlign: "center",
                color: "#60a5fa",
                marginTop: "1rem",
              }}
            >
              {mode === "flowchart"
                ? "Generating flowchart..."
                : "Solving physics problem..."}
            </p>
          )}
        </div>

        {/* Input */}
        {/* Fixed Input at Bottom */}
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
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={1}
            placeholder={
              mode === "flowchart"
                ? "Describe physics concept for flowchart..."
                : "Ask a physics question (use $...$ for equations)..."
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
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </>
  );
};

export default Physics;
