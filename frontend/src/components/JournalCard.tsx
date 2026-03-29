import { useState } from "react";
import { useDrop } from "react-dnd";
import axios from "axios";
import { getAuthHeaders } from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
const BASE_URL = getApiBaseUrl();

export default function JournalCard() {
  const [form, setForm] = useState({
    date: "",
    instrument: "",
    pnl: "",
    mistakes: "", // We'll keep this field name for now
    rating: 0,
  });

  const [isInstrumentOver, setIsInstrumentOver] = useState(false);
  const [isLessonOver, setIsLessonOver] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Drop Instrument
  const [, dropInstrument] = useDrop({
    accept: "instrument",
    drop: (item: any) =>
      setForm((prev) => ({ ...prev, instrument: item.value })),
    hover: () => setIsInstrumentOver(true),
    collect: (monitor) => {
      const isOver = !!monitor.isOver();
      if (isOver !== isInstrumentOver) setIsInstrumentOver(isOver);
    },
  });

  // Drop Lessons & Setups
  const [, dropLesson] = useDrop({
    accept: "mistake",
    drop: (item: any) => {
      setForm((prev) => ({
        ...prev,
        mistakes: prev.mistakes
          ? prev.mistakes + ", " + item.value
          : item.value,
      }));
    },
    hover: () => setIsLessonOver(true),
    collect: (monitor) => {
      const isOver = !!monitor.isOver();
      if (isOver !== isLessonOver) setIsLessonOver(isOver);
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRating = (value: number) => {
    setForm((prev) => ({ ...prev, rating: value }));
    setHoveredRating(0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const authHeaders = getAuthHeaders();

    if (!authHeaders.Authorization) {
      alert("Please sign in to save journal entries");
      return;
    }

    if (!form.date || !form.instrument || !form.pnl) {
      alert("Please fill Date, Instrument, and PnL");
      return;
    }

    await axios.post(
      `${BASE_URL}/api/journal`,
      {
        date: form.date,
        instrument: form.instrument,
        pnl: Number(form.pnl),
        rating: form.rating,
        mistakes: form.mistakes
          ? form.mistakes
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
      },
      {
        headers: authHeaders,
      },
    );

    alert("Journal entry saved successfully!");

    setForm({ date: "", instrument: "", pnl: "", mistakes: "", rating: 0 });
  };

  const currentRating = hoveredRating || form.rating;

  return (
    <form className="card" onSubmit={submit}>
      <h3>Journal Entry</h3>

      <input
        type="date"
        name="date"
        onChange={handleChange}
        className="form-input"
        required
      />

      <div
        ref={dropInstrument}
        className={`drop-zone ${isInstrumentOver ? "drag-over" : ""}`}
      >
        {form.instrument ? form.instrument : "Drop instrument here"}
      </div>

      <input
        name="pnl"
        type="number"
        placeholder="PnL (e.g. 1250 or -450)"
        onChange={handleChange}
        className="form-input"
        required
      />

      <div className="rating-row">
        <div className="rating-row__header">
          <label className="rating-row__label">
            Trade Rating
          </label>
          {form.rating > 0 ? (
            <span className="rating-row__value">({form.rating}/5)</span>
          ) : null}
        </div>
        <div className="rating-row__stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="rating-row__star"
                style={{ color: star <= currentRating ? "#facc15" : "#cbd5e1" }}
              >
                ★
              </span>
            ))}
        </div>
      </div>

      {/* Lessons Drop Zone */}
      <div
        ref={dropLesson}
        className={`drop-zone ${isLessonOver ? "drag-over" : ""}`}
      >
        {form.mistakes
          ? form.mistakes
          : "Drop Lessons & Setups here (what went well or wrong)"}
      </div>

      <button type="submit" className="submit-btn">
        Save Entry
      </button>
    </form>
  );
}
