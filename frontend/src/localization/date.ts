import { useLocalization } from "./LocalizationProvider";

export function useAppDateFormatter() {
  const { locale } = useLocalization();
  const dateLocale = locale === "hi" ? "hi-IN" : "en-IN";

  const formatLongDate = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatCompactDate = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale);

  return {
    formatCompactDate,
    formatLongDate,
    formatShortDate,
  };
}
