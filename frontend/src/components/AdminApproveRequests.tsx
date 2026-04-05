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

  async function denyRequest(requestId: string) {
    try {
      await axios.post(
        `${BASE_URL}/api/payment-request/deny-request`,
        { requestId },
        { headers: getAuthHeaders() },
      );
      setSuccess("Request denied.");
      fetchRequests();
    } catch {
      setError("Failed to deny request");
    }
  }

  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "-";

  if (loading) return <div className="admin-state">{t("admin.loadingApprovals")}</div>;
  if (error) return <div className="admin-state admin-state--error">{t("admin.errorApprovals")}</div>;
  return (
    <div className="admin-dashboard">
      <section className="admin-panel">
        <div className="admin-section-header">
          <div>
            <h3>{t("admin.headingApprovals")}</h3>
            <p>{t("admin.approvalsDescription")}</p>
          </div>
        </div>
        {success && (
          <div className="admin-feedback admin-feedback--success">{success}</div>
        )}
      {requests.length === 0 ? (
        <div className="admin-empty-state">{t("admin.noRequests")}</div>
      ) : (
        <div className="admin-request-grid">
          {requests.map((r) => (
            <article key={r._id} className="admin-request-card">
              <div className="admin-request-card__row">
                <span className="admin-request-card__label">
                  {t("admin.requestEmail")}
                </span>
                <strong>{r.email}</strong>
              </div>
              <div className="admin-request-card__row">
                <span className="admin-request-card__label">
                  {t("admin.requestReference")}
                </span>
                <strong>{r.paymentReference || t("admin.notAvailable")}</strong>
              </div>
              <div className="admin-request-card__row">
                <span className="admin-request-card__label">
                  {t("admin.requestedAt")}
                </span>
                <strong>{formatDateTime(r.requestedAt)}</strong>
              </div>
              <div className="admin-request-card__actions">
                <button
                  className="admin-action-button"
                  onClick={() => approveRequest(r._id)}
                >
                  {t("admin.approve")}
                </button>
                <button
                  className="admin-action-button admin-action-button--danger"
                  onClick={() => denyRequest(r._id)}
                >
                  {t("admin.deny")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}
