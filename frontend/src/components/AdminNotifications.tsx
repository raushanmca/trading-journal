import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getApiBaseUrl } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";
import { useLocalization } from "../localization/LocalizationProvider";

const BASE_URL = getApiBaseUrl();

export function AdminNotifications() {
  const { t } = useLocalization();
  const [requests, setRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingCount = requests.length;

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/payment-request/pending-requests`,
          {
            headers: getAuthHeaders(),
          },
        );
        setRequests(res.data.requests || []);
      } catch {
        setRequests([]);
      }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (pendingCount === 0) {
      setIsOpen(false);
    }
  }, [pendingCount]);

  if (pendingCount === 0) return null;

  return (
    <div className="admin-notification-menu" ref={panelRef}>
      <button
        type="button"
        className="admin-notification-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={t("admin.notificationsButton", { count: pendingCount })}
        aria-expanded={isOpen}
      >
        <span className="admin-notification-trigger__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M12 4.75a4 4 0 0 0-4 4v2.14c0 .9-.3 1.77-.86 2.48l-1.1 1.4a1.25 1.25 0 0 0 .98 2.03h9.96a1.25 1.25 0 0 0 .98-2.03l-1.1-1.4A4 4 0 0 1 16 10.89V8.75a4 4 0 0 0-4-4Z"
              fill="currentColor"
            />
            <path
              d="M9.9 18.2a2.35 2.35 0 0 0 4.2 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="admin-notification-trigger__count">{pendingCount}</span>
      </button>

      {isOpen ? (
        <div className="admin-notification-panel">
          <div className="admin-notification-panel__head">
            <strong>{t("admin.notificationsTitle")}</strong>
            <p>
              {pendingCount === 1
                ? t("admin.notificationsSingle")
                : t("admin.notificationsMultiple", { count: pendingCount })}
            </p>
          </div>

          <div className="admin-notification-panel__list">
            {requests.map((request) => (
              <article
                key={request._id}
                className="admin-notification-panel__item"
              >
                <strong>{request.email}</strong>
                <span>
                  {request.paymentReference || t("admin.notAvailable")}
                </span>
                <span>{new Date(request.requestedAt).toLocaleString()}</span>
              </article>
            ))}
          </div>

          <Link
            to="/admin/users#approvals"
            className="admin-notification-panel__link"
            onClick={() => setIsOpen(false)}
          >
            {t("admin.viewNotifications")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
