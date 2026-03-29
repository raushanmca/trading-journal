import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";

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
  const [lessons, setLessons] = useState<string[]>([
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
  ]);

  const [newLesson, setNewLesson] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customLessons");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLessons((prev) => [...new Set([...prev, ...parsed])]);
      } catch (e) {}
    }
  }, []);

  // Save custom lessons
  useEffect(() => {
    const defaultSet = new Set([
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
    ]);

    const customOnes = lessons.filter((item) => !defaultSet.has(item));
    localStorage.setItem("customLessons", JSON.stringify(customOnes));
  }, [lessons]);

  const addLesson = () => {
    const trimmed = newLesson.trim();
    if (!trimmed || lessons.includes(trimmed)) return;

    setLessons((prev) => [...prev, trimmed]);
    setNewLesson("");
    setShowInput(false);
  };

  const removeLesson = (valueToRemove: string) => {
    const defaultLessons = [
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

    if (defaultLessons.includes(valueToRemove)) {
      alert("Cannot remove default lessons");
      return;
    }

    setLessons((prev) => prev.filter((item) => item !== valueToRemove));
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3>Lessons & Setups</h3>
        <button
          onClick={() => setShowInput(!showInput)}
          style={{
            padding: "4px 10px",
            fontSize: "12px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          + Add
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
        Drag what went well (green) or wrong (red)
      </p>

      {lessons.map((item) => (
        <div key={item} style={{ position: "relative" }}>
          <Item value={item} />
          {![
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
          ].includes(item) && (
            <button
              onClick={() => removeLesson(item)}
              style={{
                position: "absolute",
                top: "8px",
                right: "10px",
                background: "transparent",
                border: "none",
                color: "#ef4444",
                fontSize: "16px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add New Lesson */}
      {showInput && (
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newLesson}
            onChange={(e) => setNewLesson(e.target.value)}
            placeholder="e.g. Maintained 1:3 RR, Emotional Control..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
            }}
            onKeyPress={(e) => e.key === "Enter" && addLesson()}
          />
          <button
            onClick={addLesson}
            style={{
              padding: "8px 16px",
              background: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
