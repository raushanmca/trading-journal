import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  getAuthHeaders,
  getStoredUser,
  getTrialDaysRemaining,
} from "../../../utils/auth";
import { getApiBaseUrl } from "../../../utils/api";
import type { StoredUser } from "../types";

const BASE_URL = getApiBaseUrl();

export function useAuthSession() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
    null,
  );
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const clearSession = (shouldRedirect = false) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAccountMenuOpen(false);
    window.dispatchEvent(new Event("auth-changed"));

    if (shouldRedirect) {
      window.location.assign(`${import.meta.env.BASE_URL}login`);
    }
  };

  useEffect(() => {
    const syncUser = async () => {
      const storedUser = getStoredUser();
      setUser(storedUser);

      const authHeaders = getAuthHeaders();

      if (!authHeaders.Authorization) {
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/auth/me`, {
          headers: authHeaders,
        });
        const latestUser = response.data?.user;

        if (latestUser) {
          localStorage.setItem("user", JSON.stringify(latestUser));
          setUser(latestUser);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401 || status === 403 || status === 404) {
            clearSession(true);
            return;
          }
        }
        console.error("Failed to refresh user session", error);
      }
    };

    syncUser();

    const handleSync = () => {
      void syncUser();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("auth-changed", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("auth-changed", handleSync);
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

  useEffect(() => {
    const updateTrialDays = () => {
      setTrialDaysRemaining(getTrialDaysRemaining(user));
    };

    updateTrialDays();

    if (!user?.trialEndsAt || user?.isOwner) {
      return;
    }

    const intervalId = window.setInterval(updateTrialDays, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  const signOut = () => {
    clearSession(true);
  };

  return {
    accountMenuRef,
    isAccountMenuOpen,
    isSignedIn,
    setIsAccountMenuOpen,
    signOut,
    trialDaysRemaining,
    user,
    userInitials,
  };
}
