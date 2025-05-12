import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import mermaid from "mermaid";
import Navbar from './Navbar';

const Maths = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [description, setDescription] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const subject = "Mathematics";

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDescription('');
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    try {
      const res = await fetch('http://localhost:3000/generate-flowchart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, content: userPrompt }),
      });
      const data = await res.json();
      if (data.structuredData && data.structuredData.mermaid) {
        mermaid.initialize({ startOnLoad: false });
        const svgId = "mermaid-chart";
        mermaid.render(svgId, data.structuredData.mermaid).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        }).catch((err) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = "<div style='color:red'>Invalid Mermaid code</div>";
          }
          console.error("Mermaid render error:", err);
        });
        setDescription(data.structuredData.description || '');
      } else {
        if (containerRef.current) {
          containerRef.current.innerHTML = "<div style='color:red'>No flowchart generated</div>";
        }
        setDescription('');
      }
    } catch (err) {
      if (containerRef.current) {
        containerRef.current.innerHTML = "<div style='color:red'>Failed to load flowchart</div>";
      }
      setDescription('');
      console.error("API error:", err);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: "2rem" }}>
        <h2>📊 Mermaid Diagram</h2>
        <form onSubmit={handleGenerate} style={{ marginBottom: "1.5rem" }}>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="Enter your mathematics topic or problem for flowchart generation..."
            rows={4}
            style={{ width: "100%", fontSize: "1rem", padding: "0.5rem" }}
            required
          />
          <button
            type="submit"
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem 1.5rem",
              fontSize: "1rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Flowchart"}
          </button>
        </form>
        <div ref={containerRef} />
        {description && (
          <div style={{ marginTop: "1.5rem", fontSize: "1.1rem", color: "#333" }}>
            <strong>Description:</strong> {description}
          </div>
        )}
      </div>
    </>
  )
}

export default Maths;