import enMessagesRaw from "./messages/en.properties?raw";
import hiMessagesRaw from "./messages/hi.properties?raw";
import { parseProperties } from "./propertyParser";

export const supportedLocales = ["en", "hi"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en";

export const messageCatalog: Record<AppLocale, Record<string, string>> = {
  en: parseProperties(enMessagesRaw),
  hi: parseProperties(hiMessagesRaw),
};
