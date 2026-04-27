"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = "fr" | "en" | "es" | "ja";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextType>({
  locale: "fr",
  setLocale: () => {},
  t: (key) => key,
});

// ─── Messages cache ───────────────────────────────────────────────────────────

const messagesCache: Partial<Record<Locale, Record<string, any>>> = {};

async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  if (messagesCache[locale]) return messagesCache[locale]!;
  try {
    const mod = await import(`../messages/${locale}.json`);
    messagesCache[locale] = mod.default ?? mod;
    return messagesCache[locale]!;
  } catch {
    // Fallback sur le français
    if (locale !== "fr") return loadMessages("fr");
    return {};
  }
}

/** Résout une clé imbriquée type "settings.title" dans un objet */
function resolve(obj: Record<string, any>, key: string): string {
  const parts = key.split(".");
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : key;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [messages, setMessages] = useState<Record<string, any>>({});

  // Charge les messages au montage et quand la locale change
  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? localStorage.getItem("app_locale")
      : null) as Locale | null;
    const initial: Locale = (saved && ["fr", "en", "es", "ja"].includes(saved))
      ? (saved as Locale)
      : "fr";
    setLocaleState(initial);
    loadMessages(initial).then(setMessages);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") localStorage.setItem("app_locale", next);
    loadMessages(next).then(setMessages);
  }, []);

  const t = useCallback((key: string): string => {
    return resolve(messages, key);
  }, [messages]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage() {
  return useContext(LanguageContext);
}
