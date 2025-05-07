import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

// Configuration
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Updated API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"; // Added /openai/ path

// Core physics tutoring function
const handlePhysicsQuery = async (query) => {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile", // Versatile model as requested
        messages: [
          {
            role: "system",
            content: `Physics tutor. Answer concisely in bullet points or numbered steps. 
- Use LaTeX for equations (e.g., \\( F = ma \\)).
- Give brief engineering examples.
- Always include unit/dimension checks.
- No paragraphs; keep responses short and clear.`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.response?.data);
    throw new Error("Physics processing failed: " + error.message);
  }
};

// API Endpoint
app.post("/physics", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }
    const response = await handlePhysicsQuery(query);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add these endpoints to your existing server

// Mathematics Chatbot
app.post("/maths", async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Maths tutor. Always:
1. Show 2+ solution methods
2. Use LaTeX: \\( \\int x^2 dx \\)
3. Give engineering applications
4. Highlight common errors
5. Verify dimensional consistency

Example format:
**Problem:** [statement]
**Method 1:** [approach]
**Method 2:** [alternate approach]
**Real-world Use:** [application]`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Math processing failed" });
  }
});

// Chemistry Chatbot
app.post("/chemistry", async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Chemistry tutor. Always:
1. Use SMILES notation for molecules: water=H2O
2. Balance equations stepwise
3. Explain lab safety protocols
4. Include reaction mechanisms
5. Add real-industry examples

Example format:
**Concept:** [topic]
**Step 1:** [key step]
**Lab Safety:** [precaution]
**Industrial Use:** [application]`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Chemistry processing failed" });
  }
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Physics agent running at http://localhost:${PORT}`);
});
