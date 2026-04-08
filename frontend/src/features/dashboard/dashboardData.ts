import axios from "axios";
import { getApiBaseUrl } from "../../utils/api";
import { getAuthHeaders } from "../../utils/auth";
import {
  isDashboardCacheFresh,
  readDashboardCache,
  writeDashboardCache,
} from "./dashboardCache";

const BASE_URL = getApiBaseUrl();

export interface DashboardTrade {
  _id?: string;
  date: string;
  instrument: string;
  pnl: number;
  rating: number;
  mistakes?: string[];
  journalComment?: string;
}

let dashboardRequest: Promise<DashboardTrade[]> | null = null;

export function getCachedDashboardTrades() {
  return readDashboardCache();
}

export async function fetchDashboardTrades(options?: { force?: boolean }) {
  const cachedDashboard = readDashboardCache();
  const shouldUseCache = !options?.force && cachedDashboard && isDashboardCacheFresh(cachedDashboard.savedAt);

  if (shouldUseCache) {
    return cachedDashboard.trades as DashboardTrade[];
  }

  if (!dashboardRequest) {
    dashboardRequest = axios
      .get(`${BASE_URL}/api/journal?view=dashboard`, {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        const trades = Array.isArray(response.data) ? response.data : [];
        writeDashboardCache(trades);
        return trades as DashboardTrade[];
      })
      .finally(() => {
        dashboardRequest = null;
      });
  }

  return dashboardRequest;
}

export function prefetchDashboardTrades() {
  const authHeaders = getAuthHeaders();

  if (!authHeaders.Authorization) {
    return Promise.resolve(null);
  }

  const cachedDashboard = readDashboardCache();
  if (cachedDashboard && isDashboardCacheFresh(cachedDashboard.savedAt)) {
    return Promise.resolve(cachedDashboard.trades as DashboardTrade[]);
  }

  return fetchDashboardTrades().catch((error) => {
    console.error("Failed to prefetch dashboard trades", error);
    return cachedDashboard?.trades ?? null;
  });
}
