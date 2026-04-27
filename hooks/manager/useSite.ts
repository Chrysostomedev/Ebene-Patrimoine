import { useState, useEffect, useCallback } from "react";
import { SiteService } from "../../services/manager/site.service";
import { AssetService } from "../../services/manager/asset.service";
import type { ManagerSite, AssetStats, SiteStats } from "../../types/manager.types";

export function useSite() {
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
      const [sitesData, statsData, siteStatsData] = await Promise.all([
        SiteService.getSites(),
        AssetService.getStats(),
        SiteService.getStats().catch(() => null),
      ]);

      const allSites = sitesData.items ?? [];
      setSites(allSites);
      setSite(allSites[0] ?? null);
      setStats(statsData);
      setSiteStats(siteStatsData);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données du site");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { site, sites, stats, siteStats, isLoading, error, refresh: fetchData };
}
