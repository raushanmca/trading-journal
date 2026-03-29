import { useState } from "react";
import axios from "axios";
import { getAuthHeaders } from "../utils/auth";

const BASE_URL = import.meta.env.VITE_API_URL;

interface JournalEntry {
  date: string;
  instrument: string;
  pnl: number;
  rating: number;
  mistakes: string[];
}

export default function AIJournalChatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant" as const,
      content:
        "Hi! I'm your AI Journal Assistant.\n\nDescribe your today's trade in simple English. I'll extract the details and help you save it.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedEntry, setParsedEntry] = useState<JournalEntry | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content: userMessage },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate AI parsing (Replace with real LLM call later)
      const response = await simulateAIParse(userMessage);

      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: response.message },
      ]);

      if (response.parsed) {
        setParsedEntry(response.parsed);
        setShowConfirm(true);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content:
            "Sorry, I couldn't process that. Could you please describe your trade again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateAIParse = async (text: string) => {
    const lower = text.toLowerCase();

    const instrument =
      text
        .match(/(NIFTY|BANKNIFTY|RELIANCE|HDFCBANK|TCS|SBIN|INFY)/i)?.[0]
        ?.toUpperCase() || "NIFTY";
    const pnlMatch = text.match(/(\-?\d+)/);
    const pnl = pnlMatch ? parseInt(pnlMatch[0]) : 0;

    let rating = 3;
    if (lower.includes("excellent") || lower.includes("perfect")) rating = 5;
    else if (lower.includes("good")) rating = 4;
    else if (lower.includes("poor") || lower.includes("bad")) rating = 2;

    const lessons: string[] = [];
    if (lower.includes("patience") || lower.includes("wait"))
      lessons.push("Patience - Wait for Setup");
    if (lower.includes("risk")) lessons.push("Follow Risk Management");
    if (lower.includes("over") || lower.includes("fomo"))
      lessons.push("Over Trading");
    if (lower.includes("revenge")) lessons.push("Revenge Trading");
    if (lower.includes("disciplined")) lessons.push("Disciplined Entry");

    const entry: JournalEntry = {
      date: new Date().toISOString().split("T")[0],
      instrument,
      pnl,
      rating,
      mistakes: lessons.length ? lessons : ["Disciplined Entry"],
    };

    const message =
      `I've analyzed your trade:\n\n` +
      `• Instrument: **${entry.instrument}**\n` +
      `• PnL: **₹${entry.pnl.toLocaleString()}**\n` +
      `• Rating: **${entry.rating}/5**\n` +
      `• Key Points: ${entry.mistakes.join(", ")}\n\n` +
      `Is this correct? Reply **Yes** to save it, or tell me what to change.`;

    return { message, parsed: entry };
  };

  const confirmAndSave = async () => {
    if (!parsedEntry) return;

    const authHeaders = getAuthHeaders();

    if (!authHeaders.Authorization) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "Please sign in before saving journal entries.",
        },
      ]);
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/journal`,
        {
          ...parsedEntry,
          mistakes: parsedEntry.mistakes,
        },
        {
          headers: authHeaders,
        },
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "✅ Journal entry saved successfully!",
        },
      ]);

      setParsedEntry(null);
      setShowConfirm(false);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "❌ Failed to save entry. Please try again or sign in again.",
        },
      ]);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "520px",
        width: "100%",
      }}
    >
      <h3>AI Journal Assistant</h3>
      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
        Describe your trade in natural English — I'll structure it for you
      </p>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "10px",
          marginBottom: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "14px",
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: msg.role === "user" ? "#2563eb" : "#ffffff",
                color: msg.role === "user" ? "#ffffff" : "#1e293b",
                boxShadow:
                  msg.role === "assistant"
                    ? "0 1px 3px rgba(0,0,0,0.05)"
                    : "none",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ padding: "12px 16px", color: "#64748b" }}>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="E.g., Today I traded NIFTY, made 1450 profit, followed my setup but had some FOMO..."
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            fontSize: "14px",
            outline: "none",
          }}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: "0 24px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Send
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && parsedEntry && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "28px",
            borderRadius: "14px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxWidth: "420px",
            width: "90%",
          }}
        >
          <h4 style={{ margin: "0 0 16px 0" }}>Confirm Journal Entry</h4>

          <div
            style={{
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            <strong>Instrument:</strong> {parsedEntry.instrument}
            <br />
            <strong>PnL:</strong> ₹{parsedEntry.pnl}
            <br />
            <strong>Rating:</strong> {parsedEntry.rating}/5
            <br />
            <strong>Lessons:</strong> {parsedEntry.mistakes.join(", ")}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={confirmAndSave}
              style={{
                flex: 1,
                padding: "12px",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Yes, Save Entry
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                flex: 1,
                padding: "12px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel / Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
