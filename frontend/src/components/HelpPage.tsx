import { useLocalization } from "../localization/LocalizationProvider";

export default function HelpPage() {
  const { t } = useLocalization();

  return (
    <div className="info-page">
      <section className="info-page__hero info-page__hero--help">
        <div>
          <span className="info-page__eyebrow">{t("help.eyebrow")}</span>
          <h1>{t("help.title")}</h1>
          <p>{t("help.lead")}</p>
        </div>

        <div className="info-page__hero-card">
          <strong>{t("help.quickStartTitle")}</strong>
          <p>{t("help.quickStartBody")}</p>
        </div>
      </section>

      <section className="info-page__grid">
        <article className="info-page__panel">
          <span className="info-page__chip">{t("help.gettingStartedChip")}</span>
          <h2>{t("help.gettingStartedTitle")}</h2>
          <ol className="info-page__list info-page__list--ordered">
            <li>{t("help.stepOne")}</li>
            <li>{t("help.stepTwo")}</li>
            <li>{t("help.stepThree")}</li>
            <li>{t("help.stepFour")}</li>
          </ol>
        </article>

        <article className="info-page__panel">
          <span className="info-page__chip">{t("help.userTypesChip")}</span>
          <h2>{t("help.userTypesTitle")}</h2>
          <ul className="info-page__list">
            <li>{t("help.userGuest")}</li>
            <li>{t("help.userTrial")}</li>
            <li>{t("help.userPremium")}</li>
            <li>{t("help.userAdmin")}</li>
          </ul>
        </article>
      </section>

      <section className="info-page__panel info-page__panel--wide">
        <div className="info-page__section-head">
          <span className="info-page__chip">{t("help.faqChip")}</span>
          <h2>{t("help.faqTitle")}</h2>
        </div>

        <div className="info-page__faq">
          <article className="info-page__faq-item">
            <h3>{t("help.faqOneTitle")}</h3>
            <p>{t("help.faqOneBody")}</p>
          </article>
          <article className="info-page__faq-item">
            <h3>{t("help.faqTwoTitle")}</h3>
            <p>{t("help.faqTwoBody")}</p>
          </article>
          <article className="info-page__faq-item">
            <h3>{t("help.faqThreeTitle")}</h3>
            <p>{t("help.faqThreeBody")}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
