# AI Trainer — Powered by Google Gemini

A full-stack AI learning platform with Learn, Notes, Assignments, Quiz, and AI Chat modes.

---

## 🐛 Bugs Fixed from Original Code

| Bug | Original | Fixed |
|-----|----------|-------|
| **Wrong model name** | `"gemini-3-flash-preview"` (doesn't exist) | `"gemini-1.5-flash"` ✅ |
| **No frontend** | Backend only | Full React UI added |
| **No quiz** | Missing | Interactive MCQ quiz added |
| **No chat** | Missing | Real-time AI chat with history |
| **No error handling in UI** | Missing | User-friendly error cards |

---

## 📁 Folder Structure

```
ai-trainer/
├── backend/
│   ├── server.js          ← Express + Gemini API (FIXED)
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js         ← All React components
    │   ├── App.css        ← Dark editorial theme
    │   └── index.js
    └── package.json
```

---

## 🚀 Quick Start

### Step 1 — Get a free Gemini API key
Visit: https://aistudio.google.com/app/apikey
(100% free, no credit card needed)

### Step 2 — Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Paste your API key into .env:
# GEMINI_API_KEY=AIza...your_key_here
npm run dev
```

Backend starts at: http://localhost:5000

### Step 3 — Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend starts at: http://localhost:3000

---

## 🔌 API Endpoints

| Method | Endpoint       | Description                         |
|--------|----------------|-------------------------------------|
| GET    | /health        | Check server & API key status       |
| POST   | /generate      | Explanation + Example + Questions   |
| POST   | /notes         | Structured study notes              |
| POST   | /assignments   | Short answer + Essay + Practical    |
| POST   | /quiz          | 5 MCQ questions (JSON)              |
| POST   | /chat          | Conversational AI with history      |

### Request body (all except /chat):
```json
{ "prompt": "JavaScript Promises" }
```

### /chat request body:
```json
{
  "message": "Can you explain async/await?",
  "history": [
    { "role": "user",  "text": "Tell me about Promises" },
    { "role": "model", "text": "Promises are..." }
  ]
}
```

---

## 🎨 Features

- **📚 Learn** — Explanation + Real example + 2 practice questions
- **📝 Notes** — Key concepts, important points, summary
- **✏️ Assignments** — 3 short answer + 2 essay + 1 practical task
- **🧠 Quiz** — 5 interactive MCQ with score + explanations
- **💬 AI Chat** — Conversational tutor with full message history
- **🕓 Recent History** — Sidebar shows last 6 sessions
- **📋 Copy / Print** — Export any output instantly
- **📱 Responsive** — Works on mobile too

---

## 🛠️ Available Gemini Models

| Model | Speed | Quality | Free? |
|-------|-------|---------|-------|
| `gemini-1.5-flash` | Fast ⚡ | Good | ✅ Yes |
| `gemini-1.5-pro`   | Slower | Better | ✅ Yes (limited) |
| `gemini-2.0-flash` | Fast ⚡ | Better | ✅ Yes |

Change `MODEL_NAME` in `server.js` to switch models.
