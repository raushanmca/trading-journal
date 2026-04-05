import { getUserStorageKey } from "../../utils/auth";

interface Trade {
  _id?: string;
  date: string;
  instrument: string;
  pnl: number;
  rating: number;
  mistakes?: string[];
}

interface DashboardCachePayload {
  trades: Trade[];
  savedAt: number;
}

const DASHBOARD_CACHE_PREFIX = "dashboard-cache";
const DASHBOARD_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function getDashboardCacheKey() {
  return getUserStorageKey(DASHBOARD_CACHE_PREFIX);
}

export function readDashboardCache() {
  const cacheKey = getDashboardCacheKey();

  if (!cacheKey) {
    return null;
  }

  const rawCache = localStorage.getItem(cacheKey);

  if (!rawCache) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawCache) as DashboardCachePayload;

    if (!Array.isArray(parsed.trades) || typeof parsed.savedAt !== "number") {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse dashboard cache", error);
    return null;
  }
}

export function writeDashboardCache(trades: Trade[]) {
  const cacheKey = getDashboardCacheKey();

  if (!cacheKey) {
    return;
  }

  const payload: DashboardCachePayload = {
    trades,
    savedAt: Date.now(),
  };

  localStorage.setItem(cacheKey, JSON.stringify(payload));
}

export function clearDashboardCache() {
  const cacheKey = getDashboardCacheKey();

  if (!cacheKey) {
    return;
  }

  localStorage.removeItem(cacheKey);
}

export function isDashboardCacheFresh(savedAt: number) {
  return Date.now() - savedAt < DASHBOARD_CACHE_MAX_AGE_MS;
}
