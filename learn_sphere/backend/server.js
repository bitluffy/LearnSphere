import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './models/user.model.js';


// Configuration
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";


// --- LaTeX Normalization Utility ---
function normalizeLatexDelimiters(text) {
  // Convert \[ ... \] and \\[ ... \\] to $$ ... $$
  text = text.replace(/\\\\?\[(.*?)\\\\?\]/gs, (match, p1) => `$$${p1.trim()}$$`);
  // Convert \(...\) and \\(...\\) to $...$
  text = text.replace(/\\\\?\((.*?)\\\\?\)/gs, (match, p1) => `$${p1.trim()}$`);
  // Remove newlines immediately after/before $$
  text = text.replace(/\$\$\s*\n/g, '$$');
  text = text.replace(/\n\s*\$\$/g, '$$');
  // Remove duplicate $ or $$ if present
  text = text.replace(/\${3,}/g, '$$');
  return text;
}


// --- Authentication Endpoints ---
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email or username" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});


app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});


// --- JWT Middleware ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};


// --- Signout Endpoint ---
app.post("/api/signout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: true, message: "Successfully signed out" });
    }
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.log("Invalid token during signout:", tokenError.message);
    }
    res.json({ success: true, message: "Successfully signed out" });
  } catch (error) {
    console.error("Signout error:", error);
    res.status(500).json({ error: "Signout failed" });
  }
});


// --- Protected Profile Route ---
app.get("/api/user/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


// --- Physics Chatbot ---
const handlePhysicsQuery = async (query) => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Physics tutor. Answer concisely in bullet points or numbered steps.
- Always write all equations in LaTeX.
- Use $$...$$ for display (block) equations, $...$ for inline equations.
- No newlines immediately after/before $$.
- Give brief engineering examples.
- Always include unit/dimension checks.
- No paragraphs; keep responses short and clear.`
          },
          { role: "user", content: query }
        ],
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.response?.data);
    throw new Error("Physics processing failed: " + error.message);
  }
};


app.post("/physics", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }
    const response = await handlePhysicsQuery(query);
    const normalizedResponse = normalizeLatexDelimiters(response);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Mathematics Chatbot ---
app.post("/maths", async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Maths tutor. Always:
1. Show 2+ solution methods
2. Always write all equations in LaTeX.
3. Use $$...$$ for display (block) equations, $...$ for inline equations.
4. No newlines immediately after/before $$.
5. Give engineering applications
6. Highlight common errors
7. Verify dimensional consistency


Example format:
**Problem:** [statement]
**Method 1:** [approach]
**Method 2:** [alternate approach]
**Real-world Use:** [application]`
          },
          { role: "user", content: query }
        ],
        temperature: 0.3
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    const normalizedResponse = normalizeLatexDelimiters(response.data.choices[0].message.content);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: "Math processing failed" });
  }
});


// --- Chemistry Chatbot ---
app.post("/chemistry", async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Chemistry tutor. Always:
1. Use SMILES notation for molecules: water=H2O
2. Always write all chemical equations and math in LaTeX.
3. Use $$...$$ for display (block) equations, $...$ for inline equations.
4. No newlines immediately after/before $$.
5. Balance equations stepwise
6. Explain lab safety protocols
7. Include reaction mechanisms
8. Add real-industry examples


Example format:
**Concept:** [topic]
**Step 1:** [key step]
**Lab Safety:** [precaution]
**Industrial Use:** [application]`
          },
          { role: "user", content: query }
        ],
        temperature: 0.3
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    const normalizedResponse = normalizeLatexDelimiters(response.data.choices[0].message.content);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: "Chemistry processing failed" });
  }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Physics agent running at http://localhost:${PORT}`);
});


mongoose.connect(process.env.MONGO).then(()=>{
  console.log('Connected to MongoDB')
}).catch((err)=>{
  console.log(err)
});