import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";

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
      alert("Cannot remove default instruments");
      return;
    }

    setInstruments((prev) => prev.filter((item) => item !== valueToRemove));
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
        <h3>Instruments</h3>
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
        Drag to journal entry
      </p>

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
              style={{
                position: "absolute",
                top: "8px",
                right: "10px",
                background: "transparent",
                border: "none",
                color: "#ef4444",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add New Instrument Input */}
      {showInput && (
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newInstrument}
            onChange={(e) => setNewInstrument(e.target.value)}
            placeholder="e.g. INFY, SBIN, GOLD..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
            }}
            onKeyPress={(e) => e.key === "Enter" && addInstrument()}
          />
          <button
            onClick={addInstrument}
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
