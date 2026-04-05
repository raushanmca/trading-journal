import { Link, NavLink } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import type { StoredUser } from "../../features/auth/types";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useAppDateFormatter } from "../../localization/date";
import { TrialStatusToast } from "./TrialStatusToast";
import { AdminNotifications } from "../../components/AdminNotifications";
import LoginForm from "../../components/LoginForm";
import { RenewAccessActions } from "../../features/subscription/components/RenewAccessActions";
import type { AppToastDetail, AppToastTone } from "../../utils/toast";

interface AppShellProps {
  accountMenuRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  isAccountMenuOpen: boolean;
  isSignedIn: boolean;
  onSignInMenuToggle: () => void;
  onSignOut: () => void;
  setIsAccountMenuOpen: (isOpen: boolean) => void;
  trialDaysRemaining: number | null;
  user: StoredUser | null;
  userInitials: string;
}

export function AppShell({
  accountMenuRef,
  children,
  isAccountMenuOpen,
  isSignedIn,
  onSignInMenuToggle,
  onSignOut,
  setIsAccountMenuOpen,
  trialDaysRemaining,
  user,
  userInitials,
}: AppShellProps) {
  const TOAST_DURATION_MS = 4000;
  const { locale, locales, setLocale, t } = useLocalization();
  const { formatShortDate } = useAppDateFormatter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPremiumQrModalOpen, setIsPremiumQrModalOpen] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; tone: AppToastTone }>
  >([]);

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (isSignedIn) {
      setIsAuthModalOpen(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isAuthModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen]);

  useEffect(() => {
    const handleOpenPremiumQr = () => {
      setIsPremiumQrModalOpen(true);
      setIsAccountMenuOpen(false);
    };

    window.addEventListener("open-premium-qr", handleOpenPremiumQr);

    return () => {
      window.removeEventListener("open-premium-qr", handleOpenPremiumQr);
    };
  }, [setIsAccountMenuOpen]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<AppToastDetail>;
      const message = customEvent.detail?.message?.trim();

      if (!message) {
        return;
      }

      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [
        ...current,
        {
          id,
          message,
          tone: customEvent.detail?.tone || "info",
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS);
    };

    window.addEventListener("app-toast", handleToast as EventListener);

    return () => {
      window.removeEventListener("app-toast", handleToast as EventListener);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <div className="app-shell__brand">
            <Link to={isSignedIn ? "/" : "/login"} className="app-shell__logo">
              <img
                src={`${import.meta.env.BASE_URL}brand-logo-header.svg`}
                alt="TRA Journal by Aarohi"
              />
            </Link>
          </div>

          {isSignedIn ? (
            <nav className="app-shell__nav" aria-label="Primary">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
                }
              >
                {t("nav.journal")}
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
                }
              >
                {t("nav.dashboard")}
              </NavLink>
              {user?.email === "rshan45@gmail.com" && (
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
                  }
                >
                  {t("nav.adminUsers")}
                </NavLink>
              )}
            </nav>
          ) : null}

          <div className="app-shell__controls">
            <label className="app-shell__locale">
              <select
                className="app-shell__locale-select"
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value as typeof locale)
                }
              >
                {locales.map((option) => (
                  <option key={option} value={option}>
                    {t(`locale.${option}`)}
                  </option>
                ))}
              </select>
            </label>

            {isSignedIn ? (
              <div ref={accountMenuRef} className="app-shell__user">
                <div className="app-shell__user-head">
                  {user?.email === "rshan45@gmail.com" ? (
                    <AdminNotifications />
                  ) : null}
                  <button
                    onClick={onSignInMenuToggle}
                    className="app-shell__user-button"
                  >
                    <div className="app-shell__avatar">
                      {userInitials || "A"}
                    </div>
                    <div className="app-shell__user-meta">
                      <span className="app-shell__user-name">
                        {user?.name || t("nav.myAccount")}
                      </span>
                    </div>
                    <span className="app-shell__caret">
                      {isAccountMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                </div>

                {isAccountMenuOpen ? (
                  <div className="app-shell__menu">
                    <div className="app-shell__menu-head">
                      <span className="app-shell__menu-name">
                        {user?.name || t("nav.signedIn")}
                      </span>
                      <span className="app-shell__menu-email">
                        {user?.email}
                      </span>
                      {!user?.isOwner && user?.trialEndsAt ? (
                        <div className="app-shell__menu-trial">
                          {trialDaysRemaining === 0
                            ? t("nav.trialAccessExpired")
                            : t("nav.trialEndsOn", {
                                date: formatShortDate(user.trialEndsAt),
                              })}
                        </div>
                      ) : null}
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="app-shell__menu-link"
                    >
                      {t("nav.dashboard")}
                    </Link>

                    {!user?.isOwner && user?.membershipPlan !== "premium" ? (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event("open-premium-qr"))}
                        className="app-shell__menu-link"
                      >
                        {t("nav.goPremium")}
                      </button>
                    ) : null}

                    <button
                      onClick={onSignOut}
                      className="app-shell__menu-action"
                    >
                      {t("nav.signOut")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="app-shell__sign-in"
                onClick={() => setIsAuthModalOpen(true)}
              >
                {t("nav.signIn")}
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
      {isAuthModalOpen ? (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={() => setIsAuthModalOpen(false)}
          />
          <div className="auth-modal__content">
            <button
              type="button"
              className="auth-modal__close"
              onClick={() => setIsAuthModalOpen(false)}
            >
              {t("auth.close")}
            </button>
            <div className="auth-modal__eyebrow">{t("login.eyebrow")}</div>
            <h2 className="auth-modal__title">{t("login.title")}</h2>
            <p className="auth-modal__lead">{t("login.description")}</p>
            <LoginForm onComplete={() => setIsAuthModalOpen(false)} />
          </div>
        </div>
      ) : null}
      {isPremiumQrModalOpen ? (
        <div className="auth-modal">
          <button
            type="button"
            className="auth-modal__overlay"
            onClick={() => setIsPremiumQrModalOpen(false)}
          />
          <div className="auth-modal__content">
            <button
              type="button"
              className="auth-modal__close"
              onClick={() => setIsPremiumQrModalOpen(false)}
            >
              {t("auth.close")}
            </button>
            <div className="auth-modal__eyebrow">{t("dashboard.premiumLabel")}</div>
            <h2 className="auth-modal__title">{t("dashboard.premiumTitle")}</h2>
            <p className="auth-modal__lead">{t("dashboard.premiumBody")}</p>
            <RenewAccessActions
              userEmail={user?.email}
              startExpanded
            />
          </div>
        </div>
      ) : null}
      {toasts.length > 0 ? (
        <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`app-toast app-toast--${toast.tone}`}
              role="status"
            >
              <span>{toast.message}</span>
              <button
                type="button"
                className="app-toast__close"
                onClick={() => removeToast(toast.id)}
                aria-label={t("auth.close")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <TrialStatusToast
        trialDaysRemaining={trialDaysRemaining}
        isOwner={user?.isOwner}
        renewalCount={user?.renewalCount}
        userEmail={user?.email}
      />
    </div>
  );
}
