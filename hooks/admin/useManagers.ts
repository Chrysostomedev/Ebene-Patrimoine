import { useState, useEffect, useCallback } from "react";
import { ManagerService, Manager, ManagerStats } from "../../services/admin/manager.service";

export function useManagers() {
  const [managers,    setManagers]    = useState<Manager[]>([]);
  const [allManagers, setAllManagers] = useState<Manager[]>([]);
  const [stats,       setStats]       = useState<ManagerStats>({
    total_managers: 0, active_managers: 0, inactive_managers: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [page,      setPageNum]   = useState(1);
  const [search,    setSearch]    = useState("");
  const [filters,   setFilters]   = useState<{ is_active?: boolean }>({});
  const [meta,      setMeta]      = useState({
    current_page: 1, last_page: 1, per_page: 15, total: 0,
  });

  const doFetch = useCallback(async (p: number, s: string, f: { is_active?: boolean }) => {
    setIsLoading(true);
    try {
      const params: any = { page: p, per_page: 15 };
      if (s.trim()) params.search = s.trim();
      if (f.is_active !== undefined) params.is_active = f.is_active;

      const result = await ManagerService.getManagers(params);
      setManagers(result.data);
      setMeta(result.meta);

      if (p === 1 && !s.trim() && f.is_active === undefined) {
        const all = await ManagerService.getManagers({ per_page: 1000 });
        setAllManagers(all.data);
      }
    } catch (err) {
      console.error("Erreur chargement gestionnaires", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const doFetchStats = useCallback(async () => {
    try {
      const s = await ManagerService.getStats();
      setStats(s);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    doFetch(1, "", {});
    doFetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySearch = (value: string) => {
    setSearch(value);
    setPageNum(1);
    doFetch(1, value, filters);
  };

  const applyFilters = (newFilters: { is_active?: boolean }) => {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);
    setPageNum(1);
    doFetch(1, search, merged);
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setPageNum(1);
    doFetch(1, "", {});
  };

  const setPage = (p: number) => {
    setPageNum(p);
    doFetch(p, search, filters);
  };

  const fetchManagers = () => {
    doFetch(page, search, filters);
    doFetchStats();
  };

  return {
    managers,
    allManagers,
    stats,
    meta,
    page,
    setPage,
    search,
    applySearch,
    filters,
    applyFilters,
    resetFilters,
    isLoading,
    fetchManagers,
  };
}