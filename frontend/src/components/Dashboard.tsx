import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  getAuthHeaders,
  getStoredUser,
  getTrialDaysRemaining,
  isTrialExpired,
} from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
const BASE_URL = getApiBaseUrl();
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
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setUserName(storedUser?.name || "");
      setUserEmail(storedUser?.email || "");
      setTrialEndsAt(storedUser?.trialEndsAt || "");
      setIsOwner(Boolean(storedUser?.isOwner));
      setTrialDaysRemaining(getTrialDaysRemaining(storedUser));
    }

    if (isTrialExpired(storedUser)) {
      setLoading(false);
      return;
    }

    const authHeaders = getAuthHeaders();

    if (!authHeaders.Authorization) {
      setLoading(false);
      return;
    }

    axios
      .get(`${BASE_URL}/api/journal`, {
        headers: authHeaders,
      })
      .then((res) => {
        setTrades(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (axios.isAxiosError(err)) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load your dashboard",
          );
        }
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
      <div className="dashboard-page" style={{ textAlign: "center" }}>
        Loading dashboard...
      </div>
    );

  if (isTrialExpired()) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-banner dashboard-banner--danger">
          <div className="dashboard-banner__label">Trial Expired</div>
          <h1>Your 30-day trial has ended</h1>
          <p style={{ color: "#7c2d12", lineHeight: 1.7 }}>
            {userName || userEmail || "Your account"} reached the end of its
            free access period on{" "}
            {trialEndsAt
              ? new Date(trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "the configured expiry date"}
            . Contact support or upgrade access to continue using the journal
            and dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-hero__eyebrow">Performance overview</div>
          <h1>Trading Dashboard</h1>
          <p>Review the numbers behind your decisions and discipline.</p>
        </div>
        <div className="dashboard-hero__meta">
          {userName ? <strong>Logged in as {userName}</strong> : null}
          {isOwner ? <span>Owner access is active for {userEmail || "this account"}.</span> : null}
        </div>
      </div>
      {isOwner ? (
        <div className="dashboard-banner">
          <div className="dashboard-banner__label">Owner Access</div>
          Full access is active for {userEmail || "this account"}.
        </div>
      ) : trialDaysRemaining !== null ? (
        <div className="dashboard-banner dashboard-banner--trial">
          <div className="dashboard-banner__label">Trial Access</div>
          <div style={{ color: "#0f172a", fontSize: "1.2rem", fontWeight: 800 }}>
            {trialDaysRemaining === 0
              ? "Your trial has ended"
              : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining`}
          </div>
          <div style={{ color: "#475569", marginTop: "6px", fontSize: "14px" }}>
            Trial end date:{" "}
            {trialEndsAt
              ? new Date(trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Not available"}
          </div>
        </div>
      ) : null}
      {errorMessage ? <div className="dashboard-banner dashboard-banner--danger">{errorMessage}</div> : null}

      <div className="dashboard-kpis">
        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">Total Trades</span>
          <span className="dashboard-kpi__value">{totalTrades}</span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">Net PnL</span>
          <span
            className={`dashboard-kpi__value ${
              totalPnL >= 0 ? "dashboard-kpi__value--positive" : "dashboard-kpi__value--negative"
            }`}
          >
            ₹{totalPnL.toLocaleString()}
          </span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">Win Rate</span>
          <span className="dashboard-kpi__value">{winRate}%</span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">Avg Rating</span>
          <span className="dashboard-kpi__value">{avgRating} ★</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-chart">
          <h3 className="dashboard-panel__title">Cumulative Profit & Loss</h3>
          <p className="dashboard-panel__subtitle">
            Track whether your process is compounding or leaking.
          </p>
          {trades.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="dashboard-empty">No trades yet. Start journaling.</div>
          )}
        </div>

        <div className="dashboard-trades">
          <h3 className="dashboard-panel__title">Recent Trades</h3>
          <p className="dashboard-panel__subtitle">
            Your latest entries, ratings, and outcomes.
          </p>
          {trades.length === 0 ? (
            <div className="dashboard-empty">No trades recorded yet.</div>
          ) : (
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {trades
                .slice(-8)
                .reverse()
                .map((trade, index) => (
                  <div
                    key={trade._id || index}
                    className="dashboard-trade"
                  >
                    <div>
                      <div className="dashboard-trade__instrument">{trade.instrument}</div>
                      <div className="dashboard-trade__date">
                        {new Date(trade.date).toLocaleDateString("en-IN")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        className="dashboard-trade__pnl"
                        style={{ color: trade.pnl >= 0 ? "#047857" : "#b91c1c" }}
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
