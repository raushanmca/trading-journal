import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getAuthHeaders, getStoredUser, hasPremiumAccess } from "../utils/auth";
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

function normalizeMessage(value: string) {
  return value.trim().toLowerCase();
}

export default function AIJournalChatbot() {
  const { t } = useLocalization();
  const messagesRef = useRef<HTMLDivElement | null>(null);
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
  const [premiumEnabled, setPremiumEnabled] = useState(() =>
    hasPremiumAccess(getStoredUser()),
  );

  const openPremiumQr = () => {
    window.dispatchEvent(new Event("open-premium-qr"));
  };

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

  useEffect(() => {
    const syncMembership = () => {
      setPremiumEnabled(hasPremiumAccess(getStoredUser()));
    };

    syncMembership();
    window.addEventListener("storage", syncMembership);
    window.addEventListener("auth-changed", syncMembership);

    return () => {
      window.removeEventListener("storage", syncMembership);
      window.removeEventListener("auth-changed", syncMembership);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [isOpen, messages, isLoading, showConfirm]);

  const getSupportReply = (message: string) => {
    const normalized = normalizeMessage(message);

    const hasAny = (keywords: string[]) =>
      keywords.some((keyword) => normalized.includes(keyword));

    const greetingKeywords = [
      "hi",
      "hello",
      "hey",
      "namaste",
      "hii",
      "good morning",
      "good evening",
      "good afternoon",
    ];
    const journalKeywords = [
      "journal",
      "how to journal",
      "save trade",
      "entry",
      "log trade",
      "जर्नल",
      "एंट्री",
      "ट्रेड सेव",
    ];
    const dashboardKeywords = [
      "dashboard",
      "report",
      "analysis",
      "review trades",
      "डैशबोर्ड",
      "एनालिसिस",
      "रिव्यू",
    ];
    const aboutKeywords = [
      "about",
      "about us",
      "who are you",
      "contact",
      "email",
      "support email",
      "हमारे बारे में",
      "कॉन्टैक्ट",
      "ईमेल",
    ];
    const helpKeywords = [
      "help",
      "how to use",
      "how do i use",
      "what can you do",
      "app help",
      "मदद",
      "कैसे उपयोग",
      "कैसे यूज",
    ];

    if (hasAny(aboutKeywords)) {
      return t("ai.support.about");
    }

    if (hasAny(dashboardKeywords)) {
      return t("ai.support.dashboard");
    }

    if (hasAny(journalKeywords)) {
      return t("ai.support.journal");
    }

    if (hasAny(helpKeywords)) {
      return t("ai.support.general");
    }

    if (hasAny(greetingKeywords)) {
      return t("ai.support.greeting");
    }

    return null;
  };

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
      const supportReply = getSupportReply(userMessage);
      if (supportReply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: supportReply,
          },
        ]);
        return;
      }

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

      if (!premiumEnabled) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: t("ai.premiumRequired"),
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
            <div className="ai-chat-widget__header-main">
              <div className="ai-chat-widget__header-badge">
                <span className="ai-chat-widget__header-dot" />
                {t("ai.headerStatus")}
              </div>
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

          <div ref={messagesRef} className="ai-chat-widget__messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-chat-widget__message-row ai-chat-widget__message-row--${msg.role}`}
              >
                {msg.role === "assistant" ? (
                  <div className="ai-chat-widget__avatar-badge ai-chat-widget__avatar-badge--assistant">
                    AI
                  </div>
                ) : null}
                <div
                  className={`ai-chat-widget__bubble ai-chat-widget__bubble--${msg.role}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="ai-chat-widget__thinking">
                <span className="ai-chat-widget__thinking-dot" />
                {t("ai.thinking")}
              </div>
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
        className={`ai-chat-widget__launcher${
          premiumEnabled ? "" : " ai-chat-widget__launcher--disabled"
        }`}
        onClick={() => premiumEnabled && setIsOpen((open) => !open)}
        disabled={!premiumEnabled}
        aria-disabled={!premiumEnabled}
      >
        <span className="ai-chat-widget__launcher-icon" aria-hidden="true">
          <span className="ai-chat-widget__launcher-icon-core">AI</span>
        </span>
        <span className="ai-chat-widget__launcher-copy">
          <span className="ai-chat-widget__launcher-label">
            {premiumEnabled ? t("ai.launcherLabel") : t("ai.premiumOnlyLabel")}
          </span>
          <span className="ai-chat-widget__launcher-title">
            {premiumEnabled ? t("ai.launcherTitle") : t("ai.premiumUpgradeCta")}
          </span>
        </span>
      </button>
      {!premiumEnabled ? (
        <div className="ai-chat-widget__premium-note">
          <div>{t("ai.premiumUpsell")}</div>
          <button
            type="button"
            onClick={openPremiumQr}
            className="ai-chat-widget__premium-link"
          >
            {t("nav.goPremium")}
          </button>
        </div>
      ) : null}

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
