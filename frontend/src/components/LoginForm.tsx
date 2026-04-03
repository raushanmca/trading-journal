import { useState, type FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";

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

  const handleAuthSuccess = (payload: { token: string; user: any }) => {
    localStorage.setItem("token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
    window.dispatchEvent(new Event("auth-changed"));

    if (payload.user?.isTrialExpired) {
      alert(t("login.alert.trialExpired"));
      navigate("/dashboard");
      onComplete?.();
      return;
    }

    alert(t("login.alert.success"));
    navigate("/dashboard");
    onComplete?.();
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true);
    try {
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential,
      });
      handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || t("login.alert.failed"));
        setIsGoogleLoading(false);
        return;
      }
      alert(t("login.alert.failed"));
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setIsGoogleLoading(false);
    alert(t("login.alert.googleFailed"));
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
      handleAuthSuccess(res.data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || t("login.alert.failed"));
      } else {
        alert(t("login.alert.failed"));
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  const isBusy = isGoogleLoading || isFormLoading;

  return (
    <div className="login-panel__stack">
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
            ? t("login.formLoading")
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
