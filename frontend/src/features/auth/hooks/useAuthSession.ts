import { useEffect, useRef, useState } from "react";
import { getStoredUser, getTrialDaysRemaining } from "../../../utils/auth";
import type { StoredUser } from "../types";

export function useAuthSession() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = getStoredUser();
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

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAccountMenuOpen(false);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.assign(`${import.meta.env.BASE_URL}login`);
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
