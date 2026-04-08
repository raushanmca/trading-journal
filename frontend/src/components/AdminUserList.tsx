import { useLocalization } from "../localization/LocalizationProvider";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { getApiBaseUrl } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";

const BASE_URL = getApiBaseUrl();

export function AdminUserList() {
  const location = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const approvalsSectionRef = useRef<HTMLElement | null>(null);

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

  const getSubscriptionType = (user: any) => {
    if (user.isOwner) {
      return {
        label: t("admin.subscriptionOwner"),
        className: "admin-badge admin-badge--owner",
      };
    }

    if (!user.trialEndsAt) {
      return {
        label: t("admin.subscriptionUnknown"),
        className: "admin-badge admin-badge--muted",
      };
    }

    const isExpired = new Date(user.trialEndsAt).getTime() < Date.now();

    if (isExpired) {
      return {
        label: t("admin.subscriptionExpired"),
        className: "admin-badge admin-badge--expired",
      };
    }

    if ((user.renewalCount || 0) > 0) {
      if (user.membershipPlan === "premium") {
        return {
          label: t("admin.subscriptionPremium"),
          className: "admin-badge admin-badge--paid",
        };
      }

      return {
        label: t("admin.subscriptionStandard"),
        className: "admin-badge admin-badge--paid",
      };
    }

    return {
      label: t("admin.subscriptionTrial"),
      className: "admin-badge admin-badge--trial",
    };
  };

  async function fetchUsersAndRequests() {
    setLoading(true);
    try {
      const overviewRes = await axios.get(`${BASE_URL}/api/auth/admin-overview`, {
        headers: getAuthHeaders(),
      });

      setUsers(overviewRes.data?.users || []);
      setPendingRequests(overviewRes.data?.pendingRequests || []);
      setError("");
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        setError(
          e.response?.data?.message || "Failed to load users and requests",
        );
      } else {
        setError("Failed to load users and requests");
      }
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

  async function denyRequest(requestId: string) {
    try {
      await axios.post(
        `${BASE_URL}/api/payment-request/deny-request`,
        { requestId },
        { headers: getAuthHeaders() },
      );
      setSuccess(t("admin.denySuccess"));
      fetchUsersAndRequests();
    } catch (e) {
      console.error(e);
      setError(t("admin.denyFailed"));
    }
  }

  async function deleteUser() {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/api/auth/user/${deleteCandidate._id}`, {
        headers: getAuthHeaders(),
      });
      setSuccess(
        t("admin.deleteSuccess", {
          name: deleteCandidate.name || deleteCandidate.email,
        }),
      );
      setPendingRequests((current) =>
        current.filter((request) => request.email !== deleteCandidate.email),
      );
      setUsers((current) =>
        current.filter((user) => user._id !== deleteCandidate._id),
      );
      setDeleteCandidate(null);
      setError("");
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message || t("admin.deleteFailed"));
      } else {
        setError(t("admin.deleteFailed"));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    fetchUsersAndRequests();
  }, []);

  useEffect(() => {
    if (!deleteCandidate) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        setDeleteCandidate(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteCandidate, isDeleting]);

  useEffect(() => {
    if (location.hash !== "#approvals") {
      return;
    }

    const scrollToApprovals = () => {
      approvalsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    const frameId = window.requestAnimationFrame(scrollToApprovals);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash, pendingRequests.length, loading]);

  if (loading)
    return (
      <div className="admin-state admin-state--loading">
        <span className="login-panel__spinner login-panel__spinner--dark" />
        <div>{t("admin.loadingUsers")}</div>
      </div>
    );
  if (error) return <div className="admin-state admin-state--error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <section className="admin-panel admin-panel--hero">
        <div>
          <p className="admin-panel__eyebrow">{t("nav.adminUsers")}</p>
          <div className="admin-panel__headline">
            <h2 className="admin-panel__title">{t("admin.headingUsers")}</h2>
            <span className="admin-panel__chip">{t("admin.heroChip")}</span>
            {pendingCount > 0 ? (
              <span className="admin-panel__chip admin-panel__chip--alert">
                {t("admin.metricPending")}: {pendingCount}
              </span>
            ) : null}
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
                <th>{t("admin.columnSubscription")}</th>
                <th>{t("dashboard.trialEndDate")}</th>
                <th>{t("admin.columnLoginCount")}</th>
                <th>{t("admin.columnLastLogin")}</th>
                <th>{t("admin.columnRenewals")}</th>
                <th>{t("admin.columnOwner")}</th>
                <th>{t("admin.columnApproval")}</th>
                <th>{t("admin.columnActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const req = pendingRequests.find((r) => r.email === u.email);
                const subscriptionType = getSubscriptionType(u);
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-user-cell">
                        <strong>{u.name || t("admin.unknownUser")}</strong>
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={subscriptionType.className}>
                        {subscriptionType.label}
                      </span>
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
                          <button
                            className="admin-action-button admin-action-button--danger"
                            onClick={() => denyRequest(req._id)}
                          >
                            {t("admin.deny")}
                          </button>
                        </div>
                      ) : (
                        <span className="admin-badge admin-badge--muted">
                          {t("admin.statusClear")}
                        </span>
                      )}
                    </td>
                    <td>
                      {u.isOwner ? (
                        <span className="admin-badge admin-badge--muted">
                          {t("admin.deleteDisabled")}
                        </span>
                      ) : (
                        <div className="admin-actions-cell">
                          <button
                            type="button"
                            className="admin-action-button admin-action-button--danger"
                            onClick={() => setDeleteCandidate(u)}
                          >
                            <span className="admin-action-button__icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" focusable="false">
                                <path
                                  d="M9 3.75h6a1 1 0 0 1 1 1V6h3.25a.75.75 0 0 1 0 1.5h-1.02l-.88 10.12A2.5 2.5 0 0 1 14.86 20H9.14a2.5 2.5 0 0 1-2.49-2.38L5.77 7.5H4.75a.75.75 0 0 1 0-1.5H8V4.75a1 1 0 0 1 1-1Zm5.5 2.25v-.75h-5V6h5ZM9.5 9.25a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm3.25 0a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm3.25 0a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </span>
                            {t("admin.deleteUser")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        ref={approvalsSectionRef}
        className="admin-panel"
        id="approvals"
      >
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
                <div className="admin-request-card__actions">
                  <button
                    className="admin-action-button"
                    onClick={() => approveRequest(request._id)}
                  >
                    {t("admin.approve")}
                  </button>
                  <button
                    className="admin-action-button admin-action-button--danger"
                    onClick={() => denyRequest(request._id)}
                  >
                    {t("admin.deny")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteCandidate ? (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={() => !isDeleting && setDeleteCandidate(null)}
          />
          <div className="auth-modal__content admin-delete-modal">
            <div className="auth-modal__eyebrow">{t("admin.deleteUser")}</div>
            <h3 className="auth-modal__title">{t("admin.deleteModalTitle")}</h3>
            <p className="auth-modal__lead">
              {t("admin.deleteConfirm", {
                name: deleteCandidate.name || deleteCandidate.email,
              })}
            </p>
            <div className="admin-delete-modal__summary">
              <strong>{deleteCandidate.name || t("admin.unknownUser")}</strong>
              <span>{deleteCandidate.email}</span>
            </div>
            <div className="admin-delete-modal__actions">
              <button
                type="button"
                className="admin-delete-modal__button admin-delete-modal__button--cancel"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
              >
                {t("admin.deleteCancel")}
              </button>
              <button
                type="button"
                className="admin-delete-modal__button admin-delete-modal__button--confirm"
                onClick={deleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? t("admin.deleting") : t("admin.deleteConfirmAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
