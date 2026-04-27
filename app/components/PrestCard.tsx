"use client";

import { MapPin, Phone, Mail, Briefcase, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PrestCardProps {
  id: number;
  name: string;
  location: string;
  category: string;
  phone: string;
  email: string;
  rating: number;
  status: "Actif" | "Inactif";
  logo?: string;
  detailBasePath?: string;
  onProfilClick?: () => void;
  onTicketsClick?: () => void;
}

export default function PrestCard({
  id,
  name,
  location,
  category,
  phone,
  email,
  rating,
  status,
  logo,
  detailBasePath = "/admin/prestataires/details",
  onProfilClick,
  onTicketsClick,
}: PrestCardProps) {
  const detailUrl = `${detailBasePath}/${id}`;
  const initial   = name?.charAt(0)?.toUpperCase() ?? "?";

  const renderStars = (note: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.floor(note) ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"}
      />
    ));

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
            {logo ? (
              <Image src={logo} alt={name} width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-slate-500 font-black text-sm">{initial}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight truncate">
              {name}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium mt-0.5">
              <MapPin size={11} />
              <span className="truncate">{location || "-"}</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
          status === "Actif" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"
        }`}>
          {status}
        </span>
      </div>

      {/* Contact */}
      <div className="space-y-1.5 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 text-slate-600 text-[11px] font-medium">
          <Briefcase size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{category || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px] font-medium">
          <Phone size={12} className="text-slate-400 shrink-0" />
          {phone ? (
            <a href={`tel:${phone}`} className="truncate hover:underline">{phone}</a>
          ) : <span>-</span>}
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px] font-medium">
          <Mail size={12} className="text-slate-400 shrink-0" />
          {email ? (
            <a href={`mailto:${email}`} className="truncate hover:underline">{email}</a>
          ) : <span>-</span>}
        </div>
      </div>

      {/* Note */}
      <div className="flex items-center justify-between px-1">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Note</span>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black text-slate-900 leading-none">{rating ?? 0}</span>
          <div className="flex gap-0.5">{renderStars(rating ?? 0)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onProfilClick}
          className="flex-1 bg-white border border-slate-200 text-slate-800 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          Profil
        </button>
        <Link
          href={detailUrl}
          className="flex-1 flex items-center justify-center bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors"
        >
          Tickets
        </Link>
      </div>
    </div>
  );
}
