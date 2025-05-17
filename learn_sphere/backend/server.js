import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import { tavily } from '@tavily/core';

// Configuration
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
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


// --- Physics Chatbot ---
const handlePhysicsQuery = async (query, userId) => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Physics tutor. Keep responses concise and clear:
- Write equations in human-readable form first, then LaTeX
- Use $$...$$ for display equations, $...$ for inline
- No newlines around $$ delimiters
- Include units and dimensions
- Give brief, practical examples
- Use bullet points for clarity
- Keep responses under 150 words unless detailed explanation is requested`,
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
    const solution = response.data.choices[0].message.content;

    // Store the query and solution in the user's database
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          queries: {
            query,
            solution,
            subject: "physics"
          }
        }
      });
    }

    return solution;
  } catch (error) {
    console.error("Groq API Error:", error.response?.data);
    throw new Error("Physics processing failed: " + error.message);
  }
};

app.post("/physics", verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }
    const response = await handlePhysicsQuery(query, req.user.id);
    const normalizedResponse = normalizeLatexDelimiters(response);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Mathematics Chatbot ---
app.post("/maths", verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Maths tutor. Keep responses concise and clear:
1. Show 1-2 solution methods (unless more requested)
2. Write equations in human-readable form first, then LaTeX
3. Use $$...$$ for display equations, $...$ for inline
4. No newlines around $$ delimiters
5. Give brief, practical applications
6. Highlight key steps and common errors
7. Keep responses under 150 words unless detailed explanation is requested

Format:
**Problem:** [statement]
**Solution:** [concise steps]
**Application:** [brief example]`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    const solution = response.data.choices[0].message.content;

    // Store the query and solution in the user's database
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        queries: {
          query,
          solution,
          subject: "maths"
        }
      }
    });

    const normalizedResponse = normalizeLatexDelimiters(solution);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: "Math processing failed" });
  }
});

// --- Chemistry Chatbot ---
app.post("/chemistry", verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Chemistry tutor. Keep responses concise and clear:
1. Write chemical formulas in human-readable form first (e.g., "2H2 + O2 → 2H2O")
2. Then show in LaTeX if needed
3. Use $$...$$ for display equations, $...$ for inline
4. No newlines around $$ delimiters
5. Balance equations stepwise but concisely
6. Include brief safety notes
7. Keep responses under 150 words unless detailed explanation is requested

Format:
**Reaction:** [human-readable equation]
**Steps:** [key points]
**Safety:** [brief note]`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    const solution = response.data.choices[0].message.content;

    // Store the query and solution in the user's database
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        queries: {
          query,
          solution,
          subject: "chemistry",
          createdAt: new Date(),
        }
      }
    });

    const normalizedResponse = normalizeLatexDelimiters(solution);
    res.json({ response: normalizedResponse });
  } catch (error) {
    res.status(500).json({ error: "Chemistry processing failed" });
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
    const subject = req.params.subject.toLowerCase();
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const minQueryLength = 3; // Minimum length for a query to be considered non-generic
    const genericGreetings = ["hi", "hello", "hey", "heya", "hii", "yo"]; // Common generic greetings

    const recentQueries = user.queries
      .filter(
        (q) =>
          q.subject === subject &&
          q.query.trim().length >= minQueryLength &&
          !genericGreetings.includes(q.query.trim().toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt) // Sort by most recent
      .slice(0, 15); // Get the last 10-15 queries (adjust as needed, e.g., 10 or 15)

    res.json({
      queries: recentQueries.map((q) => ({
        query: q.query,
        createdAt: q.createdAt,
      })),
    }); // Send only query text and creation time
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
    { "id": "q1", "question": "Question text with LaTeX?", "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}, "correctAnswer": "A", "explanation": "Detailed explanation of why A is correct and why B, C, D are incorrect." }
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
    // console.log("Raw quiz data from API:", quizData);

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
      questions: questionResults,
      feedback: feedbackText,
      timestamp: new Date()
    };

    // Update user's quiz results and progress
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

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
            [`subjectProgress.${normalizedSubject}`]: subjectProgress
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
      questionResults,
      feedback: feedbackText,
      progress: {
        totalQuizzes: subjectProgress.totalQuizzes,
        averageScore: subjectProgress.averageScore,
        highestScore: subjectProgress.highestScore,
        progressHistory: subjectProgress.progressHistory
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
