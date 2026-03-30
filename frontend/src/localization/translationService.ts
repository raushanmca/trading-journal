import {
  defaultLocale,
  messageCatalog,
  supportedLocales,
} from "./messageCatalog";
import type { AppLocale } from "./messageCatalog";

const LOCALE_STORAGE_KEY = "app-locale";

export function isSupportedLocale(locale: string): locale is AppLocale {
  return supportedLocales.includes(locale as AppLocale);
}

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return storedLocale && isSupportedLocale(storedLocale)
    ? storedLocale
    : defaultLocale;
}

export function persistLocale(locale: AppLocale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function translate(
  locale: AppLocale,
  key: string,
  values?: Record<string, string | number>,
) {
  const template =
    messageCatalog[locale][key] ?? messageCatalog[defaultLocale][key] ?? key;

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (message, [token, value]) =>
      message.replaceAll(`{${token}}`, String(value)),
    template,
  );
}
