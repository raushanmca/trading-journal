import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  getAuthHeaders,
  getMembershipPlan,
  getStoredUser,
  getTrialDaysRemaining,
  hasPremiumAccess,
  isTrialExpired,
} from "../utils/auth";
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";
import { useAppDateFormatter } from "../localization/date";
import { showToast } from "../utils/toast";
import {
  readDashboardCache,
  writeDashboardCache,
  clearDashboardCache,
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
import "./Dashboard.css";

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
  journalComment?: string;
}

interface DashboardAnalysis {
  summary: string;
  focusArea: string;
  strengths: string[];
  risks: string[];
  actions: string[];
}

const NOTE_PLANNED_KEYWORDS = [
  "plan",
  "planned",
  "setup",
  "target",
  "stop",
  "sl",
  "risk",
  "rr",
  "breakout",
  "retest",
  "level",
  "according to plan",
  "discipline",
  "disciplined",
  "waited",
  "rule",
];

const NOTE_EMOTIONAL_KEYWORDS = [
  "emotion",
  "emotional",
  "fear",
  "scared",
  "panic",
  "greed",
  "greedy",
  "impulsive",
  "impulse",
  "fomo",
  "revenge",
  "hesitation",
  "nervous",
  "doubt",
  "hope",
  "rushed",
  "hurry",
  "early profit",
  "booked profit early",
  "booked early",
];

function normalizeNoteText(value?: string) {
  return (value || "").trim().toLowerCase();
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce(
    (count, keyword) => (text.includes(keyword) ? count + 1 : count),
    0,
  );
}

function analyzeTradeNotes(trades: Trade[]) {
  return trades.reduce(
    (summary, trade) => {
      const noteText = normalizeNoteText(trade.journalComment);
      if (!noteText) {
        summary.missing += 1;
        return summary;
      }

      summary.reviewed += 1;

      const plannedScore = countKeywordMatches(noteText, NOTE_PLANNED_KEYWORDS);
      const emotionalScore = countKeywordMatches(
        noteText,
        NOTE_EMOTIONAL_KEYWORDS,
      );

      if (plannedScore > emotionalScore) {
        summary.planned += 1;
      } else if (emotionalScore > plannedScore) {
        summary.emotional += 1;
      } else {
        summary.mixed += 1;
      }

      return summary;
    },
    { reviewed: 0, planned: 0, emotional: 0, mixed: 0, missing: 0 },
  );
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
  const cappedEnd = end > now ? now : end;

  return {
    from: formatInputDate(start),
    to: formatInputDate(cappedEnd),
  };
}

