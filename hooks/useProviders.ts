// hooks/useProviders.ts
import { useState, useEffect, useCallback } from "react";
import { ProviderService, Provider, ProviderStats } from "../services/provider.service";

export const useProviders = () => {
  const [providers,  setProviders]  = useState<Provider[]>([]);
  const [stats,      setStats]      = useState<ProviderStats | null>(null);
  const [meta,       setMeta]       = useState({ current_page: 1, last_page: 1, per_page: 9, total: 0 });
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [filters,    setFilters]    = useState<{ is_active?: boolean; service_id?: number }>({});
  const [isLoading,  setIsLoading]  = useState(false);
  const [loading,    setLoading]    = useState(false); // rétrocompat selects

  // ── Fetch liste paginée (page liste prestataires) ──
  const fetchProviders = useCallback(async (
    overridePage?:    number,
    overrideSearch?:  string,
    overrideFilters?: { is_active?: boolean; service_id?: number },
  ) => {
    setIsLoading(true);
    try {
      const p = overridePage    ?? page;
      const s = overrideSearch  ?? search;
      const f = overrideFilters ?? filters;

      const result = await ProviderService.getProviders({
        page:       p,
        per_page:   9,
        search:     s || undefined,
        is_active:  f.is_active,
        service_id: f.service_id,
      }) as { items: Provider[]; meta: any };

      // Protège contre une réponse inattendue (tableau simple)
      if (Array.isArray(result)) {
        setProviders(result as Provider[]);
      } else {
        setProviders(result.items ?? []);
        setMeta(result.meta ?? { current_page: 1, last_page: 1, per_page: 9, total: 0 });
      }
    } catch (err) {
      console.error("Erreur chargement prestataires", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filters]);

  // ── Fetch stats globales ──
  const fetchStats = useCallback(async () => {
    try {
      const data = await ProviderService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Erreur stats prestataires", err);
    }
  }, []);

  // ── Fetch simplifié pour les selects (rétrocompat) ──
  const fetchSimple = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProviderService.getProviders();
      if (Array.isArray(data)) setProviders(data as Provider[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch automatique au montage + quand page/search/filters changent ──
  useEffect(() => {
    fetchProviders();
  }, [page, search, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stats au montage ──
  useEffect(() => {
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──
  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const applyFilters = (newFilters: { is_active?: boolean; service_id?: number }) => {
    setFilters(newFilters); // remplace complètement (le dropdown envoie l'objet complet)
    setPage(1);
  };

  const handleSetPage = (p: number) => {
    setPage(p);
  };

  return {
    providers,
    loading,   // rétrocompat selects
    isLoading, // état de chargement liste
    stats,
    meta,
    page,
    setPage: handleSetPage,
    search,
    applySearch,
    filters,
    applyFilters,
    fetchProviders: () => fetchProviders(),
    fetchStats,
    fetchSimple,
  };
};