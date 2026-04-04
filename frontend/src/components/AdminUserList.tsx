import { useLocalization } from "../localization/LocalizationProvider";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";

const BASE_URL = getApiBaseUrl();

export function AdminUserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { t } = useLocalization();

  async function fetchUsersAndRequests() {
    setLoading(true);
    try {
      const [usersRes, requestsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/auth/all-users`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${BASE_URL}/api/payment-request/pending-requests`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setUsers(usersRes.data?.users || usersRes.data || []);
      setPendingRequests(requestsRes.data?.requests || []);
      setError("");
    } catch (e) {
      console.error(e);
      setError("Failed to load users and requests");
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(requestId: string) {
    try {
      await axios.post(
        `${BASE_URL}/api/payment-request/approve-request`,
        { requestId },
        { headers: getAuthHeaders() },
      );
      setSuccess("Request approved and subscription extended.");
      fetchUsersAndRequests(); // refresh data
    } catch (e) {
      console.error(e);
      setError("Failed to approve request");
    }
  }

  useEffect(() => {
    fetchUsersAndRequests();
  }, []);

  if (loading)
    return <div>{t("admin.loadingUsers") || "Loading users..."}</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div className="admin-user-list">
      <h3>{t("admin.headingUsers")}</h3>
      {success && (
        <div style={{ color: "#047857", marginBottom: 12 }}>{success}</div>
      )}

      <details style={{ marginBottom: 12 }}>
        <summary>Debug: Pending Requests</summary>
        <pre
          style={{
            fontSize: 12,
            background: "#f3f3f3",
            padding: 8,
            borderRadius: 6,
          }}
        >
          {JSON.stringify(pendingRequests, null, 2)}
        </pre>
      </details>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>{t("nav.journal")}</th>
            <th>{t("dashboard.trialEndDate")}</th>
            <th>Login Count</th>
            <th>Last Login</th>
            <th>Renewal Count</th>
            <th>Is Owner</th>
            <th>Pending Approval</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const req = pendingRequests.find((r) => r.email === u.email);
            return (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>
                  {u.trialEndsAt
                    ? new Date(u.trialEndsAt).toLocaleDateString()
                    : "-"}
                </td>
                <td>{u.loginCount || 0}</td>
                <td>
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString()
                    : "-"}
                </td>
                <td>{u.renewalCount || 0}</td>
                <td>{u.isOwner ? t("nav.ownerAccess") : "No"}</td>
                <td>
                  {req ? (
                    <>
                      <div>Ref: {req.paymentReference || "-"}</div>
                      <div>
                        At:{" "}
                        {req.requestedAt
                          ? new Date(req.requestedAt).toLocaleString()
                          : "-"}
                      </div>
                      <button
                        onClick={() => approveRequest(req._id)}
                        style={{
                          background: "#0f766e",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontWeight: 700,
                          cursor: "pointer",
                          marginTop: 4,
                        }}
                      >
                        {t("admin.approve")}
                      </button>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
