import { useLocalization } from "../localization/LocalizationProvider";

export default function AboutPage() {
  const { t } = useLocalization();

  return (
    <div className="info-page">
      <section className="info-page__hero">
        <div>
          <span className="info-page__eyebrow">{t("about.eyebrow")}</span>
          <h1>{t("about.title")}</h1>
          <p>{t("about.lead")}</p>
        </div>

        <div className="info-page__hero-card">
          <strong>{t("about.heroCardTitle")}</strong>
          <p>{t("about.heroCardBody")}</p>
        </div>
      </section>

      <section className="info-page__grid">
        <article className="info-page__panel">
          <span className="info-page__chip">{t("about.missionChip")}</span>
          <h2>{t("about.missionTitle")}</h2>
          <p>{t("about.missionBody")}</p>
        </article>

        <article className="info-page__panel">
          <span className="info-page__chip">{t("about.usersChip")}</span>
          <h2>{t("about.usersTitle")}</h2>
          <ul className="info-page__list">
            <li>{t("about.userNew")}</li>
            <li>{t("about.userActive")}</li>
            <li>{t("about.userPremium")}</li>
            <li>{t("about.userAdmin")}</li>
          </ul>
        </article>
      </section>

      <section className="info-page__panel info-page__panel--wide">
        <div className="info-page__section-head">
          <span className="info-page__chip">{t("about.valuesChip")}</span>
          <h2>{t("about.valuesTitle")}</h2>
        </div>

        <div className="info-page__cards">
          <article className="info-page__mini-card">
            <h3>{t("about.valueClarityTitle")}</h3>
            <p>{t("about.valueClarityBody")}</p>
          </article>
          <article className="info-page__mini-card">
            <h3>{t("about.valueConsistencyTitle")}</h3>
            <p>{t("about.valueConsistencyBody")}</p>
          </article>
          <article className="info-page__mini-card">
            <h3>{t("about.valueGrowthTitle")}</h3>
            <p>{t("about.valueGrowthBody")}</p>
          </article>
          <article className="info-page__mini-card">
            <h3>{t("about.contactTitle")}</h3>
            <p>{t("about.contactBody")}</p>
            <p>
              <a href="mailto:ranajeemca@gmail.com">ranajeemca@gmail.com</a>
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
