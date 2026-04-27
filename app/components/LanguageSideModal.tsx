"use client";

import { X, Check, Globe } from "lucide-react";
import { useLanguage, Locale } from "../../contexts/LanguageContext";

// ─── Config langues ───────────────────────────────────────────────────────────

const LANGUAGES: { code: Locale; label: string; nativeLabel: string; flag: string }[] = [
  { code: "fr", label: "Français",  nativeLabel: "Français",  flag: "🇫🇷" },
  { code: "en", label: "English",   nativeLabel: "English",   flag: "🇬🇧" },
  { code: "es", label: "Español",   nativeLabel: "Español",   flag: "🇪🇸" },
  { code: "ja", label: "日本語",    nativeLabel: "日本語",    flag: "🇯🇵" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LanguageSideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function LanguageSideModal({ isOpen, onClose }: LanguageSideModalProps) {
  const { locale, setLocale, t } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = (code: Locale) => {
    setLocale(code);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white z-[70] shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {t("settings.languageTitle")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("settings.languageSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Langue actuelle */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {t("settings.currentLanguage")}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg">{LANGUAGES.find(l => l.code === locale)?.flag}</span>
            <span className="text-sm font-bold text-slate-900">
              {LANGUAGES.find(l => l.code === locale)?.nativeLabel}
            </span>
          </div>
        </div>

        {/* Liste des langues */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {LANGUAGES.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-slate-900 bg-slate-900"
                    : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {/* Drapeau */}
                <span className="text-2xl shrink-0">{lang.flag}</span>

                {/* Nom */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {lang.nativeLabel}
                  </p>
                  {lang.nativeLabel !== lang.label && (
                    <p className={`text-xs mt-0.5 ${isSelected ? "text-white/60" : "text-slate-400"}`}>
                      {lang.label}
                    </p>
                  )}
                </div>

                {/* Check si sélectionné */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <Check size={13} className="text-slate-900" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </>
  );
}
