import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";

const BASE_URL = getApiBaseUrl();

export function AdminNotifications() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/payment-request/pending-requests`,
          {
            headers: getAuthHeaders(),
          },
        );
        setPendingCount(res.data.requests.length);
      } catch {
        setPendingCount(0);
      }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) return null;
  return (
    <div className="admin-notification">
      <span className="admin-notification__badge">{pendingCount}</span>
      <span>{pendingCount === 1 ? "Approval request needs review" : "Approval requests need review"}</span>
    </div>
  );
}
