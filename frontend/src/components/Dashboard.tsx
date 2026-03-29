import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./Dashboard.css"; // We'll create this

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface Trade {
  _id?: string;
  date: string;
  instrument: string;
  pnl: number;
  rating: number;
  mistakes?: string[];
}

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("https://trading-journal-pd0x.onrender.com/api/journal")
      .then((res) => {
        setTrades(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Calculate KPIs
  const totalTrades = trades.length;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate =
    totalTrades > 0
      ? Math.round((trades.filter((t) => t.pnl > 0).length / totalTrades) * 100)
      : 0;

  const avgRating =
    totalTrades > 0
      ? (
          trades.reduce((sum, t) => sum + (t.rating || 0), 0) / totalTrades
        ).toFixed(1)
      : "0.0";

  // Cumulative PnL for chart
  let cumulative = 0;
  const cumulativePnL = trades.map((t) => {
    cumulative += t.pnl;
    return cumulative;
  });

  const chartData = {
    labels: trades.map((_, i) => `Trade ${i + 1}`),
    datasets: [
      {
        label: "Cumulative PnL",
        data: cumulativePnL,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      tooltip: {
        callbacks: {
          label: (context: any) => `PnL: ₹${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#e2e8f0" },
      },
    },
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{ color: i < rating ? "#facc15" : "#cbd5e1", fontSize: "18px" }}
      >
        ★
      </span>
    ));
  };

  if (loading)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading dashboard...
      </div>
    );

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "8px" }}>Trading Dashboard</h1>
      <p style={{ color: "#64748b", marginBottom: "24px" }}>
        Overview of your trading performance
      </p>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <div className="card">
          <p style={{ color: "#64748b", margin: 0 }}>Total Trades</p>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "32px" }}>
            {totalTrades}
          </h2>
        </div>

        <div className="card">
          <p style={{ color: "#64748b", margin: 0 }}>Net PnL</p>
          <h2
            style={{
              margin: "8px 0 0 0",
              fontSize: "32px",
              color: totalPnL >= 0 ? "#22c55e" : "#ef4444",
            }}
          >
            ₹{totalPnL.toLocaleString()}
          </h2>
        </div>

        <div className="card">
          <p style={{ color: "#64748b", margin: 0 }}>Win Rate</p>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "32px" }}>{winRate}%</h2>
        </div>

        <div className="card">
          <p style={{ color: "#64748b", margin: 0 }}>Avg Rating</p>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "32px" }}>
            {avgRating} ★
          </h2>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}
      >
        {/* Cumulative PnL Chart */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px 0" }}>Cumulative Profit & Loss</h3>
          {trades.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p
              style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}
            >
              No trades yet. Start journaling!
            </p>
          )}
        </div>

        {/* Recent Trades */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px 0" }}>Recent Trades</h3>
          {trades.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No trades recorded yet.</p>
          ) : (
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {trades
                .slice(-8)
                .reverse()
                .map((trade, index) => (
                  <div
                    key={trade._id || index}
                    style={{
                      padding: "12px 0",
                      borderBottom:
                        index < trades.length - 1
                          ? "1px solid #e2e8f0"
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{trade.instrument}</div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        {new Date(trade.date).toLocaleDateString("en-IN")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: trade.pnl >= 0 ? "#22c55e" : "#ef4444",
                          fontSize: "15px",
                        }}
                      >
                        ₹{trade.pnl}
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        {renderStars(trade.rating)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
