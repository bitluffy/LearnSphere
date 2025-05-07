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
// Updated API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"; // Added /openai/ path

// Authentication endpoints
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        error: "User already exists with this email or username" 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    // Save user to database
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// After the login and signup endpoints, add this:


// Middleware to verify JWT token

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }
  
  const token = authHeader.split(' ')[1];
  console.log("Received token:", token); // Log the received token for debugging purposes
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};
// Signout endpoint
app.post("/api/signout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Even if no token is provided, we'll still allow signout
      return res.json({
        success: true,
        message: "Successfully signed out"
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token but don't block signout if it fails
      jwt.verify(token, process.env.JWT_SECRET);
      // In a production app, you might add the token to a blacklist here
    } catch (tokenError) {
      // Token is invalid, but we'll still allow signout
      console.log("Invalid token during signout:", tokenError.message);
    }
    
    res.json({
      success: true,
      message: "Successfully signed out"
    });
  } catch (error) {
    console.error("Signout error:", error);
    res.status(500).json({ error: "Signout failed" });
  }
});
// Example of a protected route
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

mongoose.connect(process.env.MONGO).then(()=>{
  console.log('Connected to MongoDB')
}).catch((err)=>{
  console.log(err)
})
