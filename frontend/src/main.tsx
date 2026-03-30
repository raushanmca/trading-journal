import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LocalizationProvider } from "./localization/LocalizationProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalizationProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </LocalizationProvider>
  </StrictMode>,
);
