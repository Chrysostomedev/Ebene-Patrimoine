"use client";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import DetailsCard from "@/components/DetailsCard";
import LineChartCard from "@/components/LineChartCard";
import StatsCard from "@/components/StatsCard";
import DetailsStats from "@/components/DetailsStats";
import PageHeader from "@/components/PageHeader";

import { useDashboard } from "../../../hooks/admin/useDashboard";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function AdministrationPage() {
  const { adminDashboard, isAdminLoading, adminError, fetchAdminDashboard } = useDashboard();
  const { t } = useLanguage();

  // fetchAdminDashboard est stable (useCallback[]) → pas de boucle infinie
  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

  const kpis = [
    { label: t("administration.totalActiveSites"),   value: adminDashboard?.nombre_total_sites_actifs   ?? 0, delta: "+3%",    trend: "up"   as const },
    { label: t("administration.totalInactiveSites"), value: adminDashboard?.nombre_total_sites_inactifs ?? 0, delta: "+3%",    trend: "up"   as const },
    { label: t("administration.avgCostPerSite"),     value: adminDashboard?.cout_moyen_par_sites        ?? 0, delta: "+20,10%",trend: "up"   as const, isCurrency: true },
    { label: t("administration.totalMaintenanceCost"),value: adminDashboard?.cout_total_maintenance     ?? 0, delta: "+15,03%",trend: "up"   as const, isCurrency: true },
  ];

  const tpis = [
    { label: t("administration.totalEquipments"), value: adminDashboard?.nombre_total_equipements  ?? 0, delta: "+15,03%", trend: "up" as const, href: "/admin/patrimoines" },
    { label: t("administration.totalProviders"),  value: adminDashboard?.nombre_total_prestataires ?? 0, delta: "+20,10%", trend: "up" as const, href: "/admin/prestataires" },
    { label: t("administration.totalInvoices"),   value: adminDashboard?.nombre_total_factures     ?? "N/A", delta: "+10%", trend: "up" as const, href: "#" },
  ];

  return (
    // ✅ FIX : suppression du div wrapper fantôme dont le className n'était
    // jamais fermé → on garde un seul div racine avec les classes Tailwind
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />

      <main className="mt-20 p-6 space-y-10">
        <PageHeader title={t("administration.title")} subtitle={t("administration.subtitle")} />

        {/* Loader isolé → n'interfère pas avec le dashboard global */}
        {isAdminLoading && (
          <div className="text-center text-slate-400 text-sm italic py-4">
            Chargement…
          </div>
        )}

        {/* Erreur admin */}
        {adminError && !isAdminLoading && (
          <div className="text-center text-red-500 text-sm italic py-4">
            {adminError}
          </div>
        )}

        {!isAdminLoading && (
          <>
            {/* ── KPIs Sites → 4 StatsCard ── */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                  <StatsCard key={i} {...kpi} />
                ))}
              </div>

              {/* ── KPIs Patrimoine → 3 DetailsStats ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tpis.map((tpi, i) => (
                  <DetailsStats key={i} {...tpi} />
                ))}
              </div>
            </div>

            {/* ── Section mixte : DetailsCards tickets + LineChart ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* Colonne gauche : 3 DetailsCard tickets */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <DetailsCard title={t("administration.pendingTickets")} value={adminDashboard?.nombre_tickets_en_attente ?? 0} href="/admin/tickets" />
                <DetailsCard title={t("administration.ongoingTickets")} value={adminDashboard?.nombre_tickets_en_cours ?? 0} href="/admin/tickets" />
                <DetailsCard title={t("administration.closedTickets")} value={adminDashboard?.nombre_tickets_clotures ?? 0} href="/admin/tickets" />
              </div>

              {/* Colonne droite : LineChart évolution équipements */}
              <div className="lg:col-span-9 h-full">
                <LineChartCard
                  title={t("administration.evolutionChart")}
                  data={adminDashboard?.evolution_patrimoine ?? []}
                  tooltipSuffix={t("administration.equipments")}
                />
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}