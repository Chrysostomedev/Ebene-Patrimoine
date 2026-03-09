"use client";

import { useState } from "react";
import {
  Bell, CheckCheck, Trash2, ChevronRight,
  Ticket, MapPin, Building2, FileText,
  Receipt, Users, Settings,
} from "lucide-react";
import { useNotifications, Notification, NotifSource } from "../../hooks/useNotifications";
import NotificationPanel from "./NotificationPanel";

// ─── Config source ────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, {
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

function getCfg(source: string) {
  return SOURCE_CONFIG[source] ?? SOURCE_CONFIG["système"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)        return "À l'instant";
  if (diff < 3600)      return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ─── SourceIcon ───────────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: string }) {
  const { Icon, iconBg, iconColor } = getCfg(source);
  return (
    <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon size={17} className={iconColor} />
    </div>
  );
}

// ─── SourceBadge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const cfg = getCfg(source);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.iconBg} ${cfg.iconColor}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
      {cfg.label}
    </span>
  );
}

// ─── Ligne notif cliquable ────────────────────────────────────────────────────

function NotifRow({ notif, onClick, onDelete }: {
  notif:    Notification;
  onClick:  () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const cfg = getCfg(notif.source);

  return (
    <div
      onClick={onClick}
      className={`
        group flex items-start gap-4 px-6 py-4 cursor-pointer
        border-b border-slate-50 last:border-0 transition-colors
        ${notif.read ? "hover:bg-slate-50/60" : "bg-white hover:bg-slate-50"}
      `}
    >
      {/* Icône + dot non-lu */}
      <div className="relative shrink-0 mt-0.5">
        <SourceIcon source={notif.source} />
        {!notif.read && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: cfg.dotColor }}
          />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm leading-tight ${notif.read ? "font-medium text-slate-600" : "font-bold text-slate-900"}`}>
            {notif.title}
          </p>
          <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">
            {timeAgo(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
          {notif.summary}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <SourceBadge source={notif.source} />
          {notif.entityLabel && (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
              {notif.entityLabel}
            </span>
          )}
        </div>
      </div>

      {/* Actions hover */}
      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition"
          title="Supprimer"
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={14} className="text-slate-300 mt-1" />
      </div>
    </div>
  );
}

// ─── ListNotifs ───────────────────────────────────────────────────────────────

export default function ListNotifs() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, remove } = useNotifications();

  const [panelOpen,     setPanelOpen]     = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  // Clic sur une ligne → ouvre NotificationPanel avec la notif en détail direct
  const handleOpen = (notif: Notification) => {
    setSelectedNotif(notif);
    setPanelOpen(true);
    if (!notif.read) markAsRead(notif.id);
  };

  const handleClose = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedNotif(null), 350);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    remove(id);
  };

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) =>  n.read);

  return (
    <>
      {/* ── Card liste ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0">
              <Bell size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-none">Notifications</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tout est à jour"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
            >
              <CheckCheck size={13} /> Tout lire
            </button>
          )}
        </div>

        {/* Corps */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <Bell size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-700">Aucune notification</p>
            <p className="text-xs text-slate-400 mt-1">Vous êtes à jour sur tout !</p>
          </div>
        ) : (
          <>
            {/* Non lues */}
            {unread.length > 0 && (
              <div>
                <div className="px-6 pt-4 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Non lues · {unread.length}
                  </span>
                </div>
                {unread.map((notif) => (
                  <NotifRow
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleOpen(notif)}
                    onDelete={(e) => handleDelete(notif.id, e)}
                  />
                ))}
              </div>
            )}

            {unread.length > 0 && read.length > 0 && (
              <div className="mx-6 border-t border-slate-100" />
            )}

            {/* Lues */}
            {read.length > 0 && (
              <div>
                <div className="px-6 pt-4 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Lues · {read.length}
                  </span>
                </div>
                {read.map((notif) => (
                  <NotifRow
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleOpen(notif)}
                    onDelete={(e) => handleDelete(notif.id, e)}
                  />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-50">
              <p className="text-[11px] text-center text-slate-300 font-medium">
                {notifications.length} notification{notifications.length > 1 ? "s" : ""} au total
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── NotificationPanel — s'ouvre au clic, détail direct ───────── */}
      <NotificationPanel
        isOpen={panelOpen}
        onClose={handleClose}
        initialNotif={selectedNotif}
      />
    </>
  );
}