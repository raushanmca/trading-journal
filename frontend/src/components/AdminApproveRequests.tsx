import { useLocalization } from "../localization/LocalizationProvider";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";

const BASE_URL = getApiBaseUrl();

export function AdminApproveRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { t } = useLocalization();

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/payment-request/pending-requests`,
        {
          headers: getAuthHeaders(),
        },
      );
      setRequests(res.data.requests || []);
      setError("");
    } catch (e) {
      setError("Failed to load requests");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function approveRequest(requestId: string) {
    try {
      await axios.post(
        `${BASE_URL}/api/payment-request/approve-request`,
        { requestId },
        { headers: getAuthHeaders() },
      );
      setSuccess("Request approved and subscription extended.");
      fetchRequests();
    } catch {
      setError("Failed to approve request");
    }
  }

  if (loading) return <div>{t("admin.loadingApprovals")}</div>;
  if (error) return <div>{t("admin.errorApprovals")}</div>;
  return (
    <div className="admin-user-list">
      <h3>{t("admin.headingApprovals")}</h3>
      {success && (
        <div style={{ color: "#047857", marginBottom: 12 }}>{success}</div>
      )}
      {requests.length === 0 ? (
        <div>{t("admin.noRequests")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User Email</th>
              <th>Reference</th>
              <th>Requested At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.email}</td>
                <td>{r.paymentReference || "-"}</td>
                <td>
                  {r.requestedAt
                    ? new Date(r.requestedAt).toLocaleString()
                    : "-"}
                </td>
                <td>
                  <button
                    onClick={() => approveRequest(r._id)}
                    style={{
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("admin.approve")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
