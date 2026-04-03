import LoginForm from "./LoginForm";
import { useLocalization } from "../localization/LocalizationProvider";

export default function Login() {
  const { t } = useLocalization();

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
        <LoginForm />

        <p className="login-panel__note">{t("login.note")}</p>
      </section>
    </div>
  );
}
