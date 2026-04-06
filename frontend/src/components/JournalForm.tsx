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

interface DraggableMarketSectionProps {
  children: ReactNode;
  id: string;
  index: number;
  moveSection: (from: number, to: number) => void;
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

function DraggableMarketSection({
  children,
  id,
  index,
  moveSection,
}: DraggableMarketSectionProps) {
  const [, drag] = useDrag({
    type: "MARKET_SECTION",
    item: { id, index },
  });

  const [, drop] = useDrop({
    accept: "MARKET_SECTION",
    hover: (item: { id: string; index: number }) => {
      if (item.index === index) {
        return;
      }

      moveSection(item.index, index);
      item.index = index;
    },
  });

  return (
    <article
      ref={(node) => drag(drop(node))}
      className="market-watch-sample__card market-watch-sample__card--draggable"
    >
      {children}
    </article>
  );
}

export default function JournalForm() {
  const { t } = useLocalization();
  const authToken = getAuthToken();
  const [layout, setLayout] = useState(() => buildLayout());
  const [isResettingJournalData, setIsResettingJournalData] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMarketWatchOpen, setIsMarketWatchOpen] = useState(() => {
    const storageKey = getUserStorageKey("market-view-open");

    if (!storageKey) {
      return false;
    }

    return localStorage.getItem(storageKey) === "true";
  });
  const [marketWatch, setMarketWatch] = useState<{
    sections: Array<{
      id: string;
      label: string;
      headlines: Array<{
        title: string;
        link: string;
        pubDate: string;
        source: string;
      }>;
    }>;
    instruments: Array<{
      instrument: string;
      headlines: Array<{
        title: string;
        link: string;
        pubDate: string;
        source: string;
      }>;
    }>;
    watchpoints: string[];
    fetchedAt: string;
  } | null>(null);
  const [isMarketWatchLoading, setIsMarketWatchLoading] = useState(false);
  const [marketWatchError, setMarketWatchError] = useState("");
  const [marketWatchReloadKey, setMarketWatchReloadKey] = useState(0);
  const [marketSectionOrder, setMarketSectionOrder] = useState<string[]>([]);
  const marketWatchSections = Array.isArray(marketWatch?.sections)
    ? marketWatch.sections
    : [];
  const marketWatchInstruments = Array.isArray(marketWatch?.instruments)
    ? marketWatch.instruments
    : [];
  const marketWatchWatchpoints = Array.isArray(marketWatch?.watchpoints)
    ? marketWatch.watchpoints
    : [];
  const hasMarketWatchContent =
    marketWatchSections.length > 0 || marketWatchInstruments.length > 0;
  const orderedMarketWatchSections =
    marketSectionOrder.length > 0
      ? [
          ...marketSectionOrder
            .map((id) =>
              marketWatchSections.find((section) => section.id === id),
            )
            .filter(
              (
                section,
              ): section is NonNullable<typeof marketWatchSections[number]> =>
                Boolean(section),
            ),
          ...marketWatchSections.filter(
            (section) => !marketSectionOrder.includes(section.id),
          ),
        ]
      : marketWatchSections;

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
    const openStorageKey = getUserStorageKey("market-view-open");

    if (!openStorageKey) {
      return;
    }

