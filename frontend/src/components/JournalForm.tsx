import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { ReactNode } from "react";

import InstrumentsSidebar from "./InstrumentsSidebar";
import JournalCard from "./JournalCard";
import LessonsSidebar from "./LessonsSidebar";
import AIJournalChatbot from "./AIJournalChatbot";
import JournalHero from "./journal/JournalHero";
import { getAuthHeaders, getAuthToken, getUserStorageKey } from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
import { showToast } from "../utils/toast";
import { clearDashboardCache } from "../features/dashboard/dashboardCache";
import "./JournalForm.css";
import { useLocalization } from "../localization/LocalizationProvider";
import axios from "axios";

const BASE_URL = getApiBaseUrl();

const DEFAULT_LAYOUT_IDS = ["instruments", "journal", "lessons"];

function buildLayout() {
  return [
    { id: "instruments", component: <InstrumentsSidebar /> },
    { id: "journal", component: <JournalCard /> },
    { id: "lessons", component: <LessonsSidebar /> },
  ];
}

function getLayoutFromIds(layoutIds: string[]) {
  const layoutMap = new Map(buildLayout().map((item) => [item.id, item]));

  return layoutIds
    .map((id) => layoutMap.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

interface DraggableCardProps {
  children: ReactNode;
  index: number;
  moveCard: (from: number, to: number) => void;
}

function DraggableCard({ index, moveCard, children }: DraggableCardProps) {
  const { t } = useLocalization();
  const [, drag] = useDrag({
    type: "CARD",
    item: { index },
  });

  const [, drop] = useDrop({
    accept: "CARD",
    hover: (item: any) => {
      if (item.index === index) return;
      moveCard(item.index, index);
      item.index = index;
    },
  });

  return (
    <div ref={(node) => drag(drop(node))} className="draggable-card">
      <div className="drag-handle">☰ {t("journal.dragHandle")}</div>
      {children}
    </div>
  );
}

export default function JournalForm() {
  const { t } = useLocalization();
  const authToken = getAuthToken();
  const [layout, setLayout] = useState(() => buildLayout());
  const [isResettingJournalData, setIsResettingJournalData] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMarketWatchOpen, setIsMarketWatchOpen] = useState(false);
  const [marketWatch, setMarketWatch] = useState<{
    instruments: Array<{
      instrument: string;
      headlines: Array<{
        title: string;
        link: string;
        pubDate: string;
        source: string;
      }>;
    }>;
    fetchedAt: string;
  } | null>(null);
  const [isMarketWatchLoading, setIsMarketWatchLoading] = useState(false);
  const [marketWatchError, setMarketWatchError] = useState("");
  const [hasAttemptedMarketWatchLoad, setHasAttemptedMarketWatchLoad] =
    useState(false);

  useEffect(() => {
    const storageKey = getUserStorageKey("journal-layout");

    if (!storageKey) {
      setLayout(buildLayout());
      return;
    }

    const savedLayout = localStorage.getItem(storageKey);

    if (!savedLayout) {
      setLayout(buildLayout());
      return;
    }

    try {
      const parsedIds = JSON.parse(savedLayout);

      if (
        !Array.isArray(parsedIds) ||
        parsedIds.length !== DEFAULT_LAYOUT_IDS.length ||
        DEFAULT_LAYOUT_IDS.some((id) => !parsedIds.includes(id))
      ) {
        setLayout(buildLayout());
        return;
      }

      setLayout(getLayoutFromIds(parsedIds));
    } catch (error) {
      console.error("Failed to parse saved layout", error);
      setLayout(buildLayout());
    }
  }, []);

  useEffect(() => {
    const storageKey = getUserStorageKey("journal-layout");

    if (!storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify(layout.map((item) => item.id)),
    );
  }, [layout]);

  useEffect(() => {
    if (!isResetModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isResettingJournalData) {
        setIsResetModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isResetModalOpen, isResettingJournalData]);

  useEffect(() => {
    if (
      !isMarketWatchOpen ||
      marketWatch ||
      isMarketWatchLoading ||
      hasAttemptedMarketWatchLoad
    ) {
      return;
    }

    let ignore = false;

    const loadMarketWatch = async () => {
      setIsMarketWatchLoading(true);
      setMarketWatchError("");
      setHasAttemptedMarketWatchLoad(true);

      try {
        const { data } = await axios.get(`${BASE_URL}/api/market-watch`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });

        if (!ignore) {
          setMarketWatch(data);
        }
      } catch (error) {
        if (!ignore) {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message || t("marketWatch.loadFailed")
            : t("marketWatch.loadFailed");
          setMarketWatchError(message);
        }
      } finally {
        if (!ignore) {
          setIsMarketWatchLoading(false);
        }
      }
    };

    void loadMarketWatch();

    return () => {
      ignore = true;
    };
  }, [
    authToken,
    hasAttemptedMarketWatchLoad,
    isMarketWatchLoading,
    isMarketWatchOpen,
    marketWatch,
    t,
  ]);

  const retryMarketWatch = () => {
    setMarketWatch(null);
    setMarketWatchError("");
    setHasAttemptedMarketWatchLoad(false);
  };

  const moveCard = (from: number, to: number) => {
    const updated = [...layout];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setLayout(updated);
  };

  const handleResetJournalData = async () => {
    setIsResetModalOpen(true);
  };

  const confirmResetJournalData = async () => {
    const authHeaders = getAuthHeaders();

    if (!authHeaders.Authorization) {
      showToast(t("journal.alert.signIn"), "warning");
      setIsResetModalOpen(false);
      return;
    }

    setIsResettingJournalData(true);

    try {
      await axios.delete(`${BASE_URL}/api/journal`, {
        headers: authHeaders,
      });

      clearDashboardCache();
      setIsResetModalOpen(false);
      showToast(t("journal.alert.resetSuccess"), "success");
    } catch (error) {
      console.error("Failed to reset journal data", error);
      if (axios.isAxiosError(error)) {
        showToast(
          error.response?.data?.message ||
            error.response?.data?.error ||
            t("journal.alert.resetFailed"),
          "error",
        );
      } else {
        showToast(t("journal.alert.resetFailed"), "error");
      }
    } finally {
      setIsResettingJournalData(false);
    }
  };

  return (
    <div className="page-container">
      <JournalHero
        onResetJournalData={handleResetJournalData}
        isResettingJournalData={isResettingJournalData}
        isMarketWatchOpen={isMarketWatchOpen}
        onToggleMarketWatch={() => setIsMarketWatchOpen((open) => !open)}
      />
      {isMarketWatchOpen ? (
        <section className="market-watch-sample">
          <div className="market-watch-sample__header">
            <div>
              <h2>Tomorrow Market Watch</h2>
              <p>
                Live headlines for your recent instruments to help you prepare
                for the next trading session.
              </p>
            </div>
            <div className="market-watch-sample__badge">
              {marketWatch?.fetchedAt
                ? new Date(marketWatch.fetchedAt).toLocaleTimeString()
                : t("marketWatch.liveLabel")}
            </div>
          </div>
          {isMarketWatchLoading ? (
            <div className="market-watch-sample__empty">
              {t("marketWatch.loading")}
            </div>
          ) : marketWatchError ? (
            <div className="market-watch-sample__empty">
              <div>{marketWatchError}</div>
              <button
                type="button"
                className="market-watch-sample__retry"
                onClick={retryMarketWatch}
              >
                {t("marketWatch.retry")}
              </button>
            </div>
          ) : marketWatch?.instruments?.length ? (
            <div className="market-watch-sample__grid">
              {marketWatch.instruments.map((entry, index) => (
                <article key={entry.instrument} className="market-watch-sample__card">
                  <div className="market-watch-sample__card-top">
                    <strong>{entry.instrument}</strong>
                    <span
                      className={`market-watch-sample__impact ${
                        index === 0
                          ? "market-watch-sample__impact--high"
                          : "market-watch-sample__impact--medium"
                      }`}
                    >
                      {index === 0
                        ? t("marketWatch.priorityHigh")
                        : t("marketWatch.priorityWatch")}
                    </span>
                  </div>
                  <ul className="market-watch-sample__list">
                    {entry.headlines.map((headline) => (
                      <li key={headline.link}>
                        <a
                          href={headline.link}
                          target="_blank"
                          rel="noreferrer"
                          className="market-watch-sample__link"
                        >
                          {headline.title}
                        </a>
                        <div className="market-watch-sample__meta">
                          {headline.source}
                          {headline.pubDate ? ` • ${headline.pubDate}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="market-watch-sample__empty">
              {t("marketWatch.empty")}
            </div>
          )}
        </section>
      ) : null}
      <div className="journal-form-container">
        {layout.map((item, index) => (
          <DraggableCard key={item.id} index={index} moveCard={moveCard}>
            {item.component}
          </DraggableCard>
        ))}
      </div>
      <AIJournalChatbot />
      {isResetModalOpen ? (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={() => {
              if (!isResettingJournalData) {
                setIsResetModalOpen(false);
              }
            }}
            aria-label={t("journal.resetCancel")}
          />
          <div
            className="auth-modal__content journal-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-reset-title"
          >
            <div className="auth-modal__eyebrow">{t("journal.resetAction")}</div>
            <h3 id="journal-reset-title" className="auth-modal__title">
              {t("journal.resetModalTitle")}
            </h3>
            <p className="auth-modal__lead">{t("journal.resetConfirm")}</p>
            <div className="journal-reset-modal__actions">
              <button
                type="button"
                className="journal-reset-modal__button journal-reset-modal__button--cancel"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResettingJournalData}
              >
                {t("journal.resetCancel")}
              </button>
              <button
                type="button"
                className="journal-reset-modal__button journal-reset-modal__button--confirm"
                onClick={() => void confirmResetJournalData()}
                disabled={isResettingJournalData}
              >
                {isResettingJournalData
                  ? t("journal.resetActionLoading")
                  : t("journal.resetConfirmAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
