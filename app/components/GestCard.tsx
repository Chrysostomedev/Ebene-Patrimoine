"use client";

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
  site?: string;
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
  const initials  = [firstName?.charAt(0)?.toUpperCase(), lastName?.charAt(0)?.toUpperCase()].filter(Boolean).join("") || "?";
  const fullName  = [firstName, lastName].filter(Boolean).join(" ") || "Gestionnaire";
  const isActive  = status === "Actif";

  return (
    <div className="group bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-slate-50 rounded-t-xl px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
              {avatar ? (
                <Image src={avatar} alt={fullName} width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <span className="text-xs font-bold text-white tracking-wide">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight truncate">
                {fullName}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={10} className="text-slate-400 shrink-0" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">
                  {role}
                </span>
              </div>
            </div>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest ${
            isActive ? "bg-green-600 text-white" : "bg-red-400 text-white"
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Contact */}
      <div className="px-4 py-3 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <Mail size={11} className="text-slate-300 shrink-0" />
          {email ? (
            <a href={`mailto:${email}`} className="text-[11px] text-slate-500 truncate hover:text-slate-900 hover:underline transition-colors">
              {email}
            </a>
          ) : <span className="text-[11px] text-slate-400">-</span>}
        </div>
        <div className="flex items-center gap-2">
          <Phone size={11} className="text-slate-300 shrink-0" />
          {phone ? (
            <a href={`tel:${phone}`} className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline transition-colors truncate">
              {phone}
            </a>
          ) : <span className="text-[11px] text-slate-400">-</span>}
        </div>
        {site && (
          <p className="text-[11px] text-slate-500 truncate">Site : {site}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={onProfilClick}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-all"
        >
          <UserCircle2 size={12} /> Profil
        </button>
        <Link
          href={detailUrl}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-black transition-all"
        >
          <ArrowUpRight size={12} /> Détails
        </Link>
      </div>
    </div>
  );
}
