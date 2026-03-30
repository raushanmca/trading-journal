import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import type { StoredUser } from "../../features/auth/types";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useAppDateFormatter } from "../../localization/date";

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
  const trialDaySuffix = trialDaysRemaining === 1 ? "" : "s";

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <div className="app-shell__brand">
            <Link to={isSignedIn ? "/" : "/login"} className="app-shell__logo">
              TJ
            </Link>
            <div>
              <p className="app-shell__title">{t("app.title")}</p>
              <p className="app-shell__subtitle">{t("app.subtitle")}</p>
            </div>
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
              {!user?.isOwner && trialDaysRemaining !== null ? (
                <div
                  className={`app-shell__status${trialDaysRemaining <= 5 ? " app-shell__status--warn" : ""}`}
                >
                  {trialDaysRemaining === 0
                    ? t("nav.trialExpired")
                    : t("nav.trialDaysLeft", {
                        count: trialDaysRemaining,
                        suffix: trialDaySuffix,
                      })}
                </div>
              ) : null}
            </nav>
          ) : null}

          <label className="app-shell__locale">
            <span className="app-shell__locale-label">{t("nav.language")}</span>
            <select
              className="app-shell__locale-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as typeof locale)}
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
                  <span className="app-shell__user-email">{user?.email}</span>
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
                    <span className="app-shell__menu-email">{user?.email}</span>
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

                  <button onClick={onSignOut} className="app-shell__menu-action">
                    {t("nav.signOut")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/login" className="app-shell__sign-in">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </header>

      {children}
    </div>
  );
}
