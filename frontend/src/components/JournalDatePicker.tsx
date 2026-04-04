import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../localization/LocalizationProvider";

type JournalDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthMatrix(month: Date) {
  const firstDay = startOfMonth(month);
  const firstWeekday = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + index);
    return cellDate;
  });
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function JournalDatePicker({
  value,
  onChange,
}: JournalDatePickerProps) {
  const { locale, t } = useLocalization();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = value ? new Date(value) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate || new Date()),
  );

  useEffect(() => {
    if (!value) {
      return;
    }

    setVisibleMonth(startOfMonth(new Date(value)));
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const dateLocale = locale === "hi" ? "hi-IN" : "en-IN";
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        month: "long",
        year: "numeric",
      }).format(visibleMonth),
    [dateLocale, visibleMonth],
  );

  const weekdayLabels = useMemo(() => {
    const baseSunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(baseSunday);
      date.setDate(baseSunday.getDate() + index);
      return new Intl.DateTimeFormat(dateLocale, {
        weekday: "short",
      }).format(date);
    });
  }, [dateLocale]);

  const calendarDays = useMemo(
    () => buildMonthMatrix(visibleMonth),
    [visibleMonth],
  );

  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat(dateLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : t("journal.datePlaceholder");

  const today = new Date();

  return (
    <div ref={rootRef} className="journal-date-picker">
      <button
        type="button"
        className={`form-input form-input--date journal-date-picker__trigger${isOpen ? " journal-date-picker__trigger--open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span
          className={`journal-date-picker__value${selectedDate ? "" : " journal-date-picker__value--placeholder"}`}
        >
          {formattedValue}
        </span>
        <span className="journal-date-picker__icon" aria-hidden="true">
          📅
        </span>
      </button>

      {isOpen ? (
        <div className="journal-date-picker__popup" role="dialog" aria-label={t("journal.datePlaceholder")}>
          <div className="journal-date-picker__header">
            <button
              type="button"
              className="journal-date-picker__nav"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className="journal-date-picker__nav"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              ›
            </button>
          </div>

          <div className="journal-date-picker__weekdays">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="journal-date-picker__grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, today);
              const isFuture = day > today && !isToday;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`journal-date-picker__day${isCurrentMonth ? "" : " journal-date-picker__day--muted"}${isSelected ? " journal-date-picker__day--selected" : ""}${isToday ? " journal-date-picker__day--today" : ""}${isFuture ? " journal-date-picker__day--disabled" : ""}`}
                  onClick={() => {
                    if (isFuture) {
                      return;
                    }
                    onChange(formatInputDate(day));
                    setIsOpen(false);
                  }}
                  disabled={isFuture}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="journal-date-picker__footer">
            <button
              type="button"
              className="journal-date-picker__footer-action"
              onClick={() => {
                onChange(formatInputDate(today));
                setVisibleMonth(startOfMonth(today));
                setIsOpen(false);
              }}
            >
              {t("journal.dateToday")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
