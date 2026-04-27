"use client";

/**
 * SettingsPageShared.tsx
 * Composant partagé pour la page Paramètres - tous les rôles.
 * Traçabilité visible uniquement pour ADMIN et SUPER-ADMIN.
 * Apparence commentée - thème noir ardoise par défaut.
 */

import { useState, useEffect } from "react";
import {
  Settings2, ChevronRight, X,
  Bell, Activity, Globe, Clock, Check,
  Mail, Phone, User, Languages,
  Zap, Radio, Users, Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { authService } from "../../services/AuthService";
import { useActivityLogs, ActivityLog } from "../../hooks/common/useActivityLogs";
import ActivityDetailsModal from "./ActivityDetailsModal";
import { useLanguage } from "../../contexts/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { id: "1",  bg: "bg-slate-900"   }, { id: "2",  bg: "bg-rose-600"    },
  { id: "3",  bg: "bg-blue-600"    }, { id: "4",  bg: "bg-emerald-600" },
  { id: "5",  bg: "bg-amber-500"   }, { id: "6",  bg: "bg-violet-600"  },
  { id: "7",  bg: "bg-cyan-600"    }, { id: "8",  bg: "bg-pink-600"    },
  { id: "9",  bg: "bg-orange-600"  }, { id: "10", bg: "bg-teal-600"    },
  { id: "11", bg: "bg-indigo-600"  }, { id: "12", bg: "bg-lime-600"    },
];

const LANGS = [
  { code: "fr", flag: "FR", label: "Français" },
  { code: "en", flag: "EN", label: "English"  },
  { code: "es", flag: "ES", label: "Español"  },
  { code: "ja", flag: "JA", label: "日本語"   },
  { code: "ar", flag: "AR", label: "العربية"  },
];

const NOTIFS = [
  { key: "tickets_new",  Icon: Zap,      fr: "Nouveaux tickets créés",    en: "New tickets created",  defaultOn: true  },
  { key: "tickets_late", Icon: Clock,    fr: "Tickets en retard",         en: "Overdue tickets",      defaultOn: true  },
  { key: "planning",     Icon: Radio,    fr: "Modifications de planning", en: "Schedule changes",     defaultOn: false },
  { key: "providers",    Icon: Users,    fr: "Nouveaux prestataires",     en: "New providers",        defaultOn: false },
  { key: "reports",      Icon: Activity, fr: "Rapports hebdomadaires",    en: "Weekly reports",       defaultOn: true  },
];

// Rôles autorisés à voir la Traçabilité
const ADMIN_ROLES = ["ADMIN", "SUPER-ADMIN"];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-slate-900" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

type PanelType = "advanced" | null;

interface PanelProps {
  open: boolean;
  advTab: string;
  setAdvTab: (t: string) => void;
  onClose: () => void;
  lang: string;
  setLang: (l: string) => void;
  trackOn: boolean;
  setTrackOn: (v: boolean) => void;
  notifs: Record<string, boolean>;
  setNotifs: (n: any) => void;
  onSave: () => void;
  activityLogs?: ActivityLog[];
  isLoadingLogs?: boolean;
  errorLogs?: string | null;
  onLogClick?: (log: ActivityLog) => void;
  role: string;
}

