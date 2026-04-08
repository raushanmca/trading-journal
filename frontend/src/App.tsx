import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { AppShell } from "./app/layout/AppShell";
import { getDragDropBackend } from "./app/dnd/dndBackend";
import { AppRoutes } from "./app/router/AppRoutes";
import { useAuthSession } from "./features/auth/hooks/useAuthSession";
import { prefetchAdminData } from "./features/admin/adminData";
import { prefetchDashboardTrades } from "./features/dashboard/dashboardData";
import "./App.css";

function App() {
  const {
    accountMenuRef,
    isAccountMenuOpen,
    isSignedIn,
    setIsAccountMenuOpen,
    signOut,
    trialDaysRemaining,
    user,
    userInitials,
  } = useAuthSession();
  const dndBackend = getDragDropBackend();

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    void prefetchDashboardTrades();

    if (user?.email === "rshan45@gmail.com") {
      void prefetchAdminData();
    }
  }, [isSignedIn, user?.email]);

  return (
    <DndProvider backend={dndBackend.backend} options={dndBackend.options}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell
          accountMenuRef={accountMenuRef}
          isAccountMenuOpen={isAccountMenuOpen}
          isSignedIn={isSignedIn}
          onSignInMenuToggle={() => setIsAccountMenuOpen((open) => !open)}
          onSignOut={signOut}
          setIsAccountMenuOpen={setIsAccountMenuOpen}
          trialDaysRemaining={trialDaysRemaining}
          user={user}
          userInitials={userInitials}
        >
          <AppRoutes isSignedIn={isSignedIn} user={user} />
        </AppShell>
      </BrowserRouter>
    </DndProvider>
  );
}

export default App;
