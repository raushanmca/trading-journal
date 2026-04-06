import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";
import { useLocalization } from "../localization/LocalizationProvider";

const DEFAULT_INSTRUMENTS = [
  "NIFTY",
  "BANKNIFTY",
  "RELIANCE",
  "HDFCBANK",
  "TCS",
];

function Item({ value }: { value: string }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "instrument",
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
      }}
    >
      {value}
    </div>
  );
}

export default function InstrumentsSidebar() {
  const { t } = useLocalization();
  const [instruments, setInstruments] = useState<string[]>(DEFAULT_INSTRUMENTS);

  const [newInstrument, setNewInstrument] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("customInstruments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setInstruments(parsed);
        }
      } catch (e) {
        console.error("Failed to load instruments");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("customInstruments", JSON.stringify(instruments));
  }, [instruments]);

  const addInstrument = () => {
    const trimmed = newInstrument.trim().toUpperCase();
    if (!trimmed || instruments.includes(trimmed)) return;

    setInstruments((prev) => [trimmed, ...prev]);
    setNewInstrument("");
  };

  const removeInstrument = (valueToRemove: string) => {
    setInstruments((prev) => prev.filter((item) => item !== valueToRemove));
  };

  const restoreDefaults = () => {
    setInstruments((prev) => [...new Set([...DEFAULT_INSTRUMENTS, ...prev])]);
  };

  return (
    <div className="card">
      <div className="sidebar-header">
        <h3>{t("sidebar.instruments")}</h3>
        <button
          type="button"
          onClick={restoreDefaults}
          className="sidebar-header-action"
        >
          {t("sidebar.restoreDefaults")}
        </button>
      </div>

      <p className="sidebar-description">{t("sidebar.instrumentsDescription")}</p>

      <div className="sidebar-input-row">
        <input
          type="text"
          value={newInstrument}
          onChange={(e) => setNewInstrument(e.target.value)}
          placeholder={t("sidebar.instrumentPlaceholder")}
          className="sidebar-inline-input"
          onKeyDown={(e) => e.key === "Enter" && addInstrument()}
        />
        <button onClick={addInstrument} className="sidebar-confirm">
          {t("sidebar.addConfirm")}
        </button>
      </div>

      {/* Instruments List */}
      {instruments.map((item) => (
        <div key={item} style={{ position: "relative" }}>
          <Item value={item} />
          <button
            onClick={() => removeInstrument(item)}
            className="sidebar-remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
