import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";

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
            content: `Physics tutor. Answer concisely in bullet points or numbered steps.
- Always write all equations in LaTeX.
- Use $$...$$ for display (block) equations, $...$ for inline equations.
- No newlines immediately after/before $$.
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
**Real-world Use:** [application]`,
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
**Industrial Use:** [application]`,
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
          subject: "chemistry"
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
