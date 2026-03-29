import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import JournalForm from "./components/JournalForm";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

interface StoredUser {
  name?: string;
  email?: string;
}

function ProtectedRoute({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean;
  children: JSX.Element;
}) {
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user", error);
        setUser(null);
      }
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
    window.location.assign("/login");
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <div
          style={{
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            background:
              "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <Link
              to={isSignedIn ? "/" : "/login"}
              style={{
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 800,
                letterSpacing: "0.04em",
                fontSize: "15px",
              }}
            >
              TRADING JOURNAL
            </Link>
            {isSignedIn ? (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <Link to="/">Journal</Link>
                <Link to="/dashboard">Dashboard</Link>
              </div>
            ) : null}
          </div>

          {isSignedIn ? (
            <div
              ref={accountMenuRef}
              style={{ position: "relative", display: "flex", gap: "12px" }}
            >
              <button
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  borderRadius: "14px",
                  border: "1px solid #dbe4ee",
                  background: "#ffffff",
                  cursor: "pointer",
                  minWidth: "220px",
                  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}
                >
                  {userInitials || "A"}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: "#0f172a",
                      fontSize: "14px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "140px",
                    }}
                  >
                    {user?.name || "My Account"}
                  </span>
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "140px",
                    }}
                  >
                    {user?.email}
                  </span>
                </div>
                <span style={{ color: "#64748b", fontSize: "12px" }}>
                  {isAccountMenuOpen ? "▲" : "▼"}
                </span>
              </button>

              {isAccountMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: "260px",
                    background: "#ffffff",
                    border: "1px solid #dbe4ee",
                    borderRadius: "16px",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                    padding: "10px",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px 12px",
                      borderBottom: "1px solid #eef2f7",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: "14px",
                      }}
                    >
                      {user?.name || "Signed In"}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      {user?.email}
                    </div>
                  </div>

                  <Link
                    to="/dashboard"
                    onClick={() => setIsAccountMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      color: "#0f172a",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={handleSignOut}
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 700,
                      textAlign: "left",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                letterSpacing: "0.02em",
                background: "#0f172a",
                padding: "10px 16px",
                borderRadius: "10px",
              }}
            >
              Sign In
            </Link>
          )}
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute isSignedIn={isSignedIn}>
                <JournalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isSignedIn={isSignedIn}>
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
      </BrowserRouter>
    </DndProvider>
  );
}

export default App;
