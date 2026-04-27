"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Download } from "lucide-react";

import Navbar       from "@/components/Navbar";
import Sidebar      from "@/components/Sidebar";
import SearchInput  from "@/components/SearchInput";
import StatsCard    from "@/components/StatsCard";
import ProfileModal from "@/components/ProfileModal";
import PrestCard    from "@/components/PrestCard";
import PageHeader   from "@/components/PageHeader";

import { useProviders } from "../../../hooks/manager/useProviders";
import type { Provider } from "../../../services/manager/provider.service";

/* ─────────────────────────── */
/* HELPERS AVATAR */
/* ─────────────────────────── */

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ProviderAvatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = getInitials(name);
  const color    = getAvatarColor(name);
  const dim      = size === "lg" ? "w-14 h-14 text-xl" : "w-9 h-9 text-sm";
  return (
    <div className={`${dim} ${color} rounded-2xl flex items-center justify-center font-black shrink-0`}>
      {initials}
    </div>
  );
}

/* ─────────────────────────── */
/* PAGE */
/* ─────────────────────────── */

export default function PrestatairesPage() {
  const router = useRouter();

  const {
    filteredProviders,
    stats: apiStats,
    isLoading,
    error: apiError,
    search,
    exportProviders
  } = useProviders();

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const kpis = [
    { label: "Total prestataires",       value: apiStats?.total_providers ?? 0, trend: "up" as const },
    { label: "Prestataires actifs",      value: apiStats?.active_providers ?? 0, trend: "up" as const },
    { label: "Prestataires inactifs",    value: apiStats?.inactive_providers ?? 0, trend: "down" as const },
    { label: "Délai moyen intervention", value: apiStats?.average_intervention_time || "-", trend: "up" as const },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader title="Prestataires" subtitle="Consultez et gérez vos prestataires de services." />

          {apiError && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold mb-4">
              {apiError}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* Barre actions */}
          <div className="flex items-center justify-between gap-3">
             <div className="w-full max-w-md">
                <SearchInput onSearch={search} placeholder="Rechercher par nom, ville ou service..." />
             </div>
             <button
                onClick={exportProviders}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-black hover:border-slate-900 transition shadow-sm"
              >
                <Download size={16} /> Exporter (.xlsx)
              </button>
          </div>

          {/* Liste */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-8">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Récupération des données</p>
               </div>
            ) : filteredProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProviders.map(p => (
                  <PrestCard
                    key={p.id}
                    id={p.id}
                    name={p.company_name}
                    location={p.city || ""}
                    category={p.service?.name || ""}
                    phone={p.user?.phone || ""}
                    email={p.user?.email || ""}
                    rating={p.rating || 0}
                    status={p.is_active ? "Actif" : "Inactif"}
                    detailBasePath="/manager/prestataires/details"
                    onProfilClick={() => setSelectedProvider(p)}
                    onTicketsClick={() => router.push(`/manager/prestataires/details/${p.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter size={24} className="text-slate-300" />
                 </div>
                 <p className="text-slate-400 italic text-sm">Aucun prestataire ne correspond à votre recherche.</p>
              </div>
            )}
          </div>
        </main>
      
      {/* Profile modal */}
      <ProfileModal
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        provider={
          selectedProvider ? {
            name:       selectedProvider.company_name,
            location:   selectedProvider.city || "",
            phone:      selectedProvider.user?.phone || "",
            email:      selectedProvider.user?.email || "",
            category:   selectedProvider.service?.name || "",
            dateEntree: selectedProvider.date_entree || "-",
            status:     selectedProvider.is_active ? "Actif" : "Inactif",
            stats: {
              totalBillets:   { value: 0, delta: "" },
              ticketsEnCours: { value: 0,  delta: "" },
              ticketsTraites: { value: 0,  delta: "" },
              noteObtenue:    `${selectedProvider.rating || 0}/5`,
            },
          } : null
        }
      />
    </div>
  );
}