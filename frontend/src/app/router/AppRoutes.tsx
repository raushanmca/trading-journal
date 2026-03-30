import { Navigate, Route, Routes } from "react-router-dom";
import JournalForm from "../../components/JournalForm";
import Dashboard from "../../components/Dashboard";
import Login from "../../components/Login";
import { ProtectedRoute } from "./ProtectedRoute";
import type { StoredUser } from "../../features/auth/types";

interface AppRoutesProps {
  isSignedIn: boolean;
  user: StoredUser | null;
}

export function AppRoutes({ isSignedIn, user }: AppRoutesProps) {
  return (
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
          <ProtectedRoute isSignedIn={isSignedIn} user={user} allowExpired>
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
  );
}
