import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";

import InstrumentsSidebar from "./InstrumentsSidebar";
import JournalCard from "./JournalCard";
import LessonsSidebar from "./LessonsSidebar";
import AIJournalChatbot from "./AIJournalChatbot";
import { getStoredUser, getUserStorageKey } from "../utils/auth";
import "./JournalForm.css";
import { useLocalization } from "../localization/LocalizationProvider";

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

function DraggableCard({ id, index, moveCard, children }: any) {
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
  const { locale, t } = useLocalization();
  const storedUser = getStoredUser();
  const clockPreferenceKey = getUserStorageKey("journal-clock-mode");
  const [layout, setLayout] = useState(() => buildLayout());
  const [clockMode, setClockMode] = useState<"digital" | "analog">(() => {
    if (!clockPreferenceKey) {
      return "digital";
    }

    const savedClockMode = localStorage.getItem(clockPreferenceKey);
    return savedClockMode === "analog" ? "analog" : "digital";
  });
  const [showDailyTip, setShowDailyTip] = useState(true);
  const [currentTime, setCurrentTime] = useState(() =>
    new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date()),
  );

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
    const formatter = new Intl.DateTimeFormat(
      locale === "hi" ? "hi-IN" : "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      },
    );

    const updateTime = () => setCurrentTime(formatter.format(new Date()));

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(timer);
  }, [locale]);

  useEffect(() => {
    setShowDailyTip(true);
    const timer = window.setTimeout(() => setShowDailyTip(false), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!clockPreferenceKey) {
      return;
    }

    localStorage.setItem(clockPreferenceKey, clockMode);
  }, [clockMode, clockPreferenceKey]);

  const moveCard = (from: number, to: number) => {
    const updated = [...layout];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setLayout(updated);
  };

  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12;
  const greetingKey =
    now.getHours() < 12
      ? "journal.greetingMorning"
      : now.getHours() < 17
        ? "journal.greetingAfternoon"
        : "journal.greetingEvening";
  const greetingName =
    storedUser?.name?.split(" ")[0] || storedUser?.email?.split("@")[0] || "";
  const tipKeys = [
    "journal.tipOne",
    "journal.tipTwo",
    "journal.tipThree",
    "journal.tipFour",
    "journal.tipFive",
  ] as const;
  const dayOfYear = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(now.getFullYear(), 0, 0)) /
      86400000,
  );
  const userIdentity = storedUser?.email || storedUser?.name || "guest";
  const userSeed = [...userIdentity].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const dailyTip = t(tipKeys[(dayOfYear + userSeed) % tipKeys.length]);

  return (
    <div className="page-container">
      <section className="journal-page-hero">
        <div>
          <div className="journal-page-hero__eyebrow">
            {t("journal.pageEyebrow")}
          </div>
          <div className="journal-page-hero__content">
            <div className="journal-page-hero__title-group">
              <h1>{t("journal.pageTitle")}</h1>
              <span className="journal-page-hero__greeting">
                {t(greetingKey)} {greetingName}
              </span>
              {showDailyTip ? (
                <div className="journal-page-hero__tip">
                  <span className="journal-page-hero__tip-label">
                    {t("journal.tipLabel")}
                  </span>
                  <span>{dailyTip}</span>
                </div>
              ) : null}
            </div>
            <div className="journal-page-hero__clock">
              <div className="journal-page-hero__clock-toggle">
                <button
                  type="button"
                  className={`journal-page-hero__clock-button${clockMode === "digital" ? " journal-page-hero__clock-button--active" : ""}`}
                  onClick={() => setClockMode("digital")}
                >
                  {t("journal.clockDigital")}
                </button>
                <button
                  type="button"
                  className={`journal-page-hero__clock-button${clockMode === "analog" ? " journal-page-hero__clock-button--active" : ""}`}
                  onClick={() => setClockMode("analog")}
                >
                  {t("journal.clockAnalog")}
                </button>
              </div>
              {clockMode === "digital" ? (
                <div className="journal-page-hero__clock-digital">
                  {currentTime}
                </div>
              ) : (
                <div className="journal-page-hero__clock-analog" aria-label={currentTime}>
                  <span className="journal-page-hero__clock-number journal-page-hero__clock-number--12">12</span>
                  <span className="journal-page-hero__clock-number journal-page-hero__clock-number--3">3</span>
                  <span className="journal-page-hero__clock-number journal-page-hero__clock-number--6">6</span>
                  <span className="journal-page-hero__clock-number journal-page-hero__clock-number--9">9</span>
                  <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--top" />
                  <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--right" />
                  <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--bottom" />
                  <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--left" />
                  <span
                    className="journal-page-hero__clock-hand journal-page-hero__clock-hand--hour"
                    style={{ transform: `translateX(-50%) rotate(${hours * 30 + minutes * 0.5}deg)` }}
                  />
                  <span
                    className="journal-page-hero__clock-hand journal-page-hero__clock-hand--minute"
                    style={{ transform: `translateX(-50%) rotate(${minutes * 6 + seconds * 0.1}deg)` }}
                  />
                  <span
                    className="journal-page-hero__clock-hand journal-page-hero__clock-hand--second"
                    style={{ transform: `translateX(-50%) rotate(${seconds * 6}deg)` }}
                  />
                  <span className="journal-page-hero__clock-center" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="journal-form-container">
        {layout.map((item, index) => (
          <DraggableCard key={item.id} index={index} moveCard={moveCard}>
            {item.component}
          </DraggableCard>
        ))}
      </div>
      <AIJournalChatbot />
    </div>
  );
}
