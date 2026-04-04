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
import { useLocalization } from "../localization/LocalizationProvider";
import { useAppDateFormatter } from "../localization/date";
import {
  isDashboardCacheFresh,
  readDashboardCache,
  writeDashboardCache,
} from "../features/dashboard/dashboardCache";
import { RenewAccessActions } from "../features/subscription/components/RenewAccessActions";
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

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: formatInputDate(start),
    to: formatInputDate(end),
  };
}

export default function Dashboard() {
  const { t } = useLocalization();
  const { formatCompactDate, formatLongDate } = useAppDateFormatter();
  const currentMonthRange = getCurrentMonthRange();
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
  const [dateFrom, setDateFrom] = useState(currentMonthRange.from);
  const [dateTo, setDateTo] = useState(currentMonthRange.to);

  useEffect(() => {
    const syncStoredUser = () => {
      const storedUser = getStoredUser();

      setUserName(storedUser?.name || "");
      setUserEmail(storedUser?.email || "");
      setTrialEndsAt(storedUser?.trialEndsAt || "");
      setIsOwner(Boolean(storedUser?.isOwner));
      setTrialDaysRemaining(getTrialDaysRemaining(storedUser));

      return storedUser;
    };

    const storedUser = syncStoredUser();

    window.addEventListener("storage", syncStoredUser);
    window.addEventListener("auth-changed", syncStoredUser);

    if (isTrialExpired(storedUser)) {
      setLoading(false);
      return () => {
        window.removeEventListener("storage", syncStoredUser);
        window.removeEventListener("auth-changed", syncStoredUser);
      };
    }

    const authHeaders = getAuthHeaders();

    if (!authHeaders.Authorization) {
      setLoading(false);
      return () => {
        window.removeEventListener("storage", syncStoredUser);
        window.removeEventListener("auth-changed", syncStoredUser);
      };
    }

    const cachedDashboard = readDashboardCache();
    if (cachedDashboard) {
      setTrades(cachedDashboard.trades);

      if (isDashboardCacheFresh(cachedDashboard.savedAt)) {
        setLoading(false);
      }
    }

    axios
      .get(`${BASE_URL}/api/journal`, {
        headers: authHeaders,
      })
      .then((res) => {
        setTrades(res.data);
        writeDashboardCache(res.data);
        setErrorMessage("");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (axios.isAxiosError(err) && !cachedDashboard) {
          setErrorMessage(
            err.response?.data?.message || t("dashboard.loadFailed"),
          );
        }
        setLoading(false);
      });

    return () => {
      window.removeEventListener("storage", syncStoredUser);
      window.removeEventListener("auth-changed", syncStoredUser);
    };
  }, [t]);

  const trialExpired = !isOwner && trialDaysRemaining === 0;

  const filteredTrades = trades.filter((trade) => {
    const tradeDate = trade.date ? formatInputDate(new Date(trade.date)) : "";

    if (dateFrom && tradeDate < dateFrom) {
      return false;
    }

    if (dateTo && tradeDate > dateTo) {
      return false;
    }

    return true;
  });

  // Calculate KPIs
  const totalTrades = filteredTrades.length;
  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate =
    totalTrades > 0
      ? Math.round(
          (filteredTrades.filter((trade) => trade.pnl > 0).length /
            totalTrades) *
            100,
        )
      : 0;

  const avgRating =
    totalTrades > 0
      ? (
          filteredTrades.reduce((sum, trade) => sum + (trade.rating || 0), 0) /
          totalTrades
        ).toFixed(1)
      : "0.0";

  // Cumulative PnL for chart
  let cumulative = 0;
  const chartTrades = [...filteredTrades].reverse();
  const cumulativePnL = chartTrades.map((trade) => {
    cumulative += trade.pnl;
    return cumulative;
  });

  const chartData = {
    labels: chartTrades.map((trade) => formatCompactDate(trade.date)),
    datasets: [
      {
        label: t("dashboard.chartTitle"),
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
          label: (context: any) =>
            t("dashboard.pnlLabel", {
              value: context.raw.toLocaleString(),
            }),
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
        {t("dashboard.loading")}
      </div>
    );

  if (trialExpired) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-banner dashboard-banner--danger">
          <div className="dashboard-banner__label">{t("dashboard.trialExpired")}</div>
          <h1>{t("dashboard.trialExpiredTitle")}</h1>
          <p style={{ color: "#7c2d12", lineHeight: 1.7 }}>
            {t("dashboard.trialExpiredBody", {
              account: userName || userEmail || t("dashboard.yourAccount"),
              date: trialEndsAt
                ? formatLongDate(trialEndsAt)
                : t("dashboard.configuredExpiry"),
            })}
          </p>
          <RenewAccessActions userEmail={userEmail} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-hero__eyebrow">{t("dashboard.performanceOverview")}</div>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.subtitle")}</p>
        </div>
        <div className="dashboard-hero__meta">
          {userName ? (
            <strong>{t("dashboard.loggedInAs", { name: userName })}</strong>
          ) : null}
          {isOwner ? (
            <span>
              {t("nav.ownerAccess", {
                email: userEmail || t("dashboard.yourAccount"),
              })}
            </span>
          ) : null}
        </div>
      </div>
      {isOwner ? (
        <div className="dashboard-banner">
          <div className="dashboard-banner__label">{t("dashboard.ownerAccessLabel")}</div>
          {t("dashboard.ownerAccessBody", {
            email: userEmail || t("dashboard.yourAccount"),
          })}
        </div>
      ) : trialDaysRemaining !== null ? (
        <div className="dashboard-banner dashboard-banner--trial">
          <div className="dashboard-banner__label">{t("dashboard.trialAccess")}</div>
          <div style={{ color: "#0f172a", fontSize: "1.2rem", fontWeight: 800 }}>
            {trialDaysRemaining === 0
              ? t("dashboard.trialEnded")
              : t("dashboard.trialRemaining", {
                  count: trialDaysRemaining,
                  suffix: trialDaysRemaining === 1 ? "" : "s",
                })}
          </div>
          <div style={{ color: "#475569", marginTop: "6px", fontSize: "14px" }}>
            {t("dashboard.trialEndDate", {
              date: trialEndsAt ? formatLongDate(trialEndsAt) : t("dashboard.notAvailable"),
            })}
          </div>
          <div style={{ marginTop: "14px" }}>
            <RenewAccessActions userEmail={userEmail} />
          </div>
        </div>
      ) : null}
      {errorMessage ? <div className="dashboard-banner dashboard-banner--danger">{errorMessage}</div> : null}

      <div className="dashboard-filters">
        <div className="dashboard-filters__copy">
          <div className="dashboard-panel__title">{t("dashboard.reportRange")}</div>
          <p className="dashboard-panel__subtitle">{t("dashboard.reportRangeSubtitle")}</p>
        </div>
        <label className="dashboard-filters__field">
          <span>{t("dashboard.fromDate")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>
        <label className="dashboard-filters__field">
          <span>{t("dashboard.toDate")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="dashboard-filters__action"
          onClick={() => {
            const range = getCurrentMonthRange();
            setDateFrom(range.from);
            setDateTo(range.to);
          }}
        >
          {t("dashboard.currentMonth")}
        </button>
        <button
          type="button"
          className="dashboard-filters__action dashboard-filters__action--ghost"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        >
          {t("dashboard.allTime")}
        </button>
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{t("dashboard.totalTrades")}</span>
          <span className="dashboard-kpi__value">{totalTrades}</span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{t("dashboard.netPnl")}</span>
          <span
            className={`dashboard-kpi__value ${
              totalPnL >= 0 ? "dashboard-kpi__value--positive" : "dashboard-kpi__value--negative"
            }`}
          >
            ₹{totalPnL.toLocaleString()}
          </span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{t("dashboard.winRate")}</span>
          <span className="dashboard-kpi__value">{winRate}%</span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{t("dashboard.avgRating")}</span>
          <span className="dashboard-kpi__value">{avgRating} ★</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-chart">
          <h3 className="dashboard-panel__title">{t("dashboard.chartTitle")}</h3>
          <p className="dashboard-panel__subtitle">{t("dashboard.chartSubtitle")}</p>
          {filteredTrades.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="dashboard-empty">{t("dashboard.noTrades")}</div>
          )}
        </div>

        <div className="dashboard-trades">
          <h3 className="dashboard-panel__title">{t("dashboard.recentTrades")}</h3>
          <p className="dashboard-panel__subtitle">{t("dashboard.recentTradesSubtitle")}</p>
          {filteredTrades.length === 0 ? (
            <div className="dashboard-empty">{t("dashboard.noTradesRecorded")}</div>
          ) : (
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {filteredTrades
                .slice(0, 8)
                .map((trade, index) => (
                  <div
                    key={trade._id || index}
                    className="dashboard-trade"
                  >
                    <div>
                      <div className="dashboard-trade__instrument">{trade.instrument}</div>
                      <div className="dashboard-trade__date">
                        {formatCompactDate(trade.date)}
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
