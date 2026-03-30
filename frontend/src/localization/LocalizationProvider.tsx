import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultLocale, supportedLocales, type AppLocale } from "./messageCatalog";
import {
  getStoredLocale,
  persistLocale,
  translate,
} from "./translationService";

interface LocalizationContextValue {
  locale: AppLocale;
  locales: readonly AppLocale[];
  setLocale: (locale: AppLocale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(getStoredLocale);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      locales: supportedLocales,
      setLocale: (nextLocale) => {
        persistLocale(nextLocale);
        setLocaleState(nextLocale);
      },
      t: (key, values) => translate(locale ?? defaultLocale, key, values),
    }),
    [locale],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }

  return context;
}
