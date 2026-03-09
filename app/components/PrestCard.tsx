"use client";

import { MapPin, Phone, Mail, Briefcase, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PrestCardProps {
  id: number;           // ← id réel du prestataire pour construire le lien
  name: string;
  location: string;
  category: string;
  phone: string;
  email: string;
  rating: number;
  status: "Actif" | "Inactif";
  logo?: string;
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
  onProfilClick,
  onTicketsClick,
}: PrestCardProps) {

  // Lien vers la page details avec l'id réel — plus de query params
  const detailUrl = `/admin/prestataires/details/${id}`;

  const renderStars = (note: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={24}
        className={i < Math.floor(note) ? "fill-yellow-400 text-yellow-400" : "fill-slate-100 text-slate-100"}
      />
    ));

  // Première lettre sécurisée — évite le crash si name est null/vide
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="bg-white rounded-[32px] p-6 border border-slate-50 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-6">

      {/* Header : Logo, Nom et Statut */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-inner">
            {logo ? (
              <Image src={logo} alt={name} width={64} height={64} className="object-cover" />
            ) : (
              <div className="text-slate-400 font-bold text-xl">{initial}</div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">
              {name}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 text-sm font-medium mt-1">
              <MapPin size={14} />
              {location}
            </div>
          </div>
        </div>

        <span className={`px-4 py-1 rounded-full text-[10px] font-bold tracking-wider ${
          status === "Actif" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"
        }`}>
          {status}
        </span>
      </div>

      {/* Contact */}
      <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
        <div className="flex items-center gap-3 text-slate-600 font-medium text-[14px]">
          <Briefcase size={16} className="text-slate-400" />
          {category}
        </div>
        <div className="flex items-center gap-3 text-slate-600 font-medium text-[14px]">
          <Phone size={16} className="text-slate-400" />
          {phone}
        </div>
        <div className="flex items-center gap-3 text-slate-600 font-medium text-[14px]">
          <Mail size={16} className="text-slate-400" />
          <span className="truncate">{email}</span>
        </div>
      </div>

      {/* Note */}
      <div className="bg-slate-50/30 p-4 rounded-2xl flex flex-col gap-2">
        <span className="text-slate-400 text-[13px] font-bold uppercase">Note obtenue</span>
        <div className="flex items-center gap-4">
          <span className="text-5xl font-black text-slate-900 leading-none">{rating ?? 0}</span>
          <div className="flex gap-1">{renderStars(rating ?? 0)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Profil → ouvre le ProfileModal */}
        <button
          onClick={onProfilClick}
          className="flex-1 bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
        >
          Profil
        </button>

        {/* Tickets → navigue vers details/[id] */}
        <Link
          href={detailUrl}
          className="flex-1 flex items-center justify-center bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-colors"
        >
          Tickets
        </Link>
      </div>
    </div>
  );
}