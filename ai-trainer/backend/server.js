import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ BUG FIX: Correct model name (was "gemini-3-flash-preview" which doesn't exist)
const MODEL_NAME = "gemini-1.5-flash";

// ✅ Clean and format AI response
function cleanResponse(text) {
  let cleaned = text
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\");

  // Remove markdown code fences but keep content
  cleaned = cleaned.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1").trim();

  // Remove triple asterisks, keep double/single for bold/italic
  cleaned = cleaned.replace(/\*\*\*/g, "");

  // Remove excessive underscores
  cleaned = cleaned.replace(/___/g, "").replace(/__/g, "");

  // Normalize blank lines — max 1 blank line between sections
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

// ✅ Helper: get model
function getModel() {
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    model: MODEL_NAME,
    apiKey: process.env.GEMINI_API_KEY ? "✓ Present" : "✗ Missing",
  });
});

// /generate — explanation + example + practice questions
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

    console.log("[/generate]", prompt);
    const model = getModel();

    const result = await model.generateContent(
      `You are an AI Trainer Assistant. Be clear, structured, and educational.

For the topic below, provide:
## 1. Explanation
A clear explanation of the concept.

## 2. Example
A concrete, real-world example.

## 3. Practice Questions
Two practice questions to test understanding.

Topic: ${prompt}`
    );

    let text = result?.response?.text?.() || "No response from AI";
    text = cleanResponse(text);

    res.json({ output: text });
  } catch (error) {
    console.error("[/generate] ERROR:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

// /notes — structured study notes
app.post("/notes", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

    console.log("[/notes]", prompt);
    const model = getModel();

    const result = await model.generateContent(
      `You are an AI Trainer Assistant. Generate comprehensive, well-structured study notes.

## Key Concepts
List the essential ideas and definitions.

## Important Points
Bullet-point the critical facts, rules, and details to remember.

## Summary
A brief paragraph summarising everything.

Topic: ${prompt}`
    );

    let text = result?.response?.text?.() || "No response from AI";
    text = cleanResponse(text);

    res.json({ output: text });
  } catch (error) {
    console.error("[/notes] ERROR:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

// /assignments — short answer, essay, practical task
app.post("/assignments", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

    console.log("[/assignments]", prompt);
    const model = getModel();

    const result = await model.generateContent(
      `You are an AI Trainer Assistant. Create a well-structured assignment.

## Short Answer Questions (3)
Three focused questions requiring concise answers.

## Essay Questions (2)
Two deeper questions requiring a full paragraph response.

## Practical Task
One hands-on task or project the student must complete.

Topic: ${prompt}`
    );

    let text = result?.response?.text?.() || "No response from AI";
    text = cleanResponse(text);

    res.json({ output: text });
  } catch (error) {
    console.error("[/assignments] ERROR:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

// /quiz — multiple choice quiz
app.post("/quiz", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

    console.log("[/quiz]", prompt);
    const model = getModel();

    const result = await model.generateContent(
      `You are an AI Trainer Assistant. Generate a multiple-choice quiz in strict JSON format.
Return ONLY a JSON array, no other text, no markdown code fences.

Each object must have:
- "question": string
- "options": array of 4 strings (A, B, C, D)
- "answer": the correct option string (exact match from options)
- "explanation": brief explanation of the correct answer

Generate 5 questions for this topic: ${prompt}`
    );

    let text = result?.response?.text?.() || "[]";
    // Strip any accidental markdown fences
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Failed to parse quiz JSON from AI" });
    }

    res.json({ questions });
  } catch (error) {
    console.error("[/quiz] ERROR:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

// /chat — conversational follow-up (with history)
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    console.log("[/chat]", message);
    const model = getModel();

    // Build chat history for Gemini
    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      generationConfig: { maxOutputTokens: 1024 },
    });

    const result = await chat.sendMessage(
      `You are a helpful AI Trainer Assistant. Answer the student's question clearly and concisely.\n\n${message}`
    );

    let text = result?.response?.text?.() || "No response from AI";
    text = cleanResponse(text);

    res.json({ output: text });
  } catch (error) {
    console.error("[/chat] ERROR:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL_NAME}`);
  console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? "✓ Present" : "✗ MISSING — set GEMINI_API_KEY in .env"}`);
});
