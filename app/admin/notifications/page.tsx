"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import {
  Bell, CheckCheck, Trash2, ChevronRight, X,
  ArrowLeft, ExternalLink, Ticket, MapPin, Building2,
  FileText, Receipt, Users, Settings,
} from "lucide-react";
import { useNotifications, Notification, NotifSource } from "../../../hooks/useNotifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)        return "À l'instant";
  if (diff < 3600)      return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ─── Config source — identique à NotificationPanel ───────────────────────────

const SOURCE_CONFIG: Record<string, {
  label: string; Icon: React.ElementType;
  iconBg: string; iconColor: string; dotColor: string;
}> = {
  ticket:      { label: "Ticket",      Icon: Ticket,    iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  devis:       { label: "Devis",       Icon: FileText,  iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
  facture:     { label: "Facture",     Icon: Receipt,   iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#111827" },
  site:        { label: "Site",        Icon: MapPin,    iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
  patrimoine:  { label: "Patrimoine",  Icon: Building2, iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#1f2937" },
  planning:    { label: "Planning",    Icon: Settings,  iconBg: "bg-gray-200", iconColor: "text-gray-800", dotColor: "#1f2937" },
  prestataire: { label: "Prestataire", Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  utilisateur: { label: "Utilisateur", Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  service:     { label: "Service",     Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
  type:        { label: "Type",        Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#374151" },
  soustype:    { label: "Sous-type",   Icon: Users,     iconBg: "bg-gray-100", iconColor: "text-gray-700", dotColor: "#4b5563" },
};

function getCfg(source: string) {
  return SOURCE_CONFIG[source] ?? SOURCE_CONFIG["ticket"];
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: string }) {
  const { Icon, iconBg, iconColor } = getCfg(source);
  return (
    <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
      <Icon size={17} className={iconColor} />
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cfg = getCfg(source);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.iconBg} ${cfg.iconColor}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
      {cfg.label}
    </span>
  );
}

// ─── Ligne notif ──────────────────────────────────────────────────────────────

function NotifRow({ notif, isActive, onClick, onDelete }: {
  notif: Notification; isActive: boolean;
  onClick: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const cfg = getCfg(notif.source);
  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-4 px-6 py-4 cursor-pointer border-b border-slate-50 last:border-0 transition-colors
        ${isActive ? "bg-slate-50" : notif.read ? "hover:bg-slate-50/60" : "hover:bg-slate-50 bg-white"}`}
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

      {/* Texte */}
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
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
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
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={14} className="text-slate-300 mt-1" />
      </div>
    </div>
  );
}

// ─── Panel détail (slide depuis la droite) ────────────────────────────────────

function NotifDetailPanel({ notif, onClose, onDelete }: {
  notif: Notification | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const isOpen = !!notif;
  const cfg    = notif ? getCfg(notif.source) : null;

  return (
    <div
      className="fixed top-0 right-0 h-full w-[460px] bg-white z-50 shadow-2xl flex flex-col"
      style={{
        transform:  isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0, 0, 1)",
        borderRadius: "24px 0 0 24px",
        borderLeft: "1px solid #f1f5f9",
      }}
    >
      {notif && cfg && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-500 hover:text-black transition text-sm font-bold"
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <button
              onClick={() => { onDelete(notif.id); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 text-xs font-bold transition"
            >
              <Trash2 size={13} /> Supprimer
            </button>
          </div>

          {/* Corps */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* Icône + date */}
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
                    hour: "2-digit", minute: "2-digit",
                  } as any)}
                </p>
              </div>
            </div>

            {/* Titre */}
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

            {/* Message */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">{notif.body}</p>
            </div>

            {/* Méta */}
            <div>
              {[
                { label: "Source",  value: cfg.label },
                { label: "Statut",  value: notif.read ? "Lu" : "Non lu" },
                { label: "Reçu le", value: new Date(notif.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) },
                { label: "À",       value: new Date(notif.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <p className="text-xs text-slate-400 font-medium">{row.label}</p>
                  <p className="text-sm font-bold text-slate-900">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          {notif.href && (
            <div className="px-6 py-5 border-t border-slate-100 shrink-0">
              <a
                href={notif.href}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
              >
                <ExternalLink size={15} />
                Voir {cfg.label}
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const {
    notifications, unreadCount,
    markAsRead, markAllAsRead, remove,
  } = useNotifications();

  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);

  const handleOpen = (notif: Notification) => {
    setActiveNotif(notif);
    if (!notif.read) markAsRead(notif.id);
  };

  const handleClose = () => setActiveNotif(null);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeNotif?.id === id) handleClose();
    remove(id);
  };

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) =>  n.read);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />

      <div className="flex-1 flex flex-col pl-64">
        <Navbar />

        <main className="flex-1 p-8 pt-24">

          {/* ── En-tête page ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-8">
            <div>
            <PageHeader
              title="Mes notifications"
              subtitle="Consultez et mettez à jour le statut de vos interventions"
            />
              <p className="text-sm text-slate-500 mt-1">
                {unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Vous êtes à jour"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 hover:border-slate-300 transition"
              >
                <CheckCheck size={14} />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* ── Contenu ────────────────────────────────────────────────── */}
          {notifications.length === 0 ? (

            /* Etat vide */
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mb-5">
                <Bell size={32} className="text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-700">Aucune notification</p>
              <p className="text-sm text-slate-400 mt-1">Vous êtes à jour sur tout !</p>
            </div>

          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Section non-lues */}
              {unread.length > 0 && (
                <div>
                  <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Non lues · {unread.length}
                    </span>
                  </div>
                  {unread.map((notif) => (
                    <NotifRow
                      key={notif.id}
                      notif={notif}
                      isActive={activeNotif?.id === notif.id}
                      onClick={() => handleOpen(notif)}
                      onDelete={(e) => handleDelete(notif.id, e)}
                    />
                  ))}
                </div>
              )}

              {/* Séparateur si les deux sections */}
              {unread.length > 0 && read.length > 0 && (
                <div className="mx-6 border-t border-slate-100" />
              )}

              {/* Section lues */}
              {read.length > 0 && (
                <div>
                  <div className="px-6 pt-5 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Lues · {read.length}
                    </span>
                  </div>
                  {read.map((notif) => (
                    <NotifRow
                      key={notif.id}
                      notif={notif}
                      isActive={activeNotif?.id === notif.id}
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
            </div>
          )}
        </main>
      </div>

      {/* ── Panel détail slide ────────────────────────────────────────── */}
      {activeNotif && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
          onClick={handleClose}
        />
      )}
      <NotifDetailPanel
        notif={activeNotif}
        onClose={handleClose}
        onDelete={handleDelete}
      />
    </div>
  );
}