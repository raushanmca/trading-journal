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

  const totalUsers = users.length;
  const ownerCount = users.filter((user) => user.isOwner).length;
  const activeTrials = users.filter(
    (user) => user.trialEndsAt && new Date(user.trialEndsAt) > new Date(),
  ).length;
  const pendingCount = pendingRequests.length;

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "-";

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
    return <div className="admin-state">{t("admin.loadingUsers")}</div>;
  if (error) return <div className="admin-state admin-state--error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <section className="admin-panel admin-panel--hero">
        <div>
          <p className="admin-panel__eyebrow">{t("nav.adminUsers")}</p>
          <div className="admin-panel__headline">
            <h2 className="admin-panel__title">{t("admin.headingUsers")}</h2>
            <span className="admin-panel__chip">{t("admin.heroChip")}</span>
          </div>
        </div>
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <span className="admin-summary-card__label">
              {t("admin.metricUsers")}
            </span>
            <strong className="admin-summary-card__value">{totalUsers}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-card__label">
              {t("admin.metricPending")}
            </span>
            <strong className="admin-summary-card__value">{pendingCount}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-card__label">
              {t("admin.metricActiveTrials")}
            </span>
            <strong className="admin-summary-card__value">{activeTrials}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-card__label">
              {t("admin.metricOwners")}
            </span>
            <strong className="admin-summary-card__value">{ownerCount}</strong>
          </article>
        </div>
      </section>

      {success && <div className="admin-feedback admin-feedback--success">{success}</div>}
      {pendingCount > 0 && (
        <div className="admin-feedback admin-feedback--warning">
          {t("admin.pendingSummary").replace("{count}", String(pendingCount))}
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-section-header">
          <div>
            <h3>{t("admin.userTableTitle")}</h3>
            <p>{t("admin.userTableDescription")}</p>
          </div>
        </div>

        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.columnUser")}</th>
                <th>{t("dashboard.trialEndDate")}</th>
                <th>{t("admin.columnLoginCount")}</th>
                <th>{t("admin.columnLastLogin")}</th>
                <th>{t("admin.columnRenewals")}</th>
                <th>{t("admin.columnOwner")}</th>
                <th>{t("admin.columnApproval")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const req = pendingRequests.find((r) => r.email === u.email);
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-user-cell">
                        <strong>{u.name || t("admin.unknownUser")}</strong>
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>{formatDate(u.trialEndsAt)}</td>
                    <td>{u.loginCount || 0}</td>
                    <td>{formatDateTime(u.lastLoginAt)}</td>
                    <td>{u.renewalCount || 0}</td>
                    <td>
                      <span
                        className={`admin-badge ${u.isOwner ? "admin-badge--owner" : "admin-badge--muted"}`}
                      >
                        {u.isOwner ? t("admin.ownerYes") : t("admin.ownerNo")}
                      </span>
                    </td>
                    <td>
                      {req ? (
                        <div className="admin-approval-cell">
                          <span className="admin-badge admin-badge--pending">
                            {t("admin.statusPending")}
                          </span>
                          <span>{req.paymentReference || t("admin.notAvailable")}</span>
                          <span>{formatDateTime(req.requestedAt)}</span>
                          <button
                            className="admin-action-button"
                            onClick={() => approveRequest(req._id)}
                          >
                            {t("admin.approve")}
                          </button>
                        </div>
                      ) : (
                        <span className="admin-badge admin-badge--muted">
                          {t("admin.statusClear")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-section-header">
          <div>
            <h3>{t("admin.headingApprovals")}</h3>
            <p>{t("admin.approvalsDescription")}</p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="admin-empty-state">{t("admin.noRequests")}</div>
        ) : (
          <div className="admin-request-grid">
            {pendingRequests.map((request) => (
              <article key={request._id} className="admin-request-card">
                <div className="admin-request-card__row">
                  <span className="admin-request-card__label">
                    {t("admin.requestEmail")}
                  </span>
                  <strong>{request.email}</strong>
                </div>
                <div className="admin-request-card__row">
                  <span className="admin-request-card__label">
                    {t("admin.requestReference")}
                  </span>
                  <strong>{request.paymentReference || t("admin.notAvailable")}</strong>
                </div>
                <div className="admin-request-card__row">
                  <span className="admin-request-card__label">
                    {t("admin.requestedAt")}
                  </span>
                  <strong>{formatDateTime(request.requestedAt)}</strong>
                </div>
                <button
                  className="admin-action-button"
                  onClick={() => approveRequest(request._id)}
                >
                  {t("admin.approve")}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
