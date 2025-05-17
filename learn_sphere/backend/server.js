import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import { tavily } from '@tavily/core';
import { cloudinary, upload } from './config/cloudinary.js';
import { spawn } from 'child_process';

// Configuration
dotenv.config();
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], // Allow both localhost and IP
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Add this helper function near the top of the file, after imports
const normalizeSubject = (subject) => {
  const subjectMap = {
    'maths': 'mathematics',
    'mathematics': 'mathematics',
    'physics': 'physics',
    'chemistry': 'chemistry'
  };
  return subjectMap[subject.toLowerCase()] || subject;
};

// --- LaTeX Normalization Utility ---
function normalizeLatexDelimiters(text) {
  // Convert \[ ... \] and \\[ ... \\] to $$ ... $$
  text = text.replace(
    /\\\\?\[(.*?)\\\\?\]/gs,
    (match, p1) => `$$${p1.trim()}$$`
  );
  // Convert \(...\) and \\(...\\) to $...$
  text = text.replace(/\\\\?\((.*?)\\\\?\)/gs, (match, p1) => `$${p1.trim()}$`);
  // Remove newlines immediately after/before $$
  text = text.replace(/\$\$\s*\n/g, "$$");
  text = text.replace(/\n\s*\$\$/g, "$$");
  // Remove duplicate $ or $$ if present
  text = text.replace(/\${3,}/g, "$$");
  return text;
}

// --- Authentication Endpoints ---
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email or username" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
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
      { expiresIn: "24h" }
    );
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// --- JWT Middleware ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token from localStorage:", token);
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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ success: true, message: "Successfully signed out" });
    }
    const token = authHeader.split(" ")[1];
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
    console.log("Fetching profile for user:", req.user.id);
    console.log("Token received:", req.headers.authorization?.split(' ')[1]?.substring(0, 10) + '...');
    
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      console.log("User not found:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log("Profile found:", user.username);
    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ 
      error: "Server error", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.put("/api/user/profile", verifyToken, async (req, res) => {
  try {
    const { pronouns, institution, year, branch } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update only the fields that are provided
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (institution !== undefined) user.institution = institution;
    if (year !== undefined) user.year = year;
    if (branch !== undefined) user.branch = branch;

    await user.save();
    
    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select("-password");
    res.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Add chat context management
const MAX_CONTEXT_LENGTH = 5; // Number of previous interactions to keep
const chatContexts = new Map(); // Store chat contexts for each user

// Function to manage chat context
const manageChatContext = (userId, query, response, subject) => {
    if (!chatContexts.has(userId)) {
        chatContexts.set(userId, []);
    }
    
    const context = chatContexts.get(userId);
    context.push({
        query,
        response,
        subject,
        timestamp: new Date(),
        ragContext: null // Will be updated when RAG is used
    });
    
    // Keep only the last MAX_CONTEXT_LENGTH interactions
    if (context.length > MAX_CONTEXT_LENGTH) {
        context.shift();
    }
    
    return context;
};

// Enhanced RAG metrics tracking
const trackRAGMetrics = (userId, query, subject, ragContext, response) => {
    const metrics = {
        timestamp: new Date(),
        query,
        subject,
        contextCount: ragContext ? (ragContext.match(/Previous Interaction/g) || []).length : 0,
        responseLength: response.length,
        qualityIndicators: {
            hasEquations: response.includes('$$') || response.includes('$'),
            hasBulletPoints: response.includes('*') || response.includes('-'),
            hasExamples: response.toLowerCase().includes('example') || response.toLowerCase().includes('for instance')
        }
    };

    // Store metrics in user's document
    User.findByIdAndUpdate(userId, {
        $push: {
            ragMetrics: metrics
        }
    }).catch(err => console.error('Error storing RAG metrics:', err));

    return metrics;
};

// Enhanced RAG context retrieval function
const getEnhancedRAGContext = async (query, subject) => {
    try {
        console.log('\n=== Starting RAG Context Retrieval ===');
        console.log(`Query: ${query}`);
        console.log(`Subject: ${subject}`);

        const pythonProcess = spawn('python', [
            './utils/rag_processor.py',
            '--query', query,
            '--subject', subject
        ]);

        let context = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('\n--- RAG Processor Output ---');
            console.log(output);
            context += output;
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.error('\n--- RAG Processor Error ---');
            console.error(errorOutput);
            error += errorOutput;
        });

        return new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('RAG Process Error:', error);
                    console.log('RAG processing failed, returning empty context');
                    resolve(''); // Return empty context on error
                } else {
                    console.log('\n=== RAG Context Retrieved Successfully ===');
                    console.log('Context length:', context.length);
                    console.log('Context preview:', context.substring(0, 200) + '...');
                    resolve(context.trim());
                }
            });
        });
    } catch (error) {
        console.error('RAG Context Error:', error);
        return '';
    }
};