function SettingsSidePanel({
  open, advTab, setAdvTab, onClose,
  lang, setLang,
  trackOn, setTrackOn,
  notifs, setNotifs,
  onSave,
  activityLogs, isLoadingLogs, errorLogs, onLogClick,
  role,
}: PanelProps) {
  if (!open) return null;

  const { t } = useLanguage();
  const isAdmin = ADMIN_ROLES.includes(role.toUpperCase());
  const activeNotifCount = Object.values(notifs).filter(Boolean).length;

  const tabs = [
    { key: "notifications", Icon: Bell,      label: "Notifications" },
    ...(isAdmin ? [{ key: "tracking", Icon: Activity, label: "Traçabilité" }] : []),
    { key: "language",      Icon: Languages, label: "Langue"        },
    // Apparence commentée - thème noir ardoise par défaut
    // { key: "appearance", Icon: Palette, label: "Apparence" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white z-50 shadow-2xl flex flex-col rounded-l-[2rem] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 shrink-0 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">{t("settings.title") !== "settings.title" ? t("settings.title") : "Paramètres avancés"}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{t("settings.subtitle") !== "settings.subtitle" ? t("settings.subtitle") : "Personnalisez votre expérience"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-7 pt-5 shrink-0">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            {tabs.map(tb => {
              const { Icon } = tb;
              const active = advTab === tb.key;
              return (
                <button
                  key={tb.key}
                  onClick={() => setAdvTab(tb.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={13} />
                  {tb.key === "notifications" ? (t("settings.notifications") !== "settings.notifications" ? t("settings.notifications") : "Notifications") :
                   tb.key === "language"      ? (t("settings.language")      !== "settings.language"      ? t("settings.language")      : "Langue") :
                   tb.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* Notifications */}
          {advTab === "notifications" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {activeNotifCount}/{NOTIFS.length} {t("common.active") !== "common.active" ? t("common.active").toLowerCase() + "s" : "activées"}
                </p>
                <button
                  onClick={() => {
                    const allOn = Object.values(notifs).every(Boolean);
                    setNotifs(Object.fromEntries(NOTIFS.map(n => [n.key, !allOn])));
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 underline underline-offset-2 transition"
                >
                  {Object.values(notifs).every(Boolean) ? "Tout désactiver" : "Tout activer"}
                </button>
              </div>
              <div className="space-y-1">
                {NOTIFS.map(n => {
                  const { Icon } = n;
                  return (
                    <div key={n.key} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-slate-500" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm flex-1">
                        {lang === "en" ? n.en : n.fr}
                      </p>
                      <Toggle on={notifs[n.key]} onChange={() => setNotifs({ ...notifs, [n.key]: !notifs[n.key] })} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Traçabilité - admin/super-admin uniquement */}
          {advTab === "tracking" && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Activity size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">Traçabilité globale</p>
                    <p className="text-xs text-slate-400 mt-0.5">Enregistre toutes les actions utilisateurs</p>
                  </div>
                </div>
                <Toggle on={trackOn} onChange={() => setTrackOn(!trackOn)} />
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={12} /> Journal d'activité récente
                </p>
                <div className="space-y-2">
                  {errorLogs ? (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium">
                      Erreur : {errorLogs}
                    </div>
                  ) : isLoadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-3 opacity-30" />
                      <p className="text-xs font-medium">Chargement...</p>
                    </div>
                  ) : !activityLogs?.length ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Activity size={24} className="text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Aucune activité enregistrée.</p>
                    </div>
                  ) : (
                    activityLogs.map((log, i) => (
                      <div
                        key={i}
                        onClick={() => onLogClick?.(log)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-xs font-black text-white">
                            {log.user?.first_name?.[0]?.toUpperCase() || log.user?.email?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {log.user?.first_name ? `${log.user.first_name} ${log.user.last_name || ""}`.trim() : log.user?.email || "Utilisateur"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{log.action}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Langue */}
          {advTab === "language" && (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                {t("settings.languageSubtitle") !== "settings.languageSubtitle" ? t("settings.languageSubtitle") : "Langue de l'interface"}
              </p>
              {LANGS.map(l => {
                const active = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition ${
                      active ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {l.flag}
                    </div>
                    <p className={`font-bold text-sm flex-1 text-left ${active ? "text-slate-900" : "text-slate-500"}`}>
                      {l.label}
                    </p>
                    {active && (
                      <span className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black">
                        <Check size={10} /> {t("common.active") !== "common.active" ? t("common.active") : "Actif"}
                      </span>
                    )}
                  </button>
                );
              })}
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                <Zap size={11} /> Changement immédiat et persistant.
              </p>
            </div>
          )}

          {/* Apparence - commentée, thème noir ardoise par défaut */}
          {/* {advTab === "appearance" && <ThemePicker />} */}

        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-100 shrink-0">
          <button
            onClick={onSave}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
          >
            <Check size={15} /> Enregistrer les préférences
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Props du composant principal ─────────────────────────────────────────────

interface SettingsPageSharedProps {
  /** Nombre de notifications non lues (passé par le hook du rôle) */
  unreadCount?: number;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SettingsPageShared({ unreadCount = 0 }: SettingsPageSharedProps) {
  const [panel, setPanel]     = useState<PanelType>(null);
  const [advTab, setAdvTab]   = useState("notifications");
  const [trackOn, setTrackOn] = useState(true);
  const [notifs, setNotifs]   = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFS.map(n => [n.key, n.defaultOn]))
  );
  const [role, setRole] = useState("");

  // Langue via le contexte global (persistant dans localStorage)
  const { locale, setLocale } = useLanguage();
  const lang    = locale;
  const setLang = (l: string) => setLocale(l as any);

  const { logs: activityLogs, loading: isLoadingLogs, error: logsError } = useActivityLogs();
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    setRole(authService.getRole());
  }, []);

  const isAdmin = ADMIN_ROLES.includes(role.toUpperCase());

  const tiles = [
    {
      key:    "notifications",
      Icon:   Bell,
      label:  "Notifications",
      sub:    `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`,
      accent: "text-amber-500",
      bg:     "bg-amber-50",
      ring:   "ring-amber-200",
    },
    ...(isAdmin ? [{
      key:    "tracking",
      Icon:   Activity,
      label:  "Traçabilité",
      sub:    trackOn ? "Active" : "Désactivée",
      accent: "text-emerald-600",
      bg:     "bg-emerald-50",
      ring:   "ring-emerald-200",
    }] : []),
    {
      key:    "language",
      Icon:   Globe,
      label:  "Langue",
      sub:    LANGS.find(l => l.code === lang)?.label ?? "Français",
      accent: "text-sky-600",
      bg:     "bg-sky-50",
      ring:   "ring-sky-200",
    },
    // Apparence commentée - thème noir ardoise par défaut
    // { key: "appearance", Icon: Palette, label: "Apparence", sub: "Thème de couleur", accent: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200" },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          {/* Centrage vertical + horizontal avec padding généreux */}
          <div className="min-h-full flex flex-col px-6 py-10">
            <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col gap-8">

              <PageHeader title="Paramètres" subtitle="Gérez votre compte et vos préférences" />

              {/* Card Paramètres avancés */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">

                {/* Header card */}
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                    <Settings2 size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm tracking-tight">Paramètres avancés</p>
                    <p className="text-xs text-slate-400 mt-0.5">Notifications, langue{isAdmin ? ", traçabilité" : ""}</p>
                  </div>
                </div>

                {/* Tiles */}
                <div className="p-6 grid grid-cols-1 gap-3">
                  {tiles.map(tile => {
                    const { Icon } = tile;
                    return (
                      <button
                        key={tile.key}
                        onClick={() => { setAdvTab(tile.key); setPanel("advanced"); }}
                        className="flex items-center gap-5 p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 hover:shadow-sm transition-all group text-left"
                      >
                        <div className={`w-12 h-12 rounded-2xl ${tile.bg} flex items-center justify-center shrink-0 ring-1 ${tile.ring}`}>
                          <Icon size={20} className={tile.accent} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-base">{tile.label}</p>
                          <p className="text-sm text-slate-400 mt-0.5 truncate">{tile.sub}</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Side Panel */}
      <SettingsSidePanel
        open={panel !== null}
        advTab={advTab}
        setAdvTab={setAdvTab}
        onClose={() => setPanel(null)}
        lang={lang}
        setLang={setLang}
        trackOn={trackOn}
        setTrackOn={setTrackOn}
        notifs={notifs}
        setNotifs={setNotifs}
        onSave={() => setPanel(null)}
        activityLogs={activityLogs}
        isLoadingLogs={isLoadingLogs}
        errorLogs={logsError}
        role={role}
        onLogClick={(log) => { setSelectedLog(log); setShowLogModal(true); }}
      />

      <ActivityDetailsModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        log={selectedLog}
      />
    </div>
  );
}
