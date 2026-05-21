import { useState, useEffect, useCallback } from "react";
import { SiteService } from "../../services/manager/site.service";
import { AssetService } from "../../services/manager/asset.service";
import type { ManagerSite, AssetStats, SiteStats } from "../../types/manager.types";

export function useSite(siteId?: number | string) {
  const [sites,      setSites]      = useState<ManagerSite[]>([]);
  const [site,       setSite]       = useState<ManagerSite | null>(null);
  const [stats,      setStats]      = useState<AssetStats | null>(null);
  const [siteStats,  setSiteStats]  = useState<SiteStats | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (siteId) {
        const [siteData, statsData] = await Promise.all([
          SiteService.getSite(Number(siteId)).catch(err => {
            if (err?.response?.status === 403) return null;
            throw err;
          }),
          AssetService.getStats({ site_id: Number(siteId) }).catch(err => {
            if (err?.response?.status === 403) {
              return { total: 0, active: 0, in_maintenance: 0, out_of_service: 0, disposed: 0 };
            }
            throw err;
          }),
        ]);
        setSite(siteData);
        setStats(statsData as any);
      } else {
        const [sitesData, statsData, siteStatsData] = await Promise.all([
          SiteService.getSites().catch(err => {
            if (err?.response?.status === 403) {
              return { items: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } };
            }
            throw err;
          }),
          AssetService.getStats().catch(err => {
            if (err?.response?.status === 403) {
              return { total: 0, active: 0, in_maintenance: 0, out_of_service: 0, disposed: 0 };
            }
            throw err;
          }),
          SiteService.getStats().catch(err => {
            if (err?.response?.status === 403) {
              return {
                total_assets: 0,
                total_tickets: 0,
                total_plannings: 0,
                active_providers: 0,
                nombre_total_sites: 0,
                nombre_sites_assignes: 0,
                nombre_sites_actifs: 0,
                nombre_sites_inactifs: 0,
                cout_loyer_moyen_par_site: 0,
                loyer_moyen: 0,
                nombre_total_tickets: 0,
                nombre_tickets_traités: 0,
                nombre_tickets_non_traités: 0,
                nombre_prestataires: 0,
                cout_global_maintenance: 0,
                nombre_equipements: 0,
                tickets_par_site: []
              };
            }
            return null;
          }),
        ]);

        const allSites = sitesData?.items ?? [];
        setSites(allSites);
        setSite(allSites[0] ?? null);
        setStats(statsData as any);
        setSiteStats(siteStatsData);
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError(null);
      } else {
        setError(err.message || "Erreur lors du chargement des données du site");
      }
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { site, sites, stats, siteStats, isLoading, error, refresh: fetchData };
}
