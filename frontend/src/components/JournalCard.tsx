import { useState } from "react";
import { useDrop } from "react-dnd";
import axios from "axios";
import { getAuthHeaders } from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";
import { showToast } from "../utils/toast";
import JournalDatePicker from "./JournalDatePicker";
const BASE_URL = getApiBaseUrl();

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function JournalCard() {
  const { t } = useLocalization();
  const [form, setForm] = useState({
    date: getTodayInputDate(),
    instrument: "",
    pnl: "",
    mistakes: "", // We'll keep this field name for now
    journalComment: "",
    rating: 0,
    tradeResult: "profit" as "profit" | "loss",
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
      showToast(t("journal.alert.signIn"), "warning");
      return;
    }

    if (!form.date || !form.instrument || !form.pnl) {
      showToast(t("journal.alert.required"), "warning");
      return;
    }

    const normalizedPnl = Math.abs(Number(form.pnl));

    await axios.post(
      `${BASE_URL}/api/journal`,
      {
        date: form.date,
        instrument: form.instrument,
        pnl: form.tradeResult === "loss" ? -normalizedPnl : normalizedPnl,
        rating: form.rating,
        tradeResult: form.tradeResult,
        journalComment: form.journalComment.trim(),
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

    showToast(t("journal.alert.saved"), "success");

    setForm({
      date: getTodayInputDate(),
      instrument: "",
      pnl: "",
      mistakes: "",
      journalComment: "",
      rating: 0,
      tradeResult: "profit",
    });
  };

  const currentRating = hoveredRating || form.rating;

  return (
    <form className="card" onSubmit={submit}>
      <h3>{t("journal.cardTitle")}</h3>

      <JournalDatePicker
        value={form.date}
        onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
      />

      <div
        ref={dropInstrument}
        className={`drop-zone ${isInstrumentOver ? "drag-over" : ""}`}
      >
        {form.instrument ? form.instrument : t("journal.instrumentDrop")}
      </div>

      <input
        name="pnl"
        type="number"
        min="0"
        placeholder={t("journal.pnlPlaceholder")}
        onChange={handleChange}
        className="form-input"
        required
      />

      <div className="trade-result">
        <span className="trade-result__label">{t("journal.result")}</span>
        <div className="trade-result__controls">
          <button
            type="button"
            className={`trade-result__option${
              form.tradeResult === "profit" ? " trade-result__option--active" : ""
            }`}
            onClick={() =>
              setForm((prev) => ({ ...prev, tradeResult: "profit" }))
            }
          >
            {t("journal.result.profit")}
          </button>
          <button
            type="button"
            className={`trade-result__option${
              form.tradeResult === "loss" ? " trade-result__option--active trade-result__option--loss" : ""
            }`}
            onClick={() => setForm((prev) => ({ ...prev, tradeResult: "loss" }))}
          >
            {t("journal.result.loss")}
          </button>
        </div>
      </div>

      <div className="rating-row">
        <div className="rating-row__header">
          <label className="rating-row__label">
            {t("journal.tradeRating")}
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
          : t("journal.lessonDrop")}
      </div>

      <textarea
        name="journalComment"
        value={form.journalComment}
        onChange={handleChange}
        className="form-textarea"
        placeholder={t("journal.commentPlaceholder")}
      />

      <button type="submit" className="submit-btn">
        {t("journal.saveEntry")}
      </button>
    </form>
  );
}
