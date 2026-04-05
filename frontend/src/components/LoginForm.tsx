import { useState, type FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";
import { showToast } from "../utils/toast";

type LoginFormProps = {
  onComplete?: () => void;
};

export default function LoginForm({ onComplete }: LoginFormProps) {
  const navigate = useNavigate();
  const apiUrl = getApiBaseUrl();
  const { t } = useLocalization();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const waitForSpinner = () =>
    new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });

  const handleAuthSuccess = async (payload: { token: string; user: any }) => {
    await waitForSpinner();
    localStorage.setItem("token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
    window.dispatchEvent(new Event("auth-changed"));

    if (payload.user?.isTrialExpired) {
      showToast(t("login.alert.trialExpired"), "warning");
      navigate("/dashboard");
      onComplete?.();
      return;
    }

    navigate("/dashboard");
    onComplete?.();
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true);
    try {
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential,
      });
      await handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        showToast(err.response?.data?.message || t("login.alert.failed"), "error");
        setIsGoogleLoading(false);
        return;
      }
      showToast(t("login.alert.failed"), "error");
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setIsGoogleLoading(false);
    showToast(t("login.alert.googleFailed"), "error");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;
    setIsFormLoading(true);
    try {
      const endpoint = mode === "login" ? "login" : "register";
      const res = await axios.post(`${apiUrl}/api/auth/${endpoint}`, {
        email,
        password,
      });
      await handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        showToast(err.response?.data?.message || t("login.alert.failed"), "error");
      } else {
        showToast(t("login.alert.failed"), "error");
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  const isBusy = isGoogleLoading || isFormLoading;

  return (
    <div className="login-panel__stack">
      {isBusy ? (
        <div className="login-panel__status" role="status" aria-live="polite">
          <span className="login-panel__spinner login-panel__spinner--dark" />
          <span>{t("login.loading")}</span>
        </div>
      ) : null}

      <div className="login-panel__google">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap
          theme="filled_blue"
          size="large"
          text="continue_with"
        />
        {isGoogleLoading ? (
          <div className="login-panel__google-loading">
            <span className="login-panel__spinner" />
            <span>{t("login.loading")}</span>
          </div>
        ) : null}
      </div>

      <div className="login-panel__divider">
        <span>{t("login.or")}</span>
      </div>

      <form className="login-panel__form" onSubmit={handleSubmit}>
        <label className="login-panel__label" htmlFor="auth-email">
          {t("login.formEmail")}
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          className="login-panel__input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isBusy}
          required
        />

        <label className="login-panel__label" htmlFor="auth-password">
          {t("login.formPassword")}
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="login-panel__input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isBusy}
          required
          minLength={6}
        />

        <button className="login-panel__submit" type="submit" disabled={isBusy}>
          {isFormLoading
            ? (
                <>
                  <span className="login-panel__spinner" />
                  <span>{t("login.formLoading")}</span>
                </>
              )
            : mode === "login"
              ? t("login.formSubmit")
              : t("login.formRegister")}
        </button>
      </form>

      <button
        type="button"
        className="login-panel__toggle"
        onClick={() =>
          setMode((prev) => (prev === "login" ? "register" : "login"))
        }
        disabled={isBusy}
      >
        {mode === "login"
          ? t("login.formToggleToRegister")
          : t("login.formToggleToLogin")}
      </button>
    </div>
  );
}
