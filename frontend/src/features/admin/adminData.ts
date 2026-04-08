import axios from "axios";
import { getApiBaseUrl } from "../../utils/api";
import { getAuthHeaders } from "../../utils/auth";
import {
  isAdminDataCacheFresh,
  readAdminDataCache,
  writeAdminDataCache,
  type AdminPendingRequestRecord,
  type AdminUserRecord,
} from "./adminDataCache";

const BASE_URL = getApiBaseUrl();

export interface AdminDataSnapshot {
  users: AdminUserRecord[];
  pendingRequests: AdminPendingRequestRecord[];
}

let adminDataRequest: Promise<AdminDataSnapshot> | null = null;

export function getCachedAdminData() {
  return readAdminDataCache();
}

export async function fetchAdminData(options?: { force?: boolean }) {
  const cachedAdminData = readAdminDataCache();
  const shouldUseCache = !options?.force && cachedAdminData && isAdminDataCacheFresh(cachedAdminData.savedAt);

  if (shouldUseCache) {
    return {
      users: cachedAdminData.users,
      pendingRequests: cachedAdminData.pendingRequests,
    };
  }

  if (!adminDataRequest) {
    adminDataRequest = axios
      .get(`${BASE_URL}/api/auth/admin-overview`, {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        const users = (response.data?.users || []) as AdminUserRecord[];
        const pendingRequests = (response.data?.pendingRequests || []) as AdminPendingRequestRecord[];
        writeAdminDataCache(users, pendingRequests);
        return { users, pendingRequests };
      })
      .finally(() => {
        adminDataRequest = null;
      });
  }

  return adminDataRequest;
}

export function prefetchAdminData() {
  const authHeaders = getAuthHeaders();

  if (!authHeaders.Authorization) {
    return Promise.resolve(null);
  }

  const cachedAdminData = readAdminDataCache();
  if (cachedAdminData && isAdminDataCacheFresh(cachedAdminData.savedAt)) {
    return Promise.resolve({
      users: cachedAdminData.users,
      pendingRequests: cachedAdminData.pendingRequests,
    });
  }

  return fetchAdminData().catch((error) => {
    console.error("Failed to prefetch admin data", error);
    return cachedAdminData
      ? {
          users: cachedAdminData.users,
          pendingRequests: cachedAdminData.pendingRequests,
        }
      : null;
  });
}
