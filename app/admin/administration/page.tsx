"use client";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DetailsCard from "@/components/DetailsCard";
import LineChartCard from "@/components/LineChartCard";
import StatsCard from "@/components/StatsCard";
import DetailsStats from "@/components/DetailsStats";
import PageHeader from "@/components/PageHeader";

import { useDashboard } from "../../../hooks/useDashboard";

export default function AdministrationPage() {
  // On utilise le même hook — fetchAdminDashboard au montage
  const { adminDashboard, isLoading, fetchAdminDashboard } = useDashboard();

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  // ── KPIs Sites (4 cartes) ──
  // Clés issues de getAdminDashboard() Laravel
  const kpis = [
    {
      label: "Nombre total de sites actifs",
      value: adminDashboard?.nombre_total_sites_actifs ?? 0,
      delta: "+3%", trend: "up" as const,
    },
    {
      label: "Nombre total de sites inactifs",
      value: adminDashboard?.nombre_total_sites_inactifs ?? 0,
      delta: "+3%", trend: "up" as const,
    },
    {
      label: "Coût moyen par site",
      // isCurrency géré dans StatsCard via prop
      value: adminDashboard?.cout_moyen_par_sites ?? 0,
      delta: "+20,10%", trend: "up" as const,
      isCurrency: true,
    },
    {
      label: "Coût total de maintenance",
      value: adminDashboard?.cout_total_maintenance ?? 0,
      delta: "+15,03%", trend: "up" as const,
      isCurrency: true,
    },
  ];

  // ── KPIs Patrimoine (3 cartes DetailsStats) ──
  const tpis = [
    {
      label: "Nombre total d'équipements du patrimoine",
      value: adminDashboard?.nombre_total_equipements ?? 0,
      delta: "+15,03%", trend: "up" as const,
      href: "/admin/patrimoines",
    },
    {
      label: "Nombre total de prestataires",
      value: adminDashboard?.nombre_total_prestataires ?? 0,
      delta: "+20,10%", trend: "up" as const,
      href: "/admin/prestataires",
    },
    {
      label: "Nombre total de factures",
      // "N/A" si non implémenté côté backend
      value: adminDashboard?.nombre_total_factures ?? "N/A",
      delta: "+10%", trend: "up" as const,
      href: "#",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-10">
          <PageHeader
            title="Administration"
            subtitle="Ce menu vous permettra de gérer tout l'ensemble de votre espace"
          />

          {isLoading && (
            <div className="text-center text-slate-400 text-sm italic py-4">Chargement...</div>
          )}

          {/* ── KPIs Sites — 4 StatsCard ── */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi, i) => (
                <StatsCard key={i} {...kpi} />
              ))}
            </div>

            {/* ── KPIs Patrimoine — 3 DetailsStats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tpis.map((tpi, i) => (
                <DetailsStats key={i} {...tpi} />
              ))}
            </div>
          </div>

          {/* ── Section mixte : DetailsCards tickets + LineChart ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Colonne gauche : 3 DetailsCard tickets → /admin/tickets */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <DetailsCard
                title="Tickets en attente"
                value={adminDashboard?.nombre_tickets_en_attente ?? 0}
                href="/admin/tickets"
              />
              <DetailsCard
                title="Tickets en cours"
                value={adminDashboard?.nombre_tickets_en_cours ?? 0}
                href="/admin/tickets"
              />
              <DetailsCard
                title="Tickets clôturés"
                value={adminDashboard?.nombre_tickets_clotures ?? 0}
                href="/admin/tickets"
              />
            </div>

            {/* Colonne droite : LineChart évolution équipements sur 12 mois */}
            <div className="lg:col-span-9 h-full">
              <LineChartCard
                title="Évolution des équipements du patrimoine"
                // evolution_patrimoine = [{annee, mois, total}] — format API
                data={adminDashboard?.evolution_patrimoine ?? []}
              />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}