function buildDateRangeLabel(from: string, to: string, fallback: string) {
  if (!from && !to) {
    return fallback;
  }

  if (from && to) {
    return `${from} to ${to}`;
  }

  if (from) {
    return `From ${from}`;
  }

  return `Up to ${to}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', '"')
    .replaceAll("'", "&#39;");
}

export default function Dashboard() {
  const { t } = useLocalization();
  const { formatCompactDate, formatLongDate } = useAppDateFormatter();
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const currentMonthRange = getCurrentMonthRange();
  const todayInputDate = formatInputDate(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [renewalCount, setRenewalCount] = useState(0);
  const [membershipPlan, setMembershipPlan] = useState<"standard" | "premium">(
    "standard",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
    null,
  );
  const [dateFrom, setDateFrom] = useState(currentMonthRange.from);
  const [dateTo, setDateTo] = useState(currentMonthRange.to);
  const [requestedAnalysis, setRequestedAnalysis] =
    useState<DashboardAnalysis | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    instrument: "",
    pnl: "",
    rating: 0,
    mistakes: "",
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  const openPremiumQr = () => {
    window.dispatchEvent(new Event("open-premium-qr"));
  };

  useEffect(() => {
    const syncStoredUser = () => {
      const storedUser = getStoredUser();

      setUserName(storedUser?.name || "");
      setUserEmail(storedUser?.email || "");
      setTrialEndsAt(storedUser?.trialEndsAt || "");
      setIsOwner(Boolean(storedUser?.isOwner));
      setRenewalCount(storedUser?.renewalCount || 0);
      setMembershipPlan(getMembershipPlan(storedUser));
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
      setLoading(false);
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
  const premiumEnabled = hasPremiumAccess({
    isOwner,
    membershipPlan,
  });
  const shouldShowTrialBanner =
    !isOwner &&
    trialDaysRemaining !== null &&
    (renewalCount === 0 || trialDaysRemaining <= 15);

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
  const winningTrades = filteredTrades.filter((trade) => trade.pnl > 0);
  const losingTrades = filteredTrades.filter((trade) => trade.pnl < 0);
  const winRate =
    totalTrades > 0
      ? Math.round((winningTrades.length / totalTrades) * 100)
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

  const handleDeleteClick = (trade: Trade) => {
    setTradeToDelete(trade);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDelete = () => {
    setIsDeleteModalOpen(false);
    setTradeToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!tradeToDelete?._id) return;

    setIsDeleteModalOpen(false);
    const targetTrade = tradeToDelete!;
    const authHeaders = getAuthHeaders();

    try {
      await axios.delete(`${BASE_URL}/api/journal/${targetTrade._id}`, {
        headers: authHeaders,
      });

      setTrades((prev) => prev.filter((t) => t._id !== targetTrade._id));
      clearDashboardCache();
      showToast("Journal entry deleted", "success");
    } catch (err) {
      console.error(err);
      showToast(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Delete failed"
          : "Delete failed",
        "error",
      );
    }
  };

  const handleEditClick = (trade: Trade) => {
    setEditTrade(trade);
    setEditFormData({
      instrument: trade.instrument || "",
      pnl: trade.pnl?.toString() || "",
      rating: trade.rating || 0,
      mistakes: (trade.mistakes || []).join(", "),
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditTrade(null);
    setEditFormData({ instrument: "", pnl: "", rating: 0, mistakes: "" });
  };

  const handleSaveEdit = async () => {
    if (!editTrade?._id || !editTrade) return;

    setIsSavingEdit(true);

    try {
      const pnlNum = parseFloat(editFormData.pnl) || 0;
      const mistakesArr = editFormData.mistakes
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m);

      const updateData = {
        instrument: editFormData.instrument,
        pnl: pnlNum,
        rating: editFormData.rating,
        mistakes: mistakesArr,
      };

      const authHeaders = getAuthHeaders();
      const response = await axios.put(
        `${BASE_URL}/api/journal/${editTrade._id}`,
        updateData,
        { headers: authHeaders },
      );

      setTrades((prev) =>
        prev.map((t) =>
          t._id === editTrade._id ? { ...t, ...response.data } : t,
        ),
      );
      clearDashboardCache();

      showToast("Journal entry updated successfully", "success");
      handleCloseEdit();
    } catch (err) {
      console.error(err);
      showToast(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Update failed"
          : "Update failed",
        "error",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const mistakeFrequency = new Map<string, number>();
  filteredTrades.forEach((trade) => {
    (trade.mistakes || []).forEach((mistake) => {
      const normalizedMistake = mistake.trim();
      if (!normalizedMistake) {
        return;
      }
      mistakeFrequency.set(
        normalizedMistake,
        (mistakeFrequency.get(normalizedMistake) || 0) + 1,
      );
    });
  });

  const sortedMistakes = [...mistakeFrequency.entries()].sort(
    (left, right) => right[1] - left[1],
  );

  const instrumentFrequency = new Map<string, number>();
  filteredTrades.forEach((trade) => {
    const instrument = trade.instrument || t("dashboard.notAvailable");
    instrumentFrequency.set(
      instrument,
      (instrumentFrequency.get(instrument) || 0) + 1,
    );
  });

  const topInstrument =
    [...instrumentFrequency.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0] || t("dashboard.notAvailable");

  const latestTrades = filteredTrades.slice(0, 3);
  const latestMomentum = latestTrades.reduce(
    (sum, trade) => sum + trade.pnl,
    0,
  );
  const noteReview = analyzeTradeNotes(filteredTrades);
  const topMistake = sortedMistakes[0]?.[0] || "";
  const topMistakeCount = sortedMistakes[0]?.[1] || 0;
  const topInstrumentCount =
    instrumentFrequency.get(
      topInstrument === t("dashboard.notAvailable") ? "" : topInstrument,
    ) ||
    instrumentFrequency.get(topInstrument) ||
    0;
  const topMistakeTrades = topMistake
    ? filteredTrades.filter((trade) =>
        (trade.mistakes || []).some((mistake) => mistake.trim() === topMistake),
      )
    : [];
  const topMistakeNoteReview = analyzeTradeNotes(topMistakeTrades);
  const averageLoss =
    losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) /
      Math.max(1, losingTrades.length) || 0;

  const analysis: DashboardAnalysis =
    filteredTrades.length === 0
      ? {
          summary: t("dashboard.analysisEmptySummary"),
          focusArea: t("dashboard.analysisEmptyFocus"),
          strengths: [],
          risks: [],
          actions: [t("dashboard.analysisEmptyAction")],
        }
      : {
          summary:
            totalPnL >= 0
              ? t("dashboard.analysisSummaryPositive", {
                  count: totalTrades,
                  pnl: totalPnL.toLocaleString(),
                })
              : t("dashboard.analysisSummaryNegative", {
                  count: totalTrades,
                  pnl: Math.abs(totalPnL).toLocaleString(),
                }),
          focusArea:
            latestMomentum >= 0
              ? t("dashboard.analysisFocusPositive", {
                  instrument: topInstrument,
                })
              : t("dashboard.analysisFocusNegative", {
                  instrument: topInstrument,
                }),
          strengths: [
            t("dashboard.analysisStrengthWinRate", {
              winRate,
              wins: winningTrades.length,
              total: totalTrades,
            }),
            t("dashboard.analysisStrengthRating", {
              rating: avgRating,
              total: totalTrades,
            }),
            t("dashboard.analysisStrengthInstrument", {
              instrument: topInstrument,
              count: topInstrumentCount,
              total: totalTrades,
            }),
          ],
          risks: [
            topMistake
              ? t("dashboard.analysisRiskMistake", {
                  mistake: topMistake,
                  count: topMistakeCount,
                })
              : t("dashboard.analysisRiskNone"),
            averageLoss < 0
              ? t("dashboard.analysisRiskLoss", {
                  loss: Math.abs(Math.round(averageLoss)).toLocaleString(),
                  count: losingTrades.length,
                })
              : t("dashboard.analysisRiskLowSample"),
            latestTrades.length > 0
              ? t("dashboard.analysisRiskMomentum", {
                  pnl: Math.abs(latestMomentum).toLocaleString(),
                  count: latestTrades.length,
                  direction:
                    latestMomentum < 0
                      ? t("dashboard.analysisDirectionDown")
                      : latestMomentum > 0
                        ? t("dashboard.analysisDirectionUp")
                        : t("dashboard.analysisDirectionFlat"),
                })
              : t("dashboard.analysisRiskStable"),
          ],
          actions: [
            topMistake === "Booked Profit Early"
              ? t("dashboard.analysisActionBookedProfitEarly", {
                  count: topMistakeCount,
                  emotional: topMistakeNoteReview.emotional,
                  planned: topMistakeNoteReview.planned,
                })
              : topMistake
                ? t("dashboard.analysisActionMistake", {
                    mistake: topMistake,
                  })
                : t("dashboard.analysisActionJournal"),
            topMistake === "Booked Profit Early"
              ? t("dashboard.analysisActionBookedProfitEarlyRule")
              : t("dashboard.analysisActionJournal"),
            t("dashboard.analysisActionRange", {
              range: buildDateRangeLabel(
                dateFrom,
                dateTo,
                t("dashboard.allTime"),
              ),
              reviewed: noteReview.reviewed,
              planned: noteReview.planned,
              emotional: noteReview.emotional,
              mixed: noteReview.mixed,
            }),
          ],
        };

  useEffect(() => {
    setRequestedAnalysis(null);
  }, [dateFrom, dateTo, trades]);

  const handleDateFromChange = (value: string) => {
    const nextFrom = value && value > todayInputDate ? todayInputDate : value;
    setDateFrom(nextFrom);

    if (dateTo && nextFrom && nextFrom > dateTo) {
      setDateTo(nextFrom);
    }
  };

  const handleDateToChange = (value: string) => {
    const nextTo = value && value > todayInputDate ? todayInputDate : value;
    setDateTo(nextTo);

    if (dateFrom && nextTo && nextTo < dateFrom) {
      setDateFrom(nextTo);
    }
  };

  const exportAnalysisPdf = () => {
    if (!requestedAnalysis) {
      return;
    }

    const reportTitle = t("dashboard.analysisTitle");
    const reportRange = buildDateRangeLabel(
      dateFrom,
      dateTo,
      t("dashboard.allTime"),
    );
    const chartImage = chartRef.current?.toBase64Image() || "";
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    const reportHtml = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            h2 { margin: 24px 0 10px; font-size: 18px; }
            p, li { line-height: 1.6; font-size: 14px; }
            .meta { color: #475569; margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p className="meta">${escapeHtml(reportRange)}</p>
          ${
            chartImage
              ? `
          <h2>${escapeHtml(t("dashboard.chartTitle"))}</h2>
          <img
            src="${chartImage}"
            alt="${escapeHtml(t("dashboard.chartTitle"))}"
            style="width: 100%; max-width: 760px; display: block; margin: 0 0 24px; border-radius: 16px;"
          />
          `
              : ""
          }
          <p>${escapeHtml(requestedAnalysis.summary)}</p>
          <p>${escapeHtml(requestedAnalysis.focusArea)}</p>
          <h2>${escapeHtml(t("dashboard.analysisStrengths"))}</h2>
          <ul>${requestedAnalysis.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <h2>${escapeHtml(t("dashboard.analysisRisks"))}</h2>
          <ul>${requestedAnalysis.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <h2>${escapeHtml(t("dashboard.analysisRecommendations"))}</h2>
          <ul>${requestedAnalysis.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </body>
      </html>
    `;

    document.body.appendChild(iframe);

    const reportWindow = iframe.contentWindow;
    const reportDocument = iframe.contentDocument;

    if (!reportWindow || !reportDocument) {
      iframe.remove();
      showToast("Unable to export PDF right now.", "error");
      return;
    }

    reportDocument.open();
    reportDocument.write(reportHtml);
    reportDocument.close();

    window.setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    }, 250);
  };

  if (loading)
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-loading-card">
          <span className="login-panel__spinner login-panel__spinner--dark" />
          <div className="dashboard-loading-card__text">
            {t("dashboard.loading")}
          </div>
        </div>
      </div>
    );

  if (trialExpired) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-banner dashboard-banner--danger">
          <div className="dashboard-banner__label">
            {t("dashboard.trialExpired")}
          </div>
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
          <div className="dashboard-hero__eyebrow">
            {t("dashboard.performanceOverview")}
          </div>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.subtitle")}</p>
        </div>
        <div className="dashboard-hero__meta">
          {userName ? (
            <strong className="dashboard-hero__chip">
              {t("dashboard.loggedInAs", { name: userName })}
            </strong>
          ) : null}
          <span
            className={`dashboard-hero__chip ${
              premiumEnabled
                ? "dashboard-hero__chip--accent"
                : "dashboard-hero__chip--muted"
            }`}
          >
            {premiumEnabled
              ? t("dashboard.planPremium")
              : t("dashboard.planStandard")}
          </span>
          {isOwner ? (
            <span className="dashboard-hero__chip dashboard-hero__chip--accent">
              {t("nav.ownerAccess", {
                email: userEmail || t("dashboard.yourAccount"),
              })}
            </span>
          ) : null}
        </div>
      </div>
      {!isOwner && !premiumEnabled ? (
        <div className="dashboard-banner dashboard-banner--premium">
          <div className="dashboard-banner__label">
            {t("dashboard.premiumLabel")}
          </div>
          <h2 className="dashboard-banner__heading">
            {t("dashboard.premiumTitle")}
          </h2>
          <p className="dashboard-banner__body">{t("dashboard.premiumBody")}</p>
          <div className="dashboard-banner__actions">
            <button
              type="button"
              className="dashboard-filters__action"
              onClick={openPremiumQr}
            >
              {t("nav.goPremium")}
            </button>
          </div>
        </div>
      ) : null}
      {isOwner ? (
        <div className="dashboard-banner">
          <div className="dashboard-banner__label">
            {t("dashboard.ownerAccessLabel")}
          </div>
          {t("dashboard.ownerAccessBody", {
            email: userEmail || t("dashboard.yourAccount"),
          })}
        </div>
      ) : shouldShowTrialBanner ? (
        <div className="dashboard-banner dashboard-banner--trial">
          <div className="dashboard-banner__label">
            {t("dashboard.trialAccess")}
          </div>
          <div className="dashboard-banner__value">
            {trialDaysRemaining === 0
              ? t("dashboard.trialEnded")
              : t("dashboard.trialRemaining", {
                  count: trialDaysRemaining,
                  suffix: trialDaysRemaining === 1 ? "" : "s",
                })}
          </div>
          <div className="dashboard-banner__meta">
            {t("dashboard.trialEndDate", {
              date: trialEndsAt
                ? formatLongDate(trialEndsAt)
                : t("dashboard.notAvailable"),
            })}
          </div>
          <div className="dashboard-banner__actions">
            <RenewAccessActions userEmail={userEmail} />
          </div>
        </div>
      ) : null}
      {errorMessage ? (
        <div className="dashboard-banner dashboard-banner--danger">
          {errorMessage}
        </div>
      ) : null}

      <div className="dashboard-filters">
        <div className="dashboard-filters__copy">
          <div className="dashboard-panel__title">
            {t("dashboard.reportRange")}
          </div>
          <p className="dashboard-panel__subtitle">
            {t("dashboard.reportRangeSubtitle")}
          </p>
          <span className="dashboard-range-pill">
            {buildDateRangeLabel(dateFrom, dateTo, t("dashboard.allTime"))}
          </span>
        </div>
        <label className="dashboard-filters__field">
          <span>{t("dashboard.fromDate")}</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || todayInputDate}
            onChange={(event) => handleDateFromChange(event.target.value)}
          />
        </label>
        <label className="dashboard-filters__field">
          <span>{t("dashboard.toDate")}</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={todayInputDate}
            onChange={(event) => handleDateToChange(event.target.value)}
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
          <span className="dashboard-kpi__label">
            {t("dashboard.totalTrades")}
          </span>
          <span className="dashboard-kpi__value">{totalTrades}</span>
        </div>

        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{t("dashboard.netPnl")}</span>
          <span
            className={`dashboard-kpi__value ${
              totalPnL >= 0
                ? "dashboard-kpi__value--positive"
                : "dashboard-kpi__value--negative"
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
          <span className="dashboard-kpi__label">
            {t("dashboard.avgRating")}
          </span>
          <span className="dashboard-kpi__value">{avgRating} ★</span>
        </div>
      </div>

      <div className="dashboard-analysis">
        <div className="dashboard-analysis__head">
          <div>
            <h3 className="dashboard-panel__title">
              {t("dashboard.analysisTitle")}
            </h3>
            <p className="dashboard-panel__subtitle">
              {t("dashboard.analysisSubtitle")}
            </p>
          </div>
          <div className="dashboard-analysis__actions">
            <button
              type="button"
              className="dashboard-filters__action"
              onClick={() => setRequestedAnalysis(analysis)}
              disabled={!premiumEnabled}
              aria-disabled={!premiumEnabled}
            >
              {t("dashboard.analysisAsk")}
            </button>
            {requestedAnalysis ? (
              <button
                type="button"
                className="dashboard-filters__action dashboard-filters__action--ghost"
                onClick={exportAnalysisPdf}
              >
                {t("dashboard.analysisExportPdf")}
              </button>
            ) : null}
            {requestedAnalysis ? (
              <button
                type="button"
                className="dashboard-filters__action dashboard-filters__action--ghost"
                onClick={() => setRequestedAnalysis(null)}
              >
                {t("dashboard.analysisClose")}
              </button>
            ) : null}
          </div>
        </div>

        {requestedAnalysis ? (
          <>
            <div className="dashboard-analysis__summary">
              <strong>{requestedAnalysis.summary}</strong>
              <p>{requestedAnalysis.focusArea}</p>
            </div>

            <div className="dashboard-analysis__grid">
              <div className="dashboard-analysis__section dashboard-analysis__section--strengths">
                <h4>{t("dashboard.analysisStrengths")}</h4>
                <ul>
                  {requestedAnalysis.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="dashboard-analysis__section dashboard-analysis__section--risks">
                <h4>{t("dashboard.analysisRisks")}</h4>
                <ul>
                  {requestedAnalysis.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="dashboard-analysis__section dashboard-analysis__section--recommendations">
                <h4>{t("dashboard.analysisRecommendations")}</h4>
                <ul>
                  {requestedAnalysis.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="dashboard-analysis__empty">
            {premiumEnabled
              ? t("dashboard.analysisPrompt")
              : t("dashboard.analysisPremiumOnly")}
          </div>
        )}
        {!premiumEnabled ? (
          <div className="dashboard-analysis__upgrade-note">
            <div>{t("dashboard.analysisUpgradeCta")}</div>
            <button
              type="button"
              onClick={openPremiumQr}
              className="dashboard-analysis__upgrade-link"
            >
              {t("nav.goPremium")}
            </button>
          </div>
        ) : null}
      </div>

      {isEditModalOpen && editTrade && (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={handleCloseEdit}
            aria-label="Close edit modal"
          />
          <div
            className="auth-modal__content dashboard-edit-modal"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="auth-modal__close"
              onClick={handleCloseEdit}
              aria-label="Close"
            >
              ×
            </button>
            <div className="auth-modal__eyebrow">Edit Journal Entry</div>
            <h3 className="auth-modal__title">Update {editTrade.instrument}</h3>
            <div className="dashboard-edit-form">
              <label>
                Instrument
                <input
                  type="text"
                  value={editFormData.instrument}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      instrument: e.target.value,
                    })
                  }
                  maxLength={50}
                />
              </label>
              <label>
                PnL (₹)
                <input
                  type="number"
                  value={editFormData.pnl}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, pnl: e.target.value })
                  }
                  step="0.01"
                />
              </label>
              <label>
                Rating
                <div className="dashboard-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${editFormData.rating >= star ? "filled" : ""}`}
                      onClick={() =>
                        setEditFormData({ ...editFormData, rating: star })
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>
              </label>
              <label>
                Mistakes (comma separated)
                <textarea
                  value={editFormData.mistakes}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      mistakes: e.target.value,
                    })
                  }
                  rows={3}
                  maxLength={500}
                />
              </label>
            </div>
            <div className="auth-modal__actions">
              <button
                type="button"
                className="auth-modal__button--ghost"
                onClick={handleCloseEdit}
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="auth-modal__button"
                onClick={handleSaveEdit}
                disabled={
                  isSavingEdit || !editFormData.instrument || !editFormData.pnl
                }
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && tradeToDelete && (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={handleCloseDelete}
            aria-label="Close delete modal"
          />
          <div
            className="auth-modal__content dashboard-delete-modal"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="auth-modal__close"
              onClick={handleCloseDelete}
              aria-label="Close"
            >
              ×
            </button>
            <div className="auth-modal__eyebrow">Delete Journal Entry</div>
            <h3 className="auth-modal__title">
              Delete {tradeToDelete.instrument} ({tradeToDelete.date})?
            </h3>
            <p className="auth-modal__description">
              This journal entry and all its data will be permanently deleted.
              This cannot be undone.
            </p>
            <div className="auth-modal__actions">
              <button
                type="button"
                className="auth-modal__button--ghost"
                onClick={handleCloseDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="auth-modal__button auth-modal__button--danger"
                onClick={handleConfirmDelete}
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-chart">
          <h3 className="dashboard-panel__title">
            {t("dashboard.chartTitle")}
          </h3>
          <p className="dashboard-panel__subtitle">
            {t("dashboard.chartSubtitle")}
          </p>
          {filteredTrades.length > 0 ? (
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          ) : (
            <div className="dashboard-empty">{t("dashboard.noTrades")}</div>
          )}
        </div>

        <div className="dashboard-trades">
          <h3 className="dashboard-panel__title">
            {t("dashboard.recentTrades")}
          </h3>
          <p className="dashboard-panel__subtitle">
            {t("dashboard.recentTradesSubtitle")}
          </p>
          {filteredTrades.length === 0 ? (
            <div className="dashboard-empty">
              {t("dashboard.noTradesRecorded")}
            </div>
          ) : (
            <div className="dashboard-trades__list">
              {filteredTrades.slice(0, 8).map((trade, index) => (
                <div key={trade._id || index} className="dashboard-trade">
                  <div>
                    <div className="dashboard-trade__instrument">
                      {trade.instrument}
                    </div>
                    <div className="dashboard-trade__date">
                      {formatCompactDate(trade.date)}
                    </div>
                  </div>
                  <div className="dashboard-trade__meta">
                    <div
                      className="dashboard-trade__pnl"
                      data-positive={trade.pnl >= 0}
                    >
                      ₹{trade.pnl}
                    </div>
                    <div className="dashboard-trade__rating">
                      {renderStars(trade.rating)}
                    </div>
                    <button
                      type="button"
                      className="dashboard-trade__edit"
                      onClick={() => handleEditClick(trade)}
                      disabled={trialExpired}
                      title={trialExpired ? "Upgrade for edits" : "Edit entry"}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashboard-trade__delete"
                      onClick={() => handleDeleteClick(trade)}
                      disabled={trialExpired}
                      title={
                        trialExpired ? "Upgrade for deletes" : "Delete entry"
                      }
                    >
                      Delete
                    </button>
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
