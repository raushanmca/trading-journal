import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders } from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";

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
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant" as const,
      content: t("ai.greeting"),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedEntry, setParsedEntry] = useState<JournalEntry | null>(null);
  const [pendingJournalComment, setPendingJournalComment] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0 || prev[0].role !== "assistant") {
        return prev;
      }

      return [
        {
          ...prev[0],
          content: t("ai.greeting"),
        },
        ...prev.slice(1),
      ];
    });
  }, [t]);

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
            content: t("ai.signInToUse"),
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
        setPendingJournalComment(userMessage);
        setShowConfirm(true);
        setIsOpen(true);
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t("ai.processingFailed")
        : t("ai.processingFailed");

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
          content: t("ai.signInToSave"),
        },
      ]);
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/journal`,
        {
          ...parsedEntry,
          journalComment: pendingJournalComment,
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
          content: t("ai.saved"),
        },
      ]);

      setParsedEntry(null);
      setPendingJournalComment("");
      setShowConfirm(false);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: t("ai.saveFailed"),
        },
      ]);
    }
  };

  return (
    <div className="ai-chat-widget">
      {isOpen ? (
        <div className="ai-chat-widget__panel">
          <div className="ai-chat-widget__header">
            <div>
              <h3>{t("ai.title")}</h3>
              <p>{t("ai.description")}</p>
            </div>
            <button
              type="button"
              className="ai-chat-widget__close"
              onClick={() => setIsOpen(false)}
            >
              {t("ai.close")}
            </button>
          </div>

          <div className="ai-chat-widget__messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-chat-widget__message-row ai-chat-widget__message-row--${msg.role}`}
              >
                <div
                  className={`ai-chat-widget__bubble ai-chat-widget__bubble--${msg.role}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="ai-chat-widget__thinking">{t("ai.thinking")}</div>
            ) : null}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={t("ai.inputPlaceholder")}
              className="chat-input-row__field"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="chat-input-row__button"
            >
              {t("ai.send")}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="ai-chat-widget__launcher"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="ai-chat-widget__launcher-label">
          {t("ai.launcherLabel")}
        </span>
        <span className="ai-chat-widget__launcher-title">
          {t("ai.launcherTitle")}
        </span>
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && parsedEntry && (
        <div className="ai-chat-widget__confirm-backdrop">
          <div className="ai-chat-widget__confirm">
          <h4 className="ai-chat-widget__confirm-title">{t("ai.confirmTitle")}</h4>

          <div className="ai-chat-widget__confirm-body">
            <strong>{t("ai.confirmInstrument")}</strong>{" "}
            {parsedEntry.instrument}
            <br />
            <strong>{t("ai.confirmPnl")}</strong> ₹{parsedEntry.pnl}
            <br />
            <strong>{t("ai.confirmRating")}</strong> {parsedEntry.rating}/5
            <br />
            <strong>{t("ai.confirmLessons")}</strong>{" "}
            {parsedEntry.mistakes.join(", ")}
          </div>

          <div className="ai-chat-widget__confirm-actions">
            <button
              onClick={confirmAndSave}
              className="ai-chat-widget__confirm-button ai-chat-widget__confirm-button--save"
            >
              {t("ai.confirmSave")}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setPendingJournalComment("");
              }}
              className="ai-chat-widget__confirm-button ai-chat-widget__confirm-button--cancel"
            >
              {t("ai.confirmCancel")}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
