import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  getStoredUser,
  getTrialDaysRemaining,
  isTrialExpired,
} from "./utils/auth";

import JournalForm from "./components/JournalForm";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import "./App.css";

interface StoredUser {
  name?: string;
  email?: string;
  isOwner?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isTrialExpired?: boolean;
  trialDays?: number;
}

function ProtectedRoute({
  isSignedIn,
  user,
  allowExpired = false,
  children,
}: {
  isSignedIn: boolean;
  user: StoredUser | null;
  allowExpired?: boolean;
  children: JSX.Element;
}) {
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!allowExpired && isTrialExpired(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = getStoredUser();

      if (!storedUser) {
        setUser(null);
        return;
      }
      setUser(storedUser);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-changed", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-changed", syncUser);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const isSignedIn = Boolean(user?.name || user?.email);
  const trialDaysRemaining = getTrialDaysRemaining(user);
  const userLabel = user?.name || user?.email || "Account";
  const userInitials = userLabel
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAccountMenuOpen(false);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="app-shell">
          <header className="app-shell__header">
            <div className="app-shell__header-inner">
              <div className="app-shell__brand">
                <Link to={isSignedIn ? "/" : "/login"} className="app-shell__logo">
                  TJ
                </Link>
                <div>
                  <p className="app-shell__title">Trading Journal</p>
                  <p className="app-shell__subtitle">
                    Capture your setups, mistakes, and momentum in one place.
                  </p>
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
                    Journal
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `app-shell__nav-link${isActive ? " app-shell__nav-link--active" : ""}`
                    }
                  >
                    Dashboard
                  </NavLink>
                  {!user?.isOwner && trialDaysRemaining !== null ? (
                    <div
                      className={`app-shell__status${trialDaysRemaining <= 5 ? " app-shell__status--warn" : ""}`}
                    >
                      {trialDaysRemaining === 0
                        ? "Trial expired"
                        : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left`}
                    </div>
                  ) : null}
                </nav>
              ) : null}

              {isSignedIn ? (
                <div ref={accountMenuRef} className="app-shell__user">
                  <button
                    onClick={() => setIsAccountMenuOpen((open) => !open)}
                    className="app-shell__user-button"
                  >
                    <div className="app-shell__avatar">{userInitials || "A"}</div>
                    <div className="app-shell__user-meta">
                      <span className="app-shell__user-name">
                        {user?.name || "My Account"}
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
                          {user?.name || "Signed In"}
                        </span>
                        <span className="app-shell__menu-email">{user?.email}</span>
                        {!user?.isOwner && user?.trialEndsAt ? (
                          <div className="app-shell__menu-trial">
                            {trialDaysRemaining === 0
                              ? "Trial access expired"
                              : `Trial ends on ${new Date(user.trialEndsAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}`}
                          </div>
                        ) : null}
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="app-shell__menu-link"
                      >
                        Dashboard
                      </Link>

                      <button onClick={handleSignOut} className="app-shell__menu-action">
                        Sign Out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link to="/login" className="app-shell__sign-in">
                  Sign In
                </Link>
              )}
            </div>
          </header>

          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute isSignedIn={isSignedIn} user={user}>
                  <JournalForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  isSignedIn={isSignedIn}
                  user={user}
                  allowExpired
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={isSignedIn ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
              path="*"
              element={<Navigate to={isSignedIn ? "/" : "/login"} replace />}
            />
          </Routes>
        </div>
      </BrowserRouter>
    </DndProvider>
  );
}

export default App;
