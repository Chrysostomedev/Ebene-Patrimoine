"use client";
import Link from "next/link";
import { MapPin, Phone, ArrowUpRight, Ticket } from "lucide-react";
import { Site, resolveManagerName, resolveManagerPhone } from "../../services/admin/site.service";
import { useLanguage } from "../../contexts/LanguageContext";

interface SiteCardProps {
  site?: Site | null;
}

export default function SiteCard({ site }: SiteCardProps) {
  const { t } = useLanguage();

  if (!site) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-center text-slate-400 italic text-sm">
        {t("common.unavailable")}
      </div>
    );
  }

  const detailUrl    = `/admin/sites/details/${site.id}`;
  const managerName  = resolveManagerName(site);
  const managerPhone = resolveManagerPhone(site);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2.5 h-full flex flex-col gap-2">

      {/* Bloc site */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight truncate pr-12">
          {site.nom || "N/A"}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium min-w-0">
            <MapPin size={11} className="text-slate-700 shrink-0" />
            <span className="truncate">{site.localisation || "N/A"}</span>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
            site.status === "active" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}>
            {site.status === "active" ? t("cards.activeStatus") : t("cards.inactiveStatus")}
          </span>
        </div>
      </div>

      {/* Bloc manager */}
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex-grow">
        <p className="text-sm font-bold text-slate-900 truncate">
          {managerName !== "—" ? managerName : "N/A"}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-slate-500 text-[11px] font-medium">
          <div className="p-1 bg-slate-50 rounded-md shrink-0">
            <Phone size={11} className="text-slate-700" />
          </div>
          <span className="truncate">
            {managerPhone !== "—" ? managerPhone : "N/A"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <div
          className="bg-theme-primary text-white rounded-xl px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 shrink-0"
          title={t("cards.tickets")}
        >
          <Ticket size={14} />
          <span className="text-xs font-black">{site.tickets_count ?? 0}</span>
        </div>
        <Link
          href={detailUrl}
          className="flex-grow bg-theme-primary text-white rounded-xl px-3 py-2.5 font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors group text-xs"
        >
          {t("cards.siteDetails")}
          <div className="border border-white/30 rounded-full p-0.5 group-hover:bg-white group-hover:text-black transition-all">
            <ArrowUpRight size={10} />
          </div>
        </Link>
      </div>
    </div>
  );
}
