"use client";

/**
 * ManagerProfilPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side panel profil gestionnaire — s'ouvre à droite en overlay
 * Affiche toutes les infos du manager sélectionné
 * Design : blanc / noir / gris — cohérent avec GestCard
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { X, Mail, Phone, ShieldCheck, User, Hash, Calendar } from "lucide-react";
import { Manager } from "../../services/manager.service";

interface ManagerProfilPanelProps {
  isOpen: boolean;
  onClose: () => void;
  manager: Manager | null;
}

export default function ManagerProfilPanel({
  isOpen,
  onClose,
  manager,
}: ManagerProfilPanelProps) {

  const fullName = [manager?.first_name, manager?.last_name]
    .filter(Boolean).join(" ") || "Gestionnaire";

  const initials = [
    manager?.first_name?.charAt(0)?.toUpperCase(),
    manager?.last_name?.charAt(0)?.toUpperCase(),
  ].filter(Boolean).join("") || "?";

  const isActive = manager?.is_active !== false;

  return (
    <>
      {/* ── Overlay sombre ──────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[380px] bg-white z-50
          shadow-2xl border-l border-slate-100
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* ── Header panel ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Profil gestionnaire
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Contenu ──────────────────────────────────────────────────── */}
        {manager ? (
          <div className="flex-1 overflow-y-auto">

            {/* ── Bloc identité ─────────────────────────────────────────── */}
            <div className="px-6 py-6 flex flex-col items-center text-center border-b border-slate-50">
              {/* Avatar grand format */}
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>

              <h2 className="text-lg font-black text-slate-900 tracking-tight">{fullName}</h2>

              <div className="flex items-center gap-1.5 mt-1.5">
                <ShieldCheck size={12} className="text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  {manager.role?.name ?? "Manager"}
                </span>
              </div>

              {/* Statut */}
              <span className={`
                mt-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest
                ${isActive ? "bg-green-600 text-white" : "bg-red-400 text-white"}
              `}>
                {isActive ? "Actif" : "Inactif"}
              </span>
            </div>

            {/* ── Infos de contact ─────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Coordonnées
              </p>

              <InfoRow icon={<Mail size={13} className="text-slate-400" />} label="Email" value={manager.email} />
              <InfoRow icon={<Phone size={13} className="text-slate-400" />} label="Téléphone" value={manager.phone || "—"} />
            </div>

            {/* ── Infos système ────────────────────────────────────────── */}
            <div className="px-6 py-5 border-t border-slate-50 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Informations système
              </p>

              <InfoRow icon={<Hash size={13} className="text-slate-400" />} label="ID Utilisateur" value={`#${manager.id}`} />
              <InfoRow icon={<Hash size={13} className="text-slate-400" />} label="ID Manager" value={manager.manager?.id ? `#${manager.manager.id}` : "—"} />
              <InfoRow icon={<User size={13} className="text-slate-400" />} label="Rôle" value={manager.role?.name ?? "MANAGER"} />

              {/*
               * ── Site géré — COMMENTÉ, préparé pour future API ────────────
               * TODO: décommenter quand l'API retournera managed_site
               *
               * <InfoRow
               *   icon={<MapPin size={13} className="text-slate-400" />}
               *   label="Site assigné"
               *   value={manager.managed_site?.nom || "—"}
               * />
               */}
            </div>

          </div>
        ) : (
          /* ── Skeleton loading ───────────────────────────────────────── */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-300 text-sm">Chargement...</div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}

// ── Composant ligne info ───────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</p>
        <p className="text-[13px] text-slate-700 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}