    localStorage.setItem(openStorageKey, String(isMarketWatchOpen));
  }, [isMarketWatchOpen]);

  useEffect(() => {
    const orderStorageKey = getUserStorageKey("market-section-order");

    if (!orderStorageKey) {
      setMarketSectionOrder([]);
      return;
    }

    const savedOrder = localStorage.getItem(orderStorageKey);

    if (!savedOrder) {
      setMarketSectionOrder([]);
      return;
    }

    try {
      const parsedOrder = JSON.parse(savedOrder);
      setMarketSectionOrder(Array.isArray(parsedOrder) ? parsedOrder : []);
    } catch (error) {
      console.error("Failed to parse saved market section order", error);
      setMarketSectionOrder([]);
    }
  }, []);

  useEffect(() => {
    const orderStorageKey = getUserStorageKey("market-section-order");

    if (!orderStorageKey || marketSectionOrder.length === 0) {
      return;
    }

    localStorage.setItem(orderStorageKey, JSON.stringify(marketSectionOrder));
  }, [marketSectionOrder]);

  useEffect(() => {
    if (marketWatchSections.length === 0) {
      return;
    }

    setMarketSectionOrder((currentOrder) => {
      const availableIds = marketWatchSections.map((section) => section.id);
      const keptIds = currentOrder.filter((id) => availableIds.includes(id));
      const missingIds = availableIds.filter((id) => !keptIds.includes(id));
      const nextOrder = [...keptIds, ...missingIds];

      if (
        nextOrder.length === currentOrder.length &&
        nextOrder.every((id, index) => id === currentOrder[index])
      ) {
        return currentOrder;
      }

      return nextOrder;
    });
  }, [marketWatchSections]);

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
    if (!isMarketWatchOpen || marketWatch || isMarketWatchLoading) {
      return;
    }

    let ignore = false;
    const loadFailedMessage = t("marketWatch.loadFailed");

    const loadMarketWatch = async () => {
      setIsMarketWatchLoading(true);
      setMarketWatchError("");

      try {
        const { data } = await axios.get(`${BASE_URL}/api/market-watch`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          timeout: 12000,
        });

        if (!ignore) {
          setMarketWatch({
            sections: Array.isArray(data?.sections) ? data.sections : [],
            instruments: Array.isArray(data?.instruments) ? data.instruments : [],
            watchpoints: Array.isArray(data?.watchpoints) ? data.watchpoints : [],
            fetchedAt:
              typeof data?.fetchedAt === "string" ? data.fetchedAt : "",
          });
        }
      } catch (error) {
        if (!ignore) {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message || loadFailedMessage
            : loadFailedMessage;
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
    isMarketWatchOpen,
    marketWatchReloadKey,
  ]);

  const retryMarketWatch = () => {
    setMarketWatch(null);
    setMarketWatchError("");
    setIsMarketWatchLoading(false);
    setMarketWatchReloadKey((value) => value + 1);
  };

  const moveCard = (from: number, to: number) => {
    const updated = [...layout];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setLayout(updated);
  };

  const moveMarketSection = (from: number, to: number) => {
    setMarketSectionOrder((currentOrder) => {
      const updated = [...currentOrder];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
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
              <h2>{t("marketWatch.title")}</h2>
              <p>{t("marketWatch.description")}</p>
            </div>
            <div className="market-watch-sample__badge">
              <span className="market-watch-sample__badge-dot" aria-hidden="true" />
              {t("marketWatch.liveLabel")}
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
          ) : hasMarketWatchContent ? (
            <div className="market-watch-sample__content">
              {marketWatchSections.length ? (
                <div className="market-watch-sample__grid">
                  {orderedMarketWatchSections.map((section, index) => (
                    <DraggableMarketSection
                      key={section.id}
                      id={section.id}
                      index={index}
                      moveSection={moveMarketSection}
                    >
                      <div className="market-watch-sample__card-top">
                        <div className="market-watch-sample__card-heading">
                          <span className="market-watch-sample__drag">⋮⋮</span>
                          <strong>{section.label}</strong>
                        </div>
                        <span
                          className={`market-watch-sample__impact ${
                            index < 2
                              ? "market-watch-sample__impact--high"
                              : "market-watch-sample__impact--medium"
                          }`}
                        >
                          {index < 2
                            ? t("marketWatch.priorityHigh")
                            : t("marketWatch.priorityWatch")}
                        </span>
                      </div>
                      <ul className="market-watch-sample__list">
                        {section.headlines.map((headline) => (
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
                    </DraggableMarketSection>
                  ))}
                </div>
              ) : null}

              <div className="market-watch-sample__aside">
                {marketWatchWatchpoints.length ? (
                  <article className="market-watch-sample__card market-watch-sample__card--aside">
                    <div className="market-watch-sample__card-top">
                      <strong>{t("marketWatch.watchpointsTitle")}</strong>
                    </div>
                    <ul className="market-watch-sample__list">
                      {marketWatchWatchpoints.map((point) => (
                        <li key={point} className="market-watch-sample__watchpoint">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                ) : null}

                {marketWatchInstruments.length ? (
                  <article className="market-watch-sample__card market-watch-sample__card--aside">
                    <div className="market-watch-sample__card-top">
                      <strong>{t("marketWatch.instrumentTitle")}</strong>
                    </div>
                    <ul className="market-watch-sample__list">
                      {marketWatchInstruments.map((entry) => (
                        <li key={entry.instrument} className="market-watch-sample__instrument">
                          <span>{entry.instrument}</span>
                          <small>{entry.headlines.length} headlines</small>
                        </li>
                      ))}
                    </ul>
                  </article>
                ) : null}
              </div>
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
