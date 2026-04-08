import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import JournalForm from "../../components/JournalForm";
import Login from "../../components/Login";
import AboutPage from "../../components/AboutPage";
import HelpPage from "../../components/HelpPage";
import { ProtectedRoute } from "./ProtectedRoute";
import type { StoredUser } from "../../features/auth/types";

const Dashboard = lazy(() => import("../../components/Dashboard"));
const AdminUserList = lazy(() =>
  import("../../components/AdminUserList").then((module) => ({
    default: module.AdminUserList,
  })),
);

function RouteLoadingFallback() {
  return (
    <div className="dashboard-page dashboard-page--loading">
      <div className="dashboard-loading-card">
        <span className="login-panel__spinner login-panel__spinner--dark" />
      </div>
    </div>
  );
}

interface AppRoutesProps {
  isSignedIn: boolean;
  user: StoredUser | null;
}

export function AppRoutes({ isSignedIn, user }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
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
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProtectedRoute isSignedIn={isSignedIn} user={user} allowExpired>
              <Dashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProtectedRoute isSignedIn={isSignedIn} user={user}>
              {user?.email === "rshan45@gmail.com" ? (
                <AdminUserList />
              ) : (
                <Navigate to="/" replace />
              )}
            </ProtectedRoute>
          </Suspense>
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
  );
}