// Enhanced logging function
const logRAGMetrics = (query, subject, ragContext, response) => {
    const timestamp = new Date().toISOString();
    console.log('\n=== RAG Performance Metrics ===');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Subject: ${subject}`);
    console.log(`Query: ${query}`);
    
    // Enhanced RAG Context Analysis
    console.log('\n--- RAG Context Analysis ---');
    if (ragContext) {
        const contextCount = (ragContext.match(/Previous Interaction/g) || []).length;
        console.log(`Number of relevant contexts found: ${contextCount}`);
        
        if (contextCount > 0) {
            console.log('\nContext Details:');
            const contexts = ragContext.split('\n\n').filter(c => c.includes('Previous Interaction'));
            contexts.forEach((ctx, i) => {
                const similarityMatch = ctx.match(/Relevance Score: ([\d.]+)/);
                const score = similarityMatch ? similarityMatch[1] : 'N/A';
                const queryMatch = ctx.match(/Query: (.*?)(?:\n|$)/);
                const query = queryMatch ? queryMatch[1] : 'N/A';
                
                console.log(`\nContext ${i + 1}:`);
                console.log(`- Similarity Score: ${score}`);
                console.log(`- Related Query: ${query}`);
                console.log(`- Context Preview: ${ctx.split('\n').slice(0, 3).join(' | ')}`);
            });
        }
    } else {
        console.log('No relevant context found in knowledge base');
    }

    // Enhanced Response Analysis
    console.log('\n--- Response Analysis ---');
    console.log(`Response length: ${response.length} characters`);
    
    // Check for key elements in the response
    const hasEquations = response.includes('$$') || response.includes('$');
    const hasBulletPoints = response.includes('*') || response.includes('-');
    const hasExamples = response.toLowerCase().includes('example') || response.toLowerCase().includes('for instance');
    
    console.log('\nResponse Quality Indicators:');
    console.log(`- Contains equations: ${hasEquations ? '✅' : '❌'}`);
    console.log(`- Uses bullet points: ${hasBulletPoints ? '✅' : '❌'}`);
    console.log(`- Includes examples: ${hasExamples ? '✅' : '❌'}`);
    
    console.log('\nResponse Preview:');
    console.log(response.substring(0, 200) + '...');
    console.log('========================\n');

    // Return metrics for potential storage
    return {
        timestamp,
        subject,
        query,
        contextCount: ragContext ? (ragContext.match(/Previous Interaction/g) || []).length : 0,
        responseLength: response.length,
        qualityIndicators: {
            hasEquations,
            hasBulletPoints,
            hasExamples
        }
    };
};

// Add RAG handling functions at the top level
const handleQueryWithRAG = async (query, subject, userId) => {
    try {
        console.log('\n=== RAG Context Retrieval ===');
        console.log(`Query: ${query}`);
        console.log(`Subject: ${subject}`);
        console.log(`User ID: ${userId}`);

        // Get chat context
        const chatContext = chatContexts.get(userId) || [];
        console.log('\n--- Chat Context ---');
        console.log(`Number of previous interactions: ${chatContext.length}`);
        
        const recentContext = chatContext
            .filter(ctx => ctx.subject === subject)
            .slice(-3) // Use last 3 related interactions
            .map(ctx => `Previous Query: ${ctx.query}\nPrevious Response: ${ctx.response}`)
            .join('\n\n');
        
        console.log('\nRecent Context:');
        console.log(recentContext || 'No recent context found');

        // Get RAG context
        console.log('\n--- RAG Context ---');
        const ragContext = await getEnhancedRAGContext(query, subject);
        console.log('RAG Context Retrieved:');
        console.log(ragContext || 'No RAG context found');
        
        // Combine chat context with RAG context
        const combinedContext = recentContext 
            ? `${recentContext}\n\n${ragContext || ''}`
            : ragContext;
        
        console.log('\n--- Combined Context ---');
        console.log(combinedContext || 'No combined context available');

        const systemPrompt = `You are an expert ${subject} tutor. Keep responses concise and clear:
- Write equations in human-readable form first, then LaTeX
- Use $$...$$ for display equations, $...$ for inline
- No newlines around $$ delimiters
- Include units and dimensions
- Give brief, practical examples
- Use bullet points for clarity
- Keep responses under 150 words unless detailed explanation is requested

${combinedContext ? `\nRelevant Context from Previous Interactions:\n${combinedContext}\n\nUse this context to provide more accurate and comprehensive responses. If the context is relevant, build upon it and maintain consistency with previous explanations.` : ''}`;

        console.log('\n--- System Prompt with Context ---');
        console.log(systemPrompt);

        const response = await axios.post(
            GROQ_API_URL,
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    { role: "user", content: query }
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

        const solution = response.data.choices[0].message.content;
        console.log('\n--- Generated Response ---');
        console.log(solution);

        // Update chat context
        const updatedContext = manageChatContext(userId, query, solution, subject);
        console.log('\n--- Updated Chat Context ---');
        console.log(`Total interactions after update: ${updatedContext.length}`);
        
        // Track RAG metrics
        const metrics = trackRAGMetrics(userId, query, subject, ragContext, solution);
        console.log('\n--- RAG Metrics ---');
        console.log(JSON.stringify(metrics, null, 2));

        // Remove the database storage from here since it's handled in the endpoint
        console.log('\n=== RAG Processing Complete ===\n');
        return solution;
    } catch (error) {
        console.error('\n=== RAG Processing Error ===');
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        throw new Error(`${subject} processing failed: ${error.message}`);
    }
};

// Update the mathematics endpoint
app.post("/maths", verifyToken, async (req, res) => {
    try {
        console.log('Mathematics endpoint called with body:', req.body);
        
        const { query, subject } = req.body;
        if (!query) {
            console.error('Missing query parameter in request');
            return res.status(400).json({ 
                error: "Missing query parameter",
                details: "The request body must contain a 'query' field"
            });
        }

        console.log('Processing mathematics query:', query);
        console.log('User ID:', req.user.id);

        // Validate user exists
        const user = await User.findById(req.user.id);
        if (!user) {
            console.error('User not found:', req.user.id);
            return res.status(404).json({ 
                error: "User not found",
                details: `No user found with ID: ${req.user.id}`
            });
        }

        try {
            // First try with RAG
            console.log('Attempting RAG processing');
            const response = await handleQueryWithRAG(query, "mathematics", req.user.id);
            console.log('Successfully generated response with RAG');
            
            const normalizedResponse = normalizeLatexDelimiters(response);
            console.log('Response normalized successfully');

            // Store in MongoDB with explicit subject normalization
            try {
                const normalizedSubject = normalizeSubject("mathematics");
                console.log('Storing query with normalized subject:', normalizedSubject);
                
                // Create the query object according to the schema
                const queryObject = {
                    query,
                    solution: normalizedResponse,
                    subject: normalizedSubject,
                    createdAt: new Date()
                };

                // Update user document with the new query
                const updatedUser = await User.findByIdAndUpdate(
                    req.user.id,
                    {
                        $push: {
                            queries: queryObject
                        }
                    },
                    { 
                        new: true, 
                        runValidators: true,
                        upsert: false
                    }
                );

                if (!updatedUser) {
                    console.error('Failed to update user document');
                    throw new Error('Failed to store query in database');
                }

                // Verify the query was stored
                const storedQuery = updatedUser.queries[updatedUser.queries.length - 1];
                console.log('Stored query details:', {
                    subject: storedQuery.subject,
                    query: storedQuery.query.substring(0, 50) + '...',
                    createdAt: storedQuery.createdAt
                });

                console.log('Successfully stored query in MongoDB');
            } catch (dbError) {
                console.error('Database update error:', dbError);
                // Continue with response even if database update fails
            }
            
            res.json({ response: normalizedResponse });
        } catch (ragError) {
            console.error('RAG processing error:', {
                error: ragError.message,
                stack: ragError.stack,
                query: query
            });
            
            // Fallback to direct response without RAG
            console.log('Attempting fallback response without RAG');
            try {
                const fallbackResponse = await axios.post(
                    GROQ_API_URL,
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            {
                                role: "system",
                                content: `You are an expert mathematics tutor. Structure your responses in the following format:

1. Concept Overview:
- Start with a clear, concise definition
- Use simple language first, then technical terms
- Include key principles

2. Mathematical Formulation:
- Write equations in human-readable form first
- Then provide LaTeX format
- Use $$...$$ for display equations, $...$ for inline
- No newlines around $$ delimiters
- Include units and dimensions

3. Key Principles:
- List fundamental principles involved
- Explain relationships between variables
- Include relevant theorems or formulas

4. Example:
- Provide a practical, step-by-step example
- Include numerical values
- Show complete solution process

5. Applications:
- List 2-3 practical applications
- Include real-world examples
- Mention technological uses

Keep responses clear and engaging. Use analogies when helpful.`
                            },
                            { role: "user", content: query }
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

                const fallbackSolution = fallbackResponse.data.choices[0].message.content;
                const normalizedFallback = normalizeLatexDelimiters(fallbackSolution);

                // Store fallback response in MongoDB with explicit subject normalization
                try {
                    const normalizedSubject = normalizeSubject("mathematics");
                    console.log('Storing fallback response with normalized subject:', normalizedSubject);
                    
                    // Create the query object according to the schema
                    const queryObject = {
                        query,
                        solution: normalizedFallback,
                        subject: normalizedSubject,
                        createdAt: new Date()
                    };

                    // Update user document with the fallback query
                    const updatedUser = await User.findByIdAndUpdate(
                        req.user.id,
                        {
                            $push: {
                                queries: queryObject
                            }
                        },
                        { 
                            new: true, 
                            runValidators: true,
                            upsert: false
                        }
                    );

                    if (!updatedUser) {
                        console.error('Failed to update user document with fallback response');
                    } else {
                        // Verify the fallback query was stored
                        const storedQuery = updatedUser.queries[updatedUser.queries.length - 1];
                        console.log('Stored fallback query details:', {
                            subject: storedQuery.subject,
                            query: storedQuery.query.substring(0, 50) + '...',
                            createdAt: storedQuery.createdAt
                        });
                        console.log('Successfully stored fallback response in MongoDB');
                    }
                } catch (dbError) {
                    console.error('Database update error for fallback:', dbError);
                }
                
                res.json({ 
                    response: normalizedFallback,
                    warning: "RAG processing failed, using direct response"
                });
            } catch (fallbackError) {
                console.error('Fallback response error:', {
                    error: fallbackError.message,
                    stack: fallbackError.stack
                });
                
                // Final fallback with minimal response
                res.json({
                    response: "I apologize, but I'm having trouble processing your mathematics query at the moment. Please try again in a moment.",
                    error: "Processing failed",
                    details: fallbackError.message
                });
            }
        }
    } catch (error) {
        console.error('Mathematics endpoint error:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user
        });
        
        res.status(500).json({ 
            error: "Mathematics processing failed",
            details: error.message,
            type: error.name
        });
    }
});

// Update the chemistry endpoint with better response formatting
app.post("/chemistry", verifyToken, async (req, res) => {
    try {
        console.log('Chemistry endpoint called with body:', req.body);
        
        const { query } = req.body;
        if (!query) {
            console.error('Missing query parameter in request');
            return res.status(400).json({ 
                error: "Missing query parameter",
                details: "The request body must contain a 'query' field"
            });
        }

        console.log('Processing chemistry query:', query);
        console.log('User ID:', req.user.id);

        // Validate user exists
        const user = await User.findById(req.user.id);
        if (!user) {
            console.error('User not found:', req.user.id);
            return res.status(404).json({ 
                error: "User not found",
                details: `No user found with ID: ${req.user.id}`
            });
        }

        try {
            const response = await handleQueryWithRAG(query, "chemistry", req.user.id);
            console.log('Successfully generated response');
            
            const normalizedResponse = normalizeLatexDelimiters(response);
            console.log('Response normalized successfully');
            
            res.json({ response: normalizedResponse });
        } catch (ragError) {
            console.error('RAG processing error:', {
                error: ragError.message,
                stack: ragError.stack,
                query: query
            });
            
            // Enhanced fallback response with better structure
            console.log('Attempting fallback response without RAG');
            const fallbackResponse = await axios.post(
                GROQ_API_URL,
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert chemistry tutor. Structure your responses in the following format:

1. Definition/Overview:
- Start with a clear, concise definition
- Use simple language first, then technical terms
- Include key characteristics

2. Mechanism:
- Break down the process step by step
- Use bullet points for clarity
- Include both text and equations
- Write equations in human-readable form first, then LaTeX
- Use $$...$$ for display equations, $...$ for inline
- No newlines around $$ delimiters

3. Key Features:
- List important characteristics
- Include rate-determining factors
- Mention stereochemistry if relevant

4. Example:
- Provide a practical, real-world example
- Include the complete reaction
- Explain the conditions and outcome

5. Common Applications:
- List 2-3 practical uses
- Include industrial or laboratory applications

Keep responses clear and engaging. Use analogies when helpful.`
                        },
                        { role: "user", content: query }
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

            const fallbackSolution = fallbackResponse.data.choices[0].message.content;
            const normalizedFallback = normalizeLatexDelimiters(fallbackSolution);
            
            res.json({ 
                response: normalizedFallback,
                warning: "RAG processing failed, using direct response"
            });
        }
    } catch (error) {
        console.error('Chemistry endpoint error:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user
        });
        
        res.status(500).json({ 
            error: "Chemistry processing failed",
            details: error.message,
            type: error.name
        });
    }
});

