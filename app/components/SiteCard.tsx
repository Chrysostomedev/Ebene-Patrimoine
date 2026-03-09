"use client";
import Link from "next/link";
import { MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";
import { Site } from "../../services/site.service";

interface SiteCardProps {
  site?: Site | null; // safe : site peut être undefined ou null
}

export default function SiteCard({ site }: SiteCardProps) {
  if (!site) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex items-center justify-center text-slate-400 italic">
        Informations indisponibles
      </div>
    );
  }

  const detailUrl = `/admin/sites/details/${site.id}`;

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-3 h-full flex flex-col gap-3">
      <div className="bg-slate-50 rounded-[24px] p-6 relative">
        <h3 className="text-2xl font-bold text-slate-900 mb-4 pr-16 uppercase tracking-tight leading-tight">
          {site.nom || "N/A"}
        </h3>
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <MapPin size={18} className="text-slate-900" />
          <span className="text-sm">{site.localisation || "N/A"}</span>
          <span
            className={`ml-2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              site.status === "active" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {site.status === "active" ? "actif" : "inactif"}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-50 p-6 flex-grow">
        <h4 className="text-2xl font-bold text-slate-900 mb-4">
          {site.responsable_name || "N/A"}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <Phone size={16} className="text-slate-900" />
            </div>
            <span className="text-sm font-medium">
              {site.manager?.phone || site.phone_responsable || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <div className="p-1.5 bg-slate-30 rounded-lg">
              <Mail size={16} className="text-slate-900" />
            </div>
            <span className="text-sm font-medium">
              {site.manager?.email || site.email || "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="bg-[#111] text-white rounded-2xl px-6 py-4 text-xl font-bold flex items-center justify-center min-w-[80px]">
          {site.effectifs ?? 0}
        </div>
        <Link
          href={detailUrl}
          className="flex-grow bg-[#111] text-white rounded-2xl px-6 py-4 font-bold flex items-center justify-center gap-3 hover:bg-black transition-colors group text-sm"
        >
          voir les détails du site
          <div className="border border-white/30 rounded-full p-1 group-hover:bg-white group-hover:text-black transition-all">
            <ArrowUpRight size={12} />
          </div>
        </Link>
      </div>
    </div>
  );
}
