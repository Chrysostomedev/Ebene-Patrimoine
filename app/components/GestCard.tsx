"use client";

/**
 * GestCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Carte gestionnaire — Design ultra-soft professionnel (CANAL+)
 * Palette : blanc / noir / gris uniquement — zéro couleur vive
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Phone, Mail, ShieldCheck, UserCircle2, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface GestCardProps {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  site?: string; // préparé pour future API — voir commentaires
  status: "Actif" | "Inactif";
  avatar?: string;
  onProfilClick?: () => void;
}

export default function GestCard({
  id,
  firstName,
  lastName,
  email,
  phone,
  role = "Manager",
  site,
  status,
  avatar,
  onProfilClick,
}: GestCardProps) {

  const detailUrl = `/admin/gestionnaires/details/${id}`;

  const initials = [
    firstName?.charAt(0)?.toUpperCase(),
    lastName?.charAt(0)?.toUpperCase(),
  ].filter(Boolean).join("") || "?";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Gestionnaire";
  const isActive = status === "Actif";

  return (
    <div className="group bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 rounded-[24px] p-6 relative">

        <div className="flex items-center gap-3">
          {/* Avatar monochrome */}
          <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {avatar ? (
              <Image src={avatar} alt={fullName} width={44} height={44} className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm font-bold text-white tracking-wide">{initials}</span>
            )}
          </div>

          {/* Nom + rôle */}
          <div>
            <h3 className="text-[14px] font-bold text-slate-900 leading-tight tracking-tight">
              {fullName}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck size={11} className="text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Badge statut — seule distinction visuelle */}
        <span className={`
          mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest flex-shrink-0
          ${isActive ? "bg-green-600 text-white" : "bg-red-400 text-white"}
        `}>
          {status}
        </span>
      </div>

      {/* ── Séparateur ──────────────────────────────────────────────────── */}
      <div className="mx-5 h-px bg-slate-50" />

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex flex-col gap-2.5 flex-1">

        <div className="flex items-center gap-2.5">
          <Mail size={12} className="text-slate-300 flex-shrink-0" />
          <span className="text-[12px] text-slate-500 truncate">{email || "—"}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Phone size={12} className="text-slate-300 flex-shrink-0" />
          <span className="text-[12px] text-slate-500">{phone || "—"}</span>
        </div>

        {/*
         * ── Site géré — COMMENTÉ, préparé pour future API ─────────────────
         * TODO: décommenter quand le backend retournera managed_site
         *
         * {site && (
         *   <div className="flex items-center gap-2.5">
         *     <MapPin size={12} className="text-slate-300 flex-shrink-0" />
         *     <span className="text-[12px] text-slate-500 truncate">{site}</span>
         *   </div>
         * )}
         */}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="p-4 pt-0 flex gap-2">

        {/* Profil → ouvre le side panel à droite */}
        <button
          onClick={onProfilClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
        >
          <UserCircle2 size={13} />
          Profil
        </button>

        {/* Détails → navigue vers details/[id] */}
        <Link
          href={detailUrl}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-black transition-all duration-150"
        >
          <ArrowUpRight size={13} />
          Détails
        </Link>
      </div>
    </div>
  );
}