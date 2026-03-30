import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // if you're using react-router
import { getApiBaseUrl } from "../utils/api";
import { useLocalization } from "../localization/LocalizationProvider";

export default function Login() {
  const navigate = useNavigate();
  const apiUrl = getApiBaseUrl();
  const { t } = useLocalization();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential, // Google ID token
      });

      // Save token (use httpOnly cookie on backend is more secure, but localStorage for simplicity)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("auth-changed"));

      if (res.data.user?.isTrialExpired) {
        alert(t("login.alert.trialExpired"));
        navigate("/dashboard");
        return;
      }

      alert(t("login.alert.success"));
      navigate("/dashboard"); // or wherever your main app is
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || t("login.alert.failed"));
        return;
      }

      alert(t("login.alert.failed"));
    }
  };

  const handleGoogleError = () => {
    alert(t("login.alert.googleFailed"));
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div>
          <span className="login-hero__eyebrow">{t("login.heroEyebrow")}</span>
          <h1>{t("login.heroTitle")}</h1>
          <p>{t("login.heroDescription")}</p>
        </div>

        <div className="login-hero__grid">
          <div className="login-hero__metric">
            <span>{t("login.metricJournal")}</span>
            <small>{t("login.metricJournalDesc")}</small>
          </div>
          <div className="login-hero__metric">
            <span>{t("login.metricReview")}</span>
            <small>{t("login.metricReviewDesc")}</small>
          </div>
          <div className="login-hero__metric">
            <span>{t("login.metricImprove")}</span>
            <small>{t("login.metricImproveDesc")}</small>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__eyebrow">{t("login.eyebrow")}</div>
        <h2>{t("login.title")}</h2>
        <p className="login-panel__lead">{t("login.description")}</p>

        <div className="login-panel__stack">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="filled_blue"
            size="large"
            text="continue_with"
          />

          <button
            onClick={() => (window.location.href = `${apiUrl}/api/auth/github`)}
            className="login-panel__github"
          >
            {t("login.github")}
          </button>
        </div>

        <p className="login-panel__note">{t("login.note")}</p>
      </section>
    </div>
  );
}
