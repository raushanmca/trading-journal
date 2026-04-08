import { getUserStorageKey } from "../../utils/auth";

export interface AdminUserRecord {
  _id: string;
  name?: string;
  email?: string;
  isOwner?: boolean;
  trialEndsAt?: string;
  loginCount?: number;
  lastLoginAt?: string;
  renewalCount?: number;
  membershipPlan?: "standard" | "premium";
}

export interface AdminPendingRequestRecord {
  _id: string;
  email?: string;
  paymentReference?: string;
  requestedAt?: string;
}

interface AdminDataCachePayload {
  users: AdminUserRecord[];
  pendingRequests: AdminPendingRequestRecord[];
  savedAt: number;
}

const ADMIN_DATA_CACHE_PREFIX = "admin-data-cache";
const ADMIN_DATA_CACHE_MAX_AGE_MS = 2 * 60 * 1000;

function getAdminDataCacheKey() {
  return getUserStorageKey(ADMIN_DATA_CACHE_PREFIX);
}

export function readAdminDataCache() {
  const cacheKey = getAdminDataCacheKey();

  if (!cacheKey) {
    return null;
  }

  const rawCache = localStorage.getItem(cacheKey);

  if (!rawCache) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawCache) as AdminDataCachePayload;

    if (
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.pendingRequests) ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse admin data cache", error);
    return null;
  }
}

export function writeAdminDataCache(
  users: AdminUserRecord[],
  pendingRequests: AdminPendingRequestRecord[],
) {
  const cacheKey = getAdminDataCacheKey();

  if (!cacheKey) {
    return;
  }

  const payload: AdminDataCachePayload = {
    users,
    pendingRequests,
    savedAt: Date.now(),
  };

  localStorage.setItem(cacheKey, JSON.stringify(payload));
}

export function clearAdminDataCache() {
  const cacheKey = getAdminDataCacheKey();

  if (!cacheKey) {
    return;
  }

  localStorage.removeItem(cacheKey);
}

export function isAdminDataCacheFresh(savedAt: number) {
  return Date.now() - savedAt < ADMIN_DATA_CACHE_MAX_AGE_MS;
}
