import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";
import { useLocalization } from "../localization/LocalizationProvider";
import { showToast } from "../utils/toast";

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
  const [instruments, setInstruments] = useState<string[]>([
    "NIFTY",
    "BANKNIFTY",
    "RELIANCE",
    "HDFCBANK",
    "TCS",
  ]);

  const [newInstrument, setNewInstrument] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("customInstruments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInstruments((prev) => [...new Set([...prev, ...parsed])]); // avoid duplicates
      } catch (e) {
        console.error("Failed to load instruments");
      }
    }
  }, []);

  // Save to localStorage whenever instruments change
  useEffect(() => {
    const customOnes = instruments.slice(5); // everything after default 5
    localStorage.setItem("customInstruments", JSON.stringify(customOnes));
  }, [instruments]);

  const addInstrument = () => {
    const trimmed = newInstrument.trim().toUpperCase();
    if (!trimmed || instruments.includes(trimmed)) return;

    setInstruments((prev) => [...prev, trimmed]);
    setNewInstrument("");
    setShowInput(false);
  };

  const removeInstrument = (valueToRemove: string) => {
    // Prevent removing default 5 instruments
    const defaultInstruments = [
      "NIFTY",
      "BANKNIFTY",
      "RELIANCE",
      "HDFCBANK",
      "TCS",
    ];
    if (defaultInstruments.includes(valueToRemove)) {
      showToast(t("sidebar.alert.defaultInstrument"), "warning");
      return;
    }

    setInstruments((prev) => prev.filter((item) => item !== valueToRemove));
  };

  return (
    <div className="card">
      <div className="sidebar-header">
        <h3>{t("sidebar.instruments")}</h3>
        <button onClick={() => setShowInput(!showInput)} className="sidebar-action">
          {t("sidebar.add")}
        </button>
      </div>

      <p className="sidebar-description">{t("sidebar.instrumentsDescription")}</p>

      {/* Instruments List */}
      {instruments.map((item) => (
        <div key={item} style={{ position: "relative" }}>
          <Item value={item} />
          {/* Remove button for custom instruments only */}
          {!["NIFTY", "BANKNIFTY", "RELIANCE", "HDFCBANK", "TCS"].includes(
            item,
          ) && (
            <button
              onClick={() => removeInstrument(item)}
              className="sidebar-remove"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add New Instrument Input */}
      {showInput && (
        <div className="sidebar-input-row">
          <input
            type="text"
            value={newInstrument}
            onChange={(e) => setNewInstrument(e.target.value)}
            placeholder={t("sidebar.instrumentPlaceholder")}
            className="sidebar-inline-input"
            onKeyPress={(e) => e.key === "Enter" && addInstrument()}
          />
          <button onClick={addInstrument} className="sidebar-confirm">
            {t("sidebar.addConfirm")}
          </button>
        </div>
      )}
    </div>
  );
}
