import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "./translations";
import { translate } from "./translations";

const STORAGE_KEY = "app_locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    let active = true;

    const loadLocale = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (stored === "es" || stored === "en") {
          setLocaleState(stored);
        }
      } catch (_error) {
        // Keep default locale if storage is unavailable.
      }
    };

    void loadLocale();

    return () => {
      active = false;
    };
  }, []);

  const setLocale = async (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    await AsyncStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
};
