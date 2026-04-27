"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Bell, Ticket, MapPin, Building2, FileText,
  Receipt, Users, Settings, ChevronRight, CheckCheck,
  Trash2, ExternalLink, ArrowLeft,
} from "lucide-react";
import { useNotifications, Notification, NotifSource } from "../../hooks/admin/useNotifications";
import { useLanguage } from "../../contexts/LanguageContext";

// ── Helpers temps relatif ────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)                return "À l'instant";
  if (diff < 3600)              return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)             return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7)         return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ── Config par source ────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<NotifSource, {
  label: string; Icon: React.ElementType;
  iconBg: string; iconColor: string; dotColor: string;
}> = {
  ticket:      { label: "Ticket",      Icon: Ticket,    iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  site:        { label: "Site",        Icon: MapPin,    iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
  prestataire: { label: "Prestataire", Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  patrimoine:  { label: "Patrimoine",  Icon: Building2, iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#1f2937" },
  facture:     { label: "Facture",     Icon: Receipt,   iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#111827" },
  devis:       { label: "Devis",       Icon: FileText,  iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
  utilisateur: { label: "Utilisateur", Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  système:     { label: "Système",     Icon: Settings,  iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#1f2937" },
};

function getCfg(source: NotifSource) {
  return SOURCE_CONFIG[source] ?? SOURCE_CONFIG["système"];
}

// ── SourceIcon ───────────────────────────────────────────────────────────────

function SourceIcon({ source, size = 18 }: { source: NotifSource; size?: number }) {
  const { Icon, iconBg, iconColor } = getCfg(source);
  return (
    <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon size={size} className={iconColor} />
    </div>
  );
}

// ── SourceBadge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: NotifSource }) {
  const cfg = getCfg(source);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.iconBg} ${cfg.iconColor}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
      {cfg.label}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  isOpen:       boolean;
  onClose:      () => void;
  initialNotif?: Notification | null; // ← AJOUT : notif pré-sélectionnée depuis ListNotifs
}

// ── Panel principal ──────────────────────────────────────────────────────────

export default function NotificationPanel({ isOpen, onClose, initialNotif }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, remove } = useNotifications();
  const { t } = useLanguage();

  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Quand une notif est passée depuis ListNotifs → ouvrir directement le détail
  useEffect(() => {
    if (isOpen && initialNotif) {
      setActiveNotif(initialNotif);
      setDetailOpen(true);
    }
    if (!isOpen) {
      setDetailOpen(false);
      setActiveNotif(null);
    }
  }, [isOpen, initialNotif]);

  // Clic extérieur → ferme tout
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDetailOpen(false);
        setActiveNotif(null);
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return ()  => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  // Bloque scroll body
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOpenDetail = (notif: Notification) => {
    setActiveNotif(notif);
    setDetailOpen(true);
    if (!notif.read) markAsRead(notif.id);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setActiveNotif(null), 300);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeNotif?.id === id) handleCloseDetail();
    remove(id);
  };

  const unread = notifications.filter(n => !n.read);
  const read   = notifications.filter(n =>  n.read);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[70]" />

      <div ref={panelRef} className="fixed right-0 top-0 h-full z-[71] flex">

        {/* ══ PANNEAU LISTE ══════════════════════════════════════════════ */}
        <div
          className="w-[420px] h-full bg-white shadow-2xl flex flex-col"
          style={{
            transform:  isOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.35s cubic-bezier(0.32, 0, 0, 1)",
            borderRadius: "24px 0 0 24px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-2xl flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-none">{t("notifications.title")}</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {unreadCount > 0
                    ? `${unreadCount} ${unreadCount > 1 ? t("notifications.unreads") : t("notifications.unread")}`
                    : t("notifications.upToDate")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                >
                  <CheckCheck size={13} /> {t("notifications.markAllRead")}
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Corps liste */}
          <div className="flex-1 overflow-y-auto py-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-20 px-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                  <Bell size={28} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t("notifications.noNotifications")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("notifications.noNotificationsDesc")}</p>
                </div>
              </div>
            ) : (
              <>
                {unread.length > 0 && (
                  <div>
                    <div className="px-6 pt-4 pb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t("notifications.unreads")} · {unread.length}
                      </span>
                    </div>
                    {unread.map(notif => (
                      <NotifRow
                        key={notif.id} notif={notif}
                        isActive={activeNotif?.id === notif.id}
                        onClick={() => handleOpenDetail(notif)}
                        onDelete={e => handleDelete(notif.id, e)}
                      />
                    ))}
                  </div>
                )}
                {read.length > 0 && (
                  <div>
                    <div className="px-6 pt-5 pb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Lues · {read.length}
                      </span>
                    </div>
                    {read.map(notif => (
                      <NotifRow
                        key={notif.id} notif={notif}
                        isActive={activeNotif?.id === notif.id}
                        onClick={() => handleOpenDetail(notif)}
                        onDelete={e => handleDelete(notif.id, e)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-50 shrink-0">
              <p className="text-[11px] text-center text-slate-300 font-medium">
                {notifications.length} notification{notifications.length > 1 ? "s" : ""} au total
              </p>
            </div>
          )}
        </div>

        {/* ══ PANNEAU DÉTAIL (slide par-dessus) ═════════════════════════ */}
        <div
          className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl flex flex-col"
          style={{
            transform:    detailOpen ? "translateX(0)" : "translateX(100%)",
            transition:   "transform 0.3s cubic-bezier(0.32, 0, 0, 1)",
            borderRadius: "24px 0 0 24px",
            borderLeft:   "1px solid #f1f5f9",
          }}
        >
          {activeNotif && (
            <NotifDetail
              notif={activeNotif}
              onBack={handleCloseDetail}
              onDelete={(id, e) => { handleDelete(id, e); handleCloseDetail(); }}
            />
          )}
        </div>

      </div>
    </>
  );
}

// ── Ligne de notification ────────────────────────────────────────────────────

function NotifRow({ notif, isActive, onClick, onDelete }: {
  notif: Notification; isActive: boolean;
  onClick: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-3.5 px-5 py-4 cursor-pointer border-b border-slate-50 last:border-0 transition ${
        isActive ? "bg-slate-50" : notif.read ? "hover:bg-slate-50/60" : "hover:bg-slate-50 bg-white"
      }`}
    >
      <div className="relative shrink-0 mt-0.5">
        <SourceIcon source={notif.source} size={16} />
        {!notif.read && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: getCfg(notif.source).dotColor }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-tight ${notif.read ? "font-medium text-slate-600" : "font-bold text-slate-900"}`}>
            {notif.title}
          </p>
          <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">
            {timeAgo(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">{notif.summary}</p>
        <div className="flex items-center gap-2 mt-2">
          <SourceBadge source={notif.source} />
          {notif.entityLabel && (
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
              {notif.entityLabel}
            </span>
          )}
        </div>
      </div>
      {/* Indicateur non-lu */}
      {!notif.read && (
        <div className="shrink-0 mt-2">
          <span className="w-2 h-2 rounded-full bg-slate-900 block" />
        </div>
      )}
    </div>
  );
}

// ── Panneau détail ───────────────────────────────────────────────────────────

function NotifDetail({ notif, onBack, onDelete }: {
  notif: Notification;
  onBack: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const cfg = getCfg(notif.source);
  return (
    <>
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-black transition text-sm font-bold">
          <ArrowLeft size={16} /> Retour
        </button>
       
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-3xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
            <cfg.Icon size={26} className={cfg.iconColor} />
          </div>
          <div>
            <SourceBadge source={notif.source} />
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">
              {timeAgo(notif.createdAt)} ·{" "}
              {new Date(notif.createdAt).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "long", year: "numeric",
              })}{" "}
              à{" "}
              {new Date(notif.createdAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 leading-tight">{notif.title}</h2>
          {notif.entityLabel && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400 font-medium">Concerne :</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {notif.entityLabel}
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">{notif.body}</p>
        </div>

        <div>
          {[
            { label: "Source",   value: cfg.label },
            { label: "Statut",   value: notif.read ? "Lu" : "Non lu" },
            { label: "Reçu le",  value: new Date(notif.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) },
            { label: "À",        value: new Date(notif.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <p className="text-xs text-slate-400 font-medium">{row.label}</p>
              <p className="text-sm font-bold text-slate-900">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      {notif.href && (
        <div className="px-6 py-5 border-t border-slate-100 shrink-0 space-y-2">
          <a
            href={notif.href}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
          >
            <ExternalLink size={15} /> Voir {cfg.label}
          </a>
        </div>
      )}
    </>
  );
}