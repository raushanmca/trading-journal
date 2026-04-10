import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";
import { useLocalization } from "../localization/LocalizationProvider";

const DEFAULT_LESSONS = [
  "Over Trading",
  "Fear of Missing Out (FOMO)",
  "Revenge Trading",
  "Cut Losses Early",
  "Follow Risk Management",
  "Patience - Wait for Setup",
  "Disciplined Entry",
  "Best Setup - High Probability",
  "Booked Profit Early",
  "Ignored Stop Loss",
];

function getSentimentColor(text: string): string {
  const lower = text.toLowerCase();

  // Positive keywords (Good disciplines & setups)
  const positiveWords = [
    "patience",
    "disciplined",
    "follow",
    "risk management",
    "cut losses",
    "high probability",
    "best setup",
    "control",
    "booked profit",
    "wait",
    "good",
    "excellent",
    "perfect",
    "strong",
    "well",
  ];

  // Negative keywords (Mistakes)
  const negativeWords = [
    "over trading",
    "fomo",
    "revenge",
    "ignored",
    "emotional",
    "fear",
    "greed",
    "impulsive",
    "late entry",
    "early exit",
    "no stop",
    "loss",
  ];

  if (positiveWords.some((word) => lower.includes(word))) {
    return "#22c55e"; // Green
  }
  if (negativeWords.some((word) => lower.includes(word))) {
    return "#ef4444"; // Red
  }
  return "#3b82f6"; // Blue (neutral/default)
}

function Item({ value }: { value: string }) {
  const color = getSentimentColor(value);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "mistake",
    item: { value },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="item"
      style={{
        opacity: isDragging ? 0.6 : 1,
        borderLeft: `4px solid ${color}`,
        color:
          color === "#ef4444"
            ? "#b91c1c"
            : color === "#22c55e"
              ? "#166534"
              : "#1e40af",
        background:
          color === "#ef4444"
            ? "#fef2f2"
            : color === "#22c55e"
              ? "#f0fdf4"
              : "#eef2ff",
      }}
    >
      {value}
    </div>
  );
}

export default function LessonsSidebar() {
  const { t } = useLocalization();
  const [lessons, setLessons] = useState<string[]>(DEFAULT_LESSONS);

  const [newLesson, setNewLesson] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customLessons");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLessons(parsed);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("customLessons", JSON.stringify(lessons));
  }, [lessons]);

  const addLesson = () => {
    const trimmed = newLesson.trim();
    if (!trimmed || lessons.includes(trimmed)) return;

    setLessons((prev) => [trimmed, ...prev]);
    setNewLesson("");
  };

  const removeLesson = (valueToRemove: string) => {
    setLessons((prev) => prev.filter((item) => item !== valueToRemove));
  };

  const restoreDefaults = () => {
    setLessons((prev) => [...new Set([...DEFAULT_LESSONS, ...prev])]);
  };

  return (
    <div className="card">
      <div className="sidebar-header">
        <h3>{t("sidebar.lessons")}</h3>
        <button
          type="button"
          onClick={restoreDefaults}
          className="sidebar-header-action"
        >
          {t("sidebar.restoreDefaults")}
        </button>
      </div>

      <p className="sidebar-description">{t("sidebar.lessonsDescription")}</p>

      <div className="sidebar-input-row">
        <input
          type="text"
          value={newLesson}
          onChange={(e) => setNewLesson(e.target.value)}
          placeholder={t("sidebar.lessonPlaceholder")}
          className="sidebar-inline-input"
          onKeyDown={(e) => e.key === "Enter" && addLesson()}
        />
        <button onClick={addLesson} className="sidebar-confirm">
          {t("sidebar.addConfirm")}
        </button>
      </div>

      <div className="sidebar-stack">
        {lessons.map((item) => (
          <div key={item} className="sidebar-item-row">
            <Item value={item} />
            <button
              onClick={() => removeLesson(item)}
              className="sidebar-remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
