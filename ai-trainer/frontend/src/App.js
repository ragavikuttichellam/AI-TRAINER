import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5000";

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (let line of lines) {
    // Headers
    if (line.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h1>${line.slice(2)}</h1>`;
    }
    // Bullet list
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      let content = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      html += `<li>${content}</li>`;
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      let content = line.replace(/^\d+\.\s/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      html += `<p class="numbered">${content}</p>`;
    }
    // Empty line
    else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<br/>";
    }
    // Normal paragraph
    else {
      if (inList) { html += "</ul>"; inList = false; }
      let content = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      html += `<p>${content}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

// ─── TABS config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "learn",       label: "Learn",       icon: "📚", endpoint: "/generate" },
  { id: "notes",       label: "Notes",       icon: "📝", endpoint: "/notes" },
  { id: "assignments", label: "Assignments", icon: "✏️",  endpoint: "/assignments" },
  { id: "quiz",        label: "Quiz",        icon: "🧠", endpoint: "/quiz" },
  { id: "chat",        label: "AI Chat",     icon: "💬", endpoint: "/chat" },
];

const PLACEHOLDERS = {
  learn:       "e.g. JavaScript Promises, React hooks, REST APIs...",
  notes:       "e.g. Machine Learning basics, SQL joins...",
  assignments: "e.g. Python OOP, CSS Flexbox, Node.js...",
  quiz:        "e.g. HTML fundamentals, Git commands...",
  chat:        "Ask anything about your topic...",
};

const SUGGESTIONS = ["JavaScript Promises", "React Hooks", "Python OOP", "REST APIs", "CSS Grid", "Node.js", "SQL Joins", "Git & GitHub", "Machine Learning", "Docker Basics"];

// ─── Quiz component ───────────────────────────────────────────────────────────
function QuizView({ questions }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.answer).length
    : 0;

  return (
    <div className="quiz-view">
      {questions.map((q, i) => {
        const chosen   = answers[i];
        const correct  = q.answer;
        const isRight  = chosen === correct;

        return (
          <div key={i} className={`quiz-card ${submitted ? (isRight ? "correct" : chosen ? "wrong" : "unanswered") : ""}`}>
            <p className="quiz-q"><span className="q-num">Q{i + 1}</span> {q.question}</p>
            <div className="quiz-options">
              {q.options.map((opt, j) => {
                let cls = "quiz-opt";
                if (submitted) {
                  if (opt === correct)      cls += " opt-correct";
                  else if (opt === chosen)  cls += " opt-wrong";
                }
                if (!submitted && chosen === opt) cls += " opt-selected";
                return (
                  <button key={j} className={cls} disabled={submitted}
                    onClick={() => setAnswers(a => ({ ...a, [i]: opt }))}>
                    <span className="opt-letter">{String.fromCharCode(65 + j)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <div className="quiz-explain">
                <span>{isRight ? "✅ Correct!" : `❌ Answer: ${correct}`}</span>
                {q.explanation && <p>{q.explanation}</p>}
              </div>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button className="submit-quiz"
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}>
          Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      ) : (
        <div className="quiz-score">
          <span className="score-num">{score}/{questions.length}</span>
          <span className="score-label">{score === questions.length ? "🎉 Perfect!" : score >= questions.length / 2 ? "👍 Good job!" : "📖 Keep studying!"}</span>
          <button className="retry-btn" onClick={() => { setAnswers({}); setSubmitted(false); }}>Retry</button>
        </div>
      )}
    </div>
  );
}

// ─── Chat component ───────────────────────────────────────────────────────────
function ChatView() {
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState([
    { role: "model", text: "👋 Hi! I'm your AI Trainer. Ask me anything about programming, tech concepts, or any topic you're learning!" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, text: m.text }));
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(m => [...m, { role: "model", text: data.output }]);
    } catch (err) {
      setMessages(m => [...m, { role: "model", text: `❌ Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
            <span className="bubble-icon">{msg.role === "user" ? "🧑" : "🤖"}</span>
            <div className="bubble-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
          </div>
        ))}
        {loading && (
          <div className="chat-bubble ai-bubble">
            <span className="bubble-icon">🤖</span>
            <div className="typing-dots"><span/><span/><span/></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask a question... (Enter to send)"
          className="chat-input"
          disabled={loading}
        />
        <button onClick={send} disabled={!input.trim() || loading} className="chat-send">
          {loading ? "⏳" : "Send →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,  setActiveTab]  = useState("learn");
  const [prompt,     setPrompt]     = useState("");
  const [output,     setOutput]     = useState(null);
  const [quizData,   setQuizData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [history,    setHistory]    = useState([]);

  const tab = TABS.find(t => t.id === activeTab);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setOutput(null);
    setQuizData(null);

    try {
      const res = await fetch(`${API}${tab.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (activeTab === "quiz") {
        setQuizData(data.questions);
      } else {
        setOutput(data.output);
        // Keep recent history
        setHistory(h => [{ tab: activeTab, prompt, output: data.output }, ...h].slice(0, 6));
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (id) => {
    setActiveTab(id);
    setOutput(null);
    setQuizData(null);
    setError("");
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output || "");
    alert("Copied to clipboard!");
  };

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🎓</div>
          <div>
            <div className="brand-name">AI Trainer</div>
            <div className="brand-sub">Powered by Gemini</div>
          </div>
        </div>

        <nav className="nav">
          {TABS.map(t => (
            <button key={t.id}
              className={`nav-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => switchTab(t.id)}>
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {history.length > 0 && (
          <div className="recent">
            <p className="recent-title">Recent</p>
            {history.map((h, i) => (
              <button key={i} className="recent-item"
                onClick={() => { switchTab(h.tab); setPrompt(h.prompt); setOutput(h.output); }}>
                <span>{TABS.find(t => t.id === h.tab)?.icon}</span>
                <span className="recent-text">{h.prompt}</span>
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="get-key">
            🔑 Get Free API Key
          </a>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main">
        {/* Header */}
        <header className="main-header">
          <div>
            <h1 className="main-title">{tab.icon} {tab.label}</h1>
            <p className="main-sub">
              {{
                learn:       "Get explanation, example & practice questions",
                notes:       "Generate structured study notes instantly",
                assignments: "Create short answer, essay & practical tasks",
                quiz:        "Test yourself with a multiple-choice quiz",
                chat:        "Chat with your AI tutor in real time",
              }[activeTab]}
            </p>
          </div>
        </header>

        {/* Chat is its own component */}
        {activeTab === "chat" ? (
          <ChatView />
        ) : (
          <>
            {/* Input area */}
            <div className="input-area">
              <div className="input-wrap">
                <input
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generate()}
                  placeholder={PLACEHOLDERS[activeTab]}
                  className="topic-input"
                  disabled={loading}
                />
                <button onClick={generate} disabled={!prompt.trim() || loading} className="gen-btn">
                  {loading ? <span className="btn-spinner" /> : "Generate"}
                </button>
              </div>

              {/* Suggestion chips */}
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="chip" onClick={() => setPrompt(s)}>{s}</button>
                ))}
              </div>
            </div>

            {/* Output area */}
            <div className="output-area">
              {loading && (
                <div className="loading-state">
                  <div className="loading-ring" />
                  <p>Generating {tab.label.toLowerCase()}...</p>
                </div>
              )}

              {error && (
                <div className="error-card">
                  <span className="error-icon">⚠️</span>
                  <div>
                    <strong>Error</strong>
                    <p>{error}</p>
                    <small>Make sure the backend is running: <code>cd backend && npm run dev</code></small>
                  </div>
                </div>
              )}

              {quizData && !loading && (
                <QuizView questions={quizData} />
              )}

              {output && !loading && (
                <div className="output-card">
                  <div className="output-toolbar">
                    <span className="output-tag">{tab.icon} {tab.label}</span>
                    <div className="toolbar-actions">
                      <button onClick={copyOutput} className="toolbar-btn">📋 Copy</button>
                      <button onClick={() => window.print()} className="toolbar-btn">🖨️ Print</button>
                    </div>
                  </div>
                  <div className="output-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(output) }} />
                </div>
              )}

              {!loading && !error && !output && !quizData && (
                <div className="empty-state">
                  <div className="empty-icon">{tab.icon}</div>
                  <h3>Ready to {tab.label}</h3>
                  <p>Enter a topic above and click Generate to get started.</p>
                  <div className="empty-tips">
                    <div className="tip">💡 Be specific — "React useState hook" beats "React"</div>
                    <div className="tip">🎯 Try a suggestion chip above</div>
                    <div className="tip">💬 Use AI Chat for follow-up questions</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