// --- Simple Flowchart Generation Endpoint ---
app.post("/generate-flowchart", async (req, res) => {
  try {
    const { subject, content } = req.body;

    if (!subject || !content) {
      return res
        .status(400)
        .json({ error: "Subject and content are required" });
    }

    const systemPrompt = `You are a flowchart expert. Always respond in strict JSON format with the following two keys:

"mermaid": This must contain only valid and compilable Mermaid.js code for a flowchart. Use appropriate directional flow (TD or LR). Do not wrap in Markdown or add comments.

"description": This must contain a natural language explanation of what the flowchart represents, describing the flow of logic clearly and concisely.

Do not include any other text, commentary, or formatting outside the JSON. Your entire output must look like this:

{
"mermaid": "flowchart TD\nA[Start] --> B[Process] --> C[End]",
"description": "This flowchart represents a simple linear process starting from 'Start', moving to 'Process', and ending at 'End'."
}`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate a mermaid code for generating structured flowchart for this ${subject} content:\n\n${content}`,
          },
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

    const responseText = response.data.choices[0].message.content;
    // console.log("Raw Response:", responseText);

    // Fix: Safely parse JSON with multiline Mermaid code
    let flowchartData;
    try {
      // Replace newlines inside the "mermaid" value with \n for JSON parsing
      const mermaidMatch = responseText.match(
        /"mermaid"\s*:\s*"([\s\S]*?)"\s*,/
      );
      if (mermaidMatch) {
        const mermaidOriginal = mermaidMatch[1];
        const mermaidEscaped = mermaidOriginal.replace(/\r?\n/g, "\\n");
        // Replace only the Mermaid value in the JSON string
        const safeJson = responseText.replace(mermaidOriginal, mermaidEscaped);
        flowchartData = JSON.parse(safeJson);
        // Restore the original Mermaid code (with real newlines) for the response
        flowchartData.mermaid = mermaidOriginal;
      } else {
        // Fallback: try to parse as-is
        flowchartData = JSON.parse(responseText);
      }
    } catch (error) {
      console.error("Flowchart generation error:", error);
      return res.status(500).json({ error: "Failed to generate flowchart" });
    }

    // Extract Mermaid code and description from the response
    const mermaidCode = flowchartData.mermaid;
    const description = flowchartData.description;

    // Log the Mermaid code and description for debugging
    console.log("Mermaid Code:", mermaidCode);
    console.log("Description:", description);

    // Send the structured data as a JSON response
    res.json({
      structuredData: {
        mermaid: mermaidCode,
        description: description,
      },
    });
  } catch (error) {
    console.error("Flowchart generation error:", error);
    res.status(500).json({ error: "Failed to generate flowchart" });
  }
});

function generateAsciiFlowchart(data) {
  let ascii = `\n${data.title}\n`;
  ascii += "=".repeat(data.title.length) + "\n\n";

  // Generate nodes
  data.nodes.forEach((node) => {
    let nodeBox = "";
    switch (node.type) {
      case "decision":
        nodeBox =
          `  ${node.id}  \n` +
          ` /     \\ \n` +
          `| ${node.label.padEnd(20)} |\n` +
          ` \\     / \n`;
        break;
      case "start/end":
        nodeBox =
          `  ${node.id}  \n` +
          `┌${"─".repeat(22)}┐\n` +
          `│ ${node.label.padEnd(20)} │\n` +
          `└${"─".repeat(22)}┘\n`;
        break;
      default:
        nodeBox =
          `  ${node.id}  \n` +
          `┌${"─".repeat(22)}┐\n` +
          `│ ${node.label.padEnd(20)} │\n` +
          `└${"─".repeat(22)}┘\n`;
    }
    ascii += nodeBox + "\n";
  });

  // Generate connections
  ascii += "\nConnections:\n";
  data.connections.forEach((conn) => {
    ascii += `${conn.from} --> ${conn.to}`;
    if (conn.label) {
      ascii += ` : ${conn.label}`;
    }
    ascii += "\n";
  });

  return ascii;
}

// --- Flowchart Visualization Endpoint ---
app.post("/visualize-flowchart", async (req, res) => {
  try {
    const { structuredData } = req.body;

    if (!structuredData) {
      return res.status(400).json({ error: "Structured data is required" });
    }

    // Generate HTML for the flowchart
    const html = generateFlowchartHTML(structuredData);

    res.send(html);
  } catch (error) {
    console.error("Flowchart visualization error:", error);
    res.status(500).json({ error: "Failed to visualize flowchart" });
  }
});

function generateFlowchartHTML(data) {
  const nodeStyles = {
    start: "background-color: #4CAF50; color: white;",
    end: "background-color: #f44336; color: white;",
    process: "background-color: #2196F3; color: white;",
    decision: "background-color: #FF9800; color: white;",
  };

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${data.title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background-color: #f5f5f5;
            }
            .flowchart {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                padding: 20px;
            }
            .node {
                padding: 10px 20px;
                border-radius: 5px;
                text-align: center;
                min-width: 200px;
                position: relative;
            }
            .decision {
                clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                padding: 30px;
                min-width: 150px;
                min-height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .connection {
                position: relative;
                width: 2px;
                background-color: #666;
                margin: 0 auto;
            }
            .connection-label {
                position: absolute;
                background-color: white;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 12px;
                white-space: nowrap;
            }
            .title {
                text-align: center;
                color: #333;
                margin-bottom: 30px;
            }
        </style>
    </head>
    <body>
        <h1 class="title">${data.title}</h1>
        <div class="flowchart">
  `;

  // Create nodes
  data.nodes.forEach((node) => {
    const style = nodeStyles[node.type] || nodeStyles["process"];
    const nodeClass = node.type === "decision" ? "node decision" : "node";
    html += `
      <div class="${nodeClass}" style="${style}">
        ${node.label}
      </div>
    `;
  });

  // Create connections
  data.connections.forEach((conn) => {
    html += `
      <div class="connection">
        ${conn.label ? `<div class="connection-label">${conn.label}</div>` : ""}
      </div>
    `;
  });

  html += `
        </div>
    </body>
    </html>
  `;

  return html;
}
// --- Personalized Assessment Endpoints ---

// Fetch recent queries for a subject
app.get("/api/recent-queries/:subject", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subject = normalizeSubject(req.params.subject.toLowerCase());
    console.log('Fetching recent queries for subject:', subject);
    
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const minQueryLength = 3; // Minimum length for a query to be considered non-generic
    const genericGreetings = ["hi", "hello", "hey", "heya", "hii", "yo", "yeah","hola"]; // Common generic greetings

    const recentQueries = user.queries
      .filter(
        (q) =>
          q.subject === subject &&
          q.query.trim().length >= minQueryLength &&
          !genericGreetings.includes(q.query.trim().toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt) // Sort by most recent
      .slice(0, 15); // Get the last 15 queries

    console.log(`Found ${recentQueries.length} recent queries for subject ${subject}`);

    res.json({
      queries: recentQueries.map((q) => ({
        query: q.query,
        createdAt: q.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching recent queries:", error);
    res.status(500).json({ message: "Failed to fetch recent queries" });
  }
});

// Generate a personalized quiz
app.post("/api/generate-personalized-quiz", verifyToken, async (req, res) => {
  try {
    const { subject, queries } = req.body;

    if (!subject || !queries || queries.length === 0) {
      return res.status(400).json({
        message: "Subject and recent queries are required.",
        quiz: { questions: [] } // Return empty questions array
      });
    }

    // Extract just the query text for the Groq API prompt
    const queryTexts = queries.map((q) => q.query);
    
    // Log the queries being used for debugging
    console.log(`Generating quiz for ${subject} with ${queryTexts.length} queries:`, queryTexts);

    const systemPrompt = `You are an expert quiz generator. Create a personalized quiz based on the following recent learning topics in ${subject}.
    The quiz should consist of 5 multiple-choice questions.
    Each question must have 4 options (A, B, C, D).
    Clearly indicate the correct answer for each question.
    Provide a detailed explanation for each question that explains why the correct answer is right and why the other options are wrong.
    Ensure all mathematical and scientific expressions are in proper LaTeX format (e.g., $E=mc^2$, $$\sum_{i=1}^n x_i$$).
    The output must be a valid JSON object with a single key "quiz", which is an array of question objects.
    Each question object must have the following structure:
    {
      "id": "q1",
      "question": "Question text with LaTeX?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why A is correct and why B, C, D are incorrect. Include relevant formulas and concepts."
    }
    Do not include any other text, commentary, or formatting outside this JSON structure.

    Recent learning topics:
    ${queryTexts.join("\n- ")}`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a 5-question multiple-choice quiz on ${subject} based on these topics: ${queryTexts.join(
              ", "
            )}`,
          },
        ],
        temperature: 0.5, // Slightly higher temperature for more varied questions
        response_format: { type: "json_object" }, // Ensure JSON output
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let quizData = response.data.choices[0].message.content;
    console.log("Raw quiz data from API:", quizData);

    // Attempt to parse the JSON content
    try {
      const parsedQuiz = JSON.parse(quizData);
      if (!parsedQuiz.quiz || !Array.isArray(parsedQuiz.quiz) || parsedQuiz.quiz.length === 0) {
        console.log("Quiz data is empty or not in expected format:", quizData);
        // Return a valid structure with empty questions instead of throwing error
        return res.json({ quiz: { questions: [] } });
      }
      
      // Transform the quiz data to match frontend expectations
      const transformedQuestions = parsedQuiz.quiz.map((q) => ({
        id: q.id,
        text: normalizeLatexDelimiters(q.question),
        options: [
          normalizeLatexDelimiters(q.options.A),
          normalizeLatexDelimiters(q.options.B),
          normalizeLatexDelimiters(q.options.C),
          normalizeLatexDelimiters(q.options.D)
        ],
        correctAnswer: q.correctAnswer,
        explanation: normalizeLatexDelimiters(q.explanation || "No explanation provided.")
      }));
      
      res.json({ quiz: { questions: transformedQuestions } });
    } catch (parseError) {
      console.error("Error parsing quiz JSON from API:", parseError);
      console.error("Problematic JSON string:", quizData);
      return res.status(500).json({
        message:
          "Failed to generate quiz due to an issue with the quiz data format from the AI.",
      });
    }
  } catch (error) {
    console.error(
      "Error generating personalized quiz:",
      error.response ? error.response.data : error.message
    );
    // Return a valid structure with empty questions
    res.json({ quiz: { questions: [] } });
  }
});

// Add this function near the top of the file, after imports
const calculateRatingChange = (currentRating, score, previousScores) => {
  // K-factor determines how much the rating can change
  const K = 32;
  
  // Calculate expected score based on current rating
  // Higher rating means higher expected score
  const expectedScore = 0.5 + (currentRating - 1000) / 2000;
  
  // Calculate actual score (normalized to 0-1)
  const actualScore = score / 100;
  
  // Calculate rating change
  let ratingChange = Math.round(K * (actualScore - expectedScore));
  
  // Adjust rating change based on consistency
  if (previousScores.length > 0) {
    const averagePreviousScore = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
    const scoreDifference = Math.abs(score - averagePreviousScore);
    
    // If score is very different from average, reduce rating change
    if (scoreDifference > 30) {
      ratingChange *= 0.8;
    }
  }
  
  return Math.round(ratingChange);
};

// Submit a personalized quiz
app.post("/api/submit-personalized-quiz", verifyToken, async (req, res) => {
  try {
    const { subject, answers, quiz } = req.body;
    const userId = req.user.id;

    // Add detailed request validation logging
    console.log("Quiz submission request:", {
      subject,
      answersCount: answers ? Object.keys(answers).length : 0,
      quizLength: quiz ? quiz.length : 0,
      userId
    });

    if (!subject || !answers || !quiz || !Array.isArray(quiz)) {
      console.error("Invalid quiz submission data:", {
        hasSubject: !!subject,
        hasAnswers: !!answers,
        hasQuiz: !!quiz,
        isQuizArray: Array.isArray(quiz)
      });
      return res.status(400).json({ 
        message: "Invalid quiz submission data",
        details: {
          hasSubject: !!subject,
          hasAnswers: !!answers,
          hasQuiz: !!quiz,
          isQuizArray: Array.isArray(quiz)
        }
      });
    }

    // Validate subject
    const validSubjects = ["physics", "chemistry", "mathematics"];
    const normalizedSubject = subject.toLowerCase();
    if (!validSubjects.includes(normalizedSubject)) {
      return res.status(400).json({
        message: "Invalid subject",
        details: {
          provided: subject,
          valid: validSubjects
        }
      });
    }

    let score = 0;
    const questionResults = quiz.map((question) => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) {
        score++;
      }
      return {
        questionId: question.id,
        questionText: question.text,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        options: question.options,
        explanation: question.explanation || "No explanation available for this question."
      };
    });

    const percentageScore = (score / quiz.length) * 100;

    // Get user and calculate rating changes
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize rating if it doesn't exist
    if (!user.rating) {
      user.rating = {
        current: 1000,
        history: [],
        subjectRatings: {
          physics: 1000,
          chemistry: 1000,
          mathematics: 1000
        }
      };
    }

    // Get previous scores for this subject
    const previousScores = user.quizResults
      .filter(q => q.subject === normalizedSubject)
      .slice(-5) // Get last 5 scores
      .map(q => q.score);

    // Calculate rating changes
    const currentRating = user.rating.current;
    const subjectRating = user.rating.subjectRatings[normalizedSubject];
    
    const overallRatingChange = calculateRatingChange(currentRating, percentageScore, previousScores);
    const subjectRatingChange = calculateRatingChange(subjectRating, percentageScore, previousScores);

    // Update ratings
    const newOverallRating = Math.max(100, currentRating + overallRatingChange);
    const newSubjectRating = Math.max(100, subjectRating + subjectRatingChange);

    // Create rating history entry
    const ratingHistoryEntry = {
      previousRating: currentRating,
      newRating: newOverallRating,
      change: overallRatingChange,
      quizId: `quiz_${Date.now()}`,
      subject: normalizedSubject,
      score: percentageScore,
      timestamp: new Date()
    };

    // Update user's ratings
    user.rating.current = newOverallRating;
    user.rating.subjectRatings[normalizedSubject] = newSubjectRating;
    user.rating.history.push(ratingHistoryEntry);

    // Keep only last 20 rating history entries
    if (user.rating.history.length > 20) {
      user.rating.history = user.rating.history.slice(-20);
    }

    // Generate feedback using Groq API
    const feedbackPrompt = `The user has completed a quiz on ${normalizedSubject} with a score of ${percentageScore}%.
    Provide constructive feedback and suggest areas for improvement based on the following topics they were quizzed on:
    ${quiz.map((q) => `- ${q.text.substring(0, 100)}...`).join("\n")}
    Keep the feedback concise, encouraging, and focused on learning. Suggest 2-3 specific topics or concepts to review if the score is below 70%.
    If the score is 70% or above, congratulate them and suggest one advanced topic or real-world application related to the quiz content.`;

    const feedbackResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful academic advisor." },
          { role: "user", content: feedbackPrompt },
        ],
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const feedbackText = normalizeLatexDelimiters(
      feedbackResponse.data.choices[0].message.content
    );

    // Create quiz result object
    const quizResult = {
      quizId: `quiz_${Date.now()}`,
      subject: normalizedSubject,
      score: percentageScore,
      totalQuestions: quiz.length,
      correctAnswers: score,
      questions: questionResults.map(q => ({
        ...q,
        explanation: q.explanation || "No explanation available for this question."
      })),
      feedback: feedbackText,
      timestamp: new Date()
    };

    // Initialize arrays if they don't exist
    if (!user.quizResults) {
      user.quizResults = [];
    }

    // Add quiz result
    user.quizResults.push(quizResult);

    // Initialize subjectProgress if it doesn't exist
    if (!user.subjectProgress) {
      user.subjectProgress = {
        physics: { subject: "physics", totalQuizzes: 0, averageScore: 0, highestScore: 0, lastQuizDate: new Date(), progressHistory: [] },
        chemistry: { subject: "chemistry", totalQuizzes: 0, averageScore: 0, highestScore: 0, lastQuizDate: new Date(), progressHistory: [] },
        mathematics: { subject: "mathematics", totalQuizzes: 0, averageScore: 0, highestScore: 0, lastQuizDate: new Date(), progressHistory: [] }
      };
    }

    // Update subject progress
    const subjectProgress = user.subjectProgress[normalizedSubject];
    if (!subjectProgress) {
      console.error("Subject progress not initialized for:", normalizedSubject);
      return res.status(500).json({ 
        message: "Subject progress not initialized",
        details: { subject: normalizedSubject }
      });
    }

    // Update progress statistics
    subjectProgress.totalQuizzes += 1;
    subjectProgress.lastQuizDate = new Date();
    
    // Calculate new average score
    const totalScore = (subjectProgress.averageScore * (subjectProgress.totalQuizzes - 1)) + percentageScore;
    subjectProgress.averageScore = totalScore / subjectProgress.totalQuizzes;
    
    // Update highest score if needed
    if (percentageScore > subjectProgress.highestScore) {
      subjectProgress.highestScore = percentageScore;
    }

    // Initialize progressHistory if it doesn't exist
    if (!subjectProgress.progressHistory) {
      subjectProgress.progressHistory = [];
    }

    // Add to progress history
    subjectProgress.progressHistory.push({
      date: new Date(),
      score: percentageScore,
      quizCount: subjectProgress.totalQuizzes
    });

    // Keep only last 10 progress history entries
    if (subjectProgress.progressHistory.length > 10) {
      subjectProgress.progressHistory = subjectProgress.progressHistory.slice(-10);
    }

    try {
      // Use findByIdAndUpdate instead of save to avoid validation issues
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $push: { quizResults: quizResult },
          $set: {
            [`subjectProgress.${normalizedSubject}`]: subjectProgress,
            rating: user.rating
          }
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new Error("Failed to update user document");
      }

      console.log("Quiz results saved successfully for user:", userId);
    } catch (saveError) {
      console.error("Error saving quiz results:", saveError);
      return res.status(500).json({ 
        message: "Failed to save quiz results",
        details: saveError.message,
        stack: saveError.stack
      });
    }

    res.json({
      success: true,
      score: percentageScore,
      questionResults: questionResults.map(q => ({
        ...q,
        explanation: q.explanation || "No explanation available for this question."
      })),
      feedback: feedbackText,
      progress: {
        totalQuizzes: subjectProgress.totalQuizzes,
        averageScore: subjectProgress.averageScore,
        highestScore: subjectProgress.highestScore,
        progressHistory: subjectProgress.progressHistory
      },
      rating: {
        overall: {
          current: newOverallRating,
          change: overallRatingChange
        },
        subject: {
          current: newSubjectRating,
          change: subjectRatingChange
        }
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      message: "Failed to submit quiz",
      details: error.message,
      type: error.name
    });
  }
});

// Add new endpoint to get progress data for graphs
app.get("/api/progress/:subject", verifyToken, async (req, res) => {
  try {
    const { subject } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectKey = subject.toLowerCase();
    const progress = user.subjectProgress[subjectKey];

    if (!progress) {
      return res.status(404).json({ message: "Progress data not found for this subject" });
    }

    res.json({
      totalQuizzes: progress.totalQuizzes,
      averageScore: progress.averageScore,
      highestScore: progress.highestScore,
      progressHistory: progress.progressHistory,
      recentQuizzes: user.quizResults
        .filter(quiz => quiz.subject === subjectKey)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ message: "Failed to fetch progress data" });
  }
});

// --- Web Crawling Endpoint ---
app.post("/api/web-search", verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Get search results from Tavily
    const searchResults = await tavilyClient.search(query, {
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: true,
      max_results: 5
    });

    // Format and truncate search results to reduce payload size
    const formattedResults = searchResults.results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.content.substring(0, 500) // Limit content length
    }));

    // Use Groq to elaborate on the search results
    const groqResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a physics expert. Analyze and elaborate on the provided web search results.
- Focus on physics concepts and principles
- Include relevant equations in LaTeX format
- Add real-world applications
- Highlight key findings
- Maintain academic accuracy
- Use bullet points for clarity
- Include unit analysis where relevant

Format your response as:
**Key Findings:**
[bullet points of main findings]

**Physics Concepts:**
[relevant physics principles]

**Equations:**
[LaTeX equations]

**Applications:**
[real-world examples]

**Sources:**
[list of sources used]`
          },
          {
            role: "user",
            content: `Please analyze and elaborate on these search results for the query "${query}":\n\n${JSON.stringify({
              query: query,
              results: formattedResults
            }, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const elaboratedResponse = groqResponse.data.choices[0].message.content;

    // Store the search query and results in the user's database
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        webSearches: {
          query,
          results: {
            tavilyResults: searchResults,
            elaboratedResponse: elaboratedResponse
          },
          timestamp: new Date()
        }
      }
    });

    res.json({
      success: true,
      data: {
        answer: elaboratedResponse,
        sources: searchResults.sources,
        rawResults: searchResults
      }
    });
  } catch (error) {
    console.error("Web search error:", error);
    res.status(500).json({ 
      error: "Web search failed",
      details: error.message 
    });
  }
});

// Profile photo upload endpoint
app.post('/api/users/profile-photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if Cloudinary credentials are configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials not configured');
      return res.status(500).json({ 
        message: 'Server configuration error',
        details: 'Cloudinary credentials not properly configured'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old photo from Cloudinary if exists
    if (user.profilePhoto && user.profilePhoto.publicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePhoto.publicId);
      } catch (deleteError) {
        console.error('Error deleting old photo:', deleteError);
        // Continue with the update even if deletion fails
      }
    }

    // Update user's profile photo
    user.profilePhoto = {
      url: req.file.path,
      publicId: req.file.filename
    };

    // Normalize subject names in queries
    if (user.queries) {
      user.queries = user.queries.map(query => ({
        ...query,
        subject: normalizeSubject(query.subject)
      }));
    }

    await user.save();

    res.json({
      message: 'Profile photo updated successfully',
      profilePhoto: user.profilePhoto
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ 
      message: 'Error uploading profile photo',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add a new endpoint to check RAG effectiveness
app.get("/api/rag-stats", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Analyze recent queries
        const recentQueries = user.queries.slice(-10); // Get last 10 queries
        const stats = {
            totalQueries: recentQueries.length,
            queriesWithRAG: recentQueries.filter(q => q.ragContext).length,
            bySubject: {}
        };

        // Group by subject
        recentQueries.forEach(query => {
            const subject = query.subject;
            if (!stats.bySubject[subject]) {
                stats.bySubject[subject] = {
                    total: 0,
                    withRAG: 0
                };
            }
            stats.bySubject[subject].total++;
            if (query.ragContext) {
                stats.bySubject[subject].withRAG++;
            }
        });

        res.json({
            stats,
            recentQueries: recentQueries.map(q => ({
                query: q.query,
                subject: q.subject,
                hasRAGContext: !!q.ragContext,
                createdAt: q.createdAt
            }))
        });
    } catch (error) {
        console.error("Error fetching RAG stats:", error);
        res.status(500).json({ error: "Failed to fetch RAG statistics" });
    }
});

// Add new endpoint to analyze RAG effectiveness
app.get("/api/rag-analysis", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get recent queries with RAG metrics
        const recentQueries = user.queries.slice(-20); // Analyze last 20 queries
        
        const analysis = {
            totalQueries: recentQueries.length,
            queriesWithRAG: recentQueries.filter(q => q.ragContext).length,
            averageContextCount: 0,
            qualityTrends: {
                equations: 0,
                bulletPoints: 0,
                examples: 0
            },
            bySubject: {}
        };

        // Calculate metrics
        let totalContextCount = 0;
        recentQueries.forEach(query => {
            if (query.metrics) {
                totalContextCount += query.metrics.contextCount;
                
                // Update quality trends
                if (query.metrics.qualityIndicators) {
                    analysis.qualityTrends.equations += query.metrics.qualityIndicators.hasEquations ? 1 : 0;
                    analysis.qualityTrends.bulletPoints += query.metrics.qualityIndicators.hasBulletPoints ? 1 : 0;
                    analysis.qualityTrends.examples += query.metrics.qualityIndicators.hasExamples ? 1 : 0;
                }

                // Group by subject
                const subject = query.subject;
                if (!analysis.bySubject[subject]) {
                    analysis.bySubject[subject] = {
                        total: 0,
                        withRAG: 0,
                        averageContextCount: 0
                    };
                }
                analysis.bySubject[subject].total++;
                if (query.ragContext) {
                    analysis.bySubject[subject].withRAG++;
                }
            }
        });

        // Calculate averages
        analysis.averageContextCount = totalContextCount / recentQueries.length;
        analysis.qualityTrends.equations = (analysis.qualityTrends.equations / recentQueries.length) * 100;
        analysis.qualityTrends.bulletPoints = (analysis.qualityTrends.bulletPoints / recentQueries.length) * 100;
        analysis.qualityTrends.examples = (analysis.qualityTrends.examples / recentQueries.length) * 100;

        // Calculate subject-specific averages
        Object.keys(analysis.bySubject).forEach(subject => {
            const subjectData = analysis.bySubject[subject];
            subjectData.averageContextCount = subjectData.withRAG / subjectData.total;
        });

        res.json({
            analysis,
            recentQueries: recentQueries.map(q => ({
                query: q.query,
                subject: q.subject,
                hasRAGContext: !!q.ragContext,
                contextCount: q.metrics?.contextCount || 0,
                qualityIndicators: q.metrics?.qualityIndicators || {},
                createdAt: q.createdAt
            }))
        });
    } catch (error) {
        console.error("Error analyzing RAG effectiveness:", error);
        res.status(500).json({ error: "Failed to analyze RAG effectiveness" });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Physics agent running at http://localhost:${PORT}`);
});

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });
