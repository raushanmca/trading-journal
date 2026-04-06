import { useEffect, useMemo, useState } from "react";
import { getStoredUser, getUserStorageKey } from "../../utils/auth";
import { useLocalization } from "../../localization/LocalizationProvider";

const TIP_KEYS = [
  "journal.tipOne",
  "journal.tipTwo",
  "journal.tipThree",
  "journal.tipFour",
  "journal.tipFive",
] as const;

function getCurrentClock(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getGreetingKey(hour: number) {
  if (hour < 12) {
    return "journal.greetingMorning";
  }

  if (hour < 17) {
    return "journal.greetingAfternoon";
  }

  return "journal.greetingEvening";
}

function getDailyTipIndex(identity: string, date: Date, totalTips: number) {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      86400000,
  );
  const identitySeed = [...identity].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );

  return (dayOfYear + identitySeed) % totalTips;
}

interface AnalogClockProps {
  currentTime: string;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

function AnalogClock({
  currentTime,
  hours,
  minutes,
  seconds,
  milliseconds,
}: AnalogClockProps) {
  const smoothSeconds = seconds + milliseconds / 1000;
  const smoothMinutes = minutes + smoothSeconds / 60;
  const smoothHours = hours + smoothMinutes / 60;

  return (
    <div className="journal-page-hero__clock-analog" aria-label={currentTime}>
      <span className="journal-page-hero__clock-number journal-page-hero__clock-number--12">
        12
      </span>
      <span className="journal-page-hero__clock-number journal-page-hero__clock-number--3">
        3
      </span>
      <span className="journal-page-hero__clock-number journal-page-hero__clock-number--6">
        6
      </span>
      <span className="journal-page-hero__clock-number journal-page-hero__clock-number--9">
        9
      </span>
      <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--top" />
      <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--right" />
      <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--bottom" />
      <span className="journal-page-hero__clock-mark journal-page-hero__clock-mark--left" />
      <span
        className="journal-page-hero__clock-hand journal-page-hero__clock-hand--hour"
        style={{
          transform: `translateX(-50%) rotate(${smoothHours * 30}deg)`,
        }}
      />
      <span
        className="journal-page-hero__clock-hand journal-page-hero__clock-hand--minute"
        style={{
          transform: `translateX(-50%) rotate(${smoothMinutes * 6}deg)`,
        }}
      />
      <span
        className="journal-page-hero__clock-hand journal-page-hero__clock-hand--second"
        style={{ transform: `translateX(-50%) rotate(${smoothSeconds * 6}deg)` }}
      />
      <span className="journal-page-hero__clock-center" />
    </div>
  );
}

interface JournalHeroProps {
  onResetJournalData: () => Promise<void> | void;
  isResettingJournalData?: boolean;
  isMarketWatchOpen?: boolean;
  onToggleMarketWatch?: () => void;
}

export default function JournalHero({
  onResetJournalData,
  isResettingJournalData = false,
  isMarketWatchOpen = false,
  onToggleMarketWatch,
}: JournalHeroProps) {
  const { locale, t } = useLocalization();
  const storedUser = getStoredUser();
  const clockPreferenceKey = getUserStorageKey("journal-clock-mode");
  const [clockMode, setClockMode] = useState<"digital" | "analog">(() => {
    if (!clockPreferenceKey) {
      return "digital";
    }

    return localStorage.getItem(clockPreferenceKey) === "analog"
      ? "analog"
      : "digital";
  });
  const [showDailyTip, setShowDailyTip] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const updateClock = () => setCurrentDate(new Date());

    updateClock();
    const timer = window.setInterval(updateClock, 50);
    return () => window.clearInterval(timer);
  }, []);

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

  const now = currentDate;
  const currentTime = getCurrentClock(currentDate, locale);
  const greetingName =
    storedUser?.name?.split(" ")[0] || storedUser?.email?.split("@")[0] || "";
  const dailyTipKey = useMemo(() => {
    const identity = storedUser?.email || storedUser?.name || "guest";
    return TIP_KEYS[getDailyTipIndex(identity, now, TIP_KEYS.length)];
  }, [now, storedUser?.email, storedUser?.name]);

  return (
    <section className="journal-page-hero">
      <div>
        <div className="journal-page-hero__eyebrow-row">
          <div className="journal-page-hero__eyebrow">{t("journal.pageEyebrow")}</div>
          <button
            type="button"
            className="journal-page-hero__market-watch"
            onClick={() => onToggleMarketWatch?.()}
          >
            {isMarketWatchOpen ? "Hide Market" : "Market"}
          </button>
        </div>
        <div className="journal-page-hero__content">
          <div className="journal-page-hero__title-group">
            <h1>{t("journal.pageTitle")}</h1>
            <span className="journal-page-hero__greeting">
              {t(getGreetingKey(now.getHours()))} {greetingName}
            </span>
            {showDailyTip ? (
              <div className="journal-page-hero__tip">
                <span className="journal-page-hero__tip-label">
                  {t("journal.tipLabel")}
                </span>
                <span>{t(dailyTipKey)}</span>
              </div>
            ) : null}
          </div>
          <div className="journal-page-hero__clock">
            <button
              type="button"
              className="journal-page-hero__reset-button"
              onClick={() => void onResetJournalData()}
              disabled={isResettingJournalData}
            >
              {isResettingJournalData
                ? t("journal.resetActionLoading")
                : t("journal.resetAction")}
            </button>
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
              <div className="journal-page-hero__clock-digital">{currentTime}</div>
            ) : (
              <AnalogClock
                currentTime={currentTime}
                hours={now.getHours() % 12}
                minutes={now.getMinutes()}
                seconds={now.getSeconds()}
                milliseconds={now.getMilliseconds()}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
