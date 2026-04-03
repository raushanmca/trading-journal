import { Link, NavLink } from "react-router-dom";
import { useState, type ReactNode } from "react";
import type { StoredUser } from "../../features/auth/types";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useAppDateFormatter } from "../../localization/date";
import { TrialStatusToast } from "./TrialStatusToast";
import { AdminNotifications } from "../../components/AdminNotifications";
import LoginForm from "../../components/LoginForm";

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
  const { locale, locales, setLocale, t } = useLocalization();
  const { formatShortDate } = useAppDateFormatter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <div className="app-shell__brand">
            <Link to={isSignedIn ? "/" : "/login"} className="app-shell__logo">
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt="Trading Journal logo"
              />
            </Link>
            <div>
              <p className="app-shell__title">{t("app.title")}</p>
              <p className="app-shell__subtitle">{t("app.subtitle")}</p>
            </div>
          </div>

          {/* Admin notification for OWNER_EMAIL, below header */}
          {user?.email === "rshan45@gmail.com" && <AdminNotifications />}

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
                <button
                  onClick={onSignInMenuToggle}
                  className="app-shell__user-button"
                >
                  <div className="app-shell__avatar">{userInitials || "A"}</div>
                  <div className="app-shell__user-meta">
                    <span className="app-shell__user-name">
                      {user?.name || t("nav.myAccount")}
                    </span>
                  </div>
                  <span className="app-shell__caret">
                    {isAccountMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

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
      <TrialStatusToast
        trialDaysRemaining={trialDaysRemaining}
        isOwner={user?.isOwner}
        userEmail={user?.email}
      />
    </div>
  );
}
