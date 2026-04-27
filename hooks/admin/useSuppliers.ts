// hooks/admin/useSuppliers.ts
import { useState, useEffect, useCallback } from "react";
import { SupplierService, Supplier } from "../../services/admin/supplier.service";

export const useSuppliers = () => {
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [stats,      setStats]      = useState<any | null>(null);
  const [meta,       setMeta]       = useState({ current_page: 1, last_page: 1, per_page: 9, total: 0 });
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [filters,    setFilters]    = useState<{ is_active?: boolean }>({});
  const [isLoading,  setIsLoading]  = useState(false);

  // ── Fetch liste paginée ──
  const fetchSuppliers = useCallback(async (
    overridePage?:    number,
    overrideSearch?:  string,
    overrideFilters?: { is_active?: boolean },
  ) => {
    setIsLoading(true);
    try {
      const p = overridePage    ?? page;
      const s = overrideSearch  ?? search;
      const f = overrideFilters ?? filters;

      const result = await SupplierService.getSuppliers({
        page:       p,
        per_page:   9,
        search:     s || undefined,
        is_active:  f.is_active,
      }) as any;

      if (Array.isArray(result)) {
        setSuppliers(result);
      } else {
        setSuppliers(result.items ?? result.data ?? []);
        setMeta(result.meta ?? { current_page: 1, last_page: 1, per_page: 9, total: 0 });
      }
    } catch (err) {
      console.error("Erreur chargement fournisseurs", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filters]);

  // ── Fetch stats globales ──
  const fetchStats = useCallback(async () => {
    try {
      const data = await SupplierService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Erreur stats fournisseurs", err);
    }
  }, []);

  // ── Fetch automatique au montage + quand page/search/filters changent ──
  useEffect(() => {
    fetchSuppliers();
  }, [page, search, filters, fetchSuppliers]);

  // ── Stats au montage ──
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Helpers ──
  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const applyFilters = (newFilters: { is_active?: boolean }) => {
    setFilters(newFilters);
    setPage(1);
  };

  return {
    suppliers,
    isLoading,
    stats,
    meta,
    page,
    setPage,
    search,
    applySearch,
    filters,
    applyFilters,
    fetchSuppliers: () => fetchSuppliers(),
    fetchStats,
  };
};
