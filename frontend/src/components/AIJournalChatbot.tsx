import { useState } from "react";
import axios from "axios";
import { getAuthHeaders } from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";

const BASE_URL = getApiBaseUrl();

interface JournalEntry {
  date: string;
  instrument: string;
  pnl: number;
  rating: number;
  mistakes: string[];
}

interface AssistantResponse {
  message: string;
  parsed: JournalEntry;
  source?: string;
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

    const authHeaders = getAuthHeaders();

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content: userMessage },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      if (!authHeaders.Authorization) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: "Please sign in to use the AI journal assistant.",
          },
        ]);
        return;
      }

      const { data } = await axios.post<AssistantResponse>(
        `${BASE_URL}/api/ai/journal-assistant`,
        {
          message: userMessage,
        },
        {
          headers: authHeaders,
        },
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: data.message },
      ]);

      if (data.parsed) {
        setParsedEntry(data.parsed);
        setShowConfirm(true);
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ||
          "Sorry, I couldn't process that right now. Please try again."
        : "Sorry, I couldn't process that right now. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: message,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
        Describe your trade in natural English and I'll turn it into a structured journal entry
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
