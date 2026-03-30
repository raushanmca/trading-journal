import { Navigate } from "react-router-dom";
import { isTrialExpired } from "../../utils/auth";
import type { StoredUser } from "../../features/auth/types";

interface ProtectedRouteProps {
  isSignedIn: boolean;
  user: StoredUser | null;
  allowExpired?: boolean;
  children: JSX.Element;
}

export function ProtectedRoute({
  isSignedIn,
  user,
  allowExpired = false,
  children,
}: ProtectedRouteProps) {
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!allowExpired && isTrialExpired(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
