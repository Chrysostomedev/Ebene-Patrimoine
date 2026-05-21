// hooks/admin/useServices.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { ServiceService, Service } from "../../services/admin/service.service";

export const useServices = (initialPage = 1, initialSearch = "") => {
  const [services, setServices] = useState<Service[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchServices = useCallback(async (p = page, s = debouncedSearch) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ServiceService.getServices({ page: p, search: s });
      const data = response.data || [];
      setServices(data);
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la récupération des services.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Re-fetch when page or debouncedSearch changes
  useEffect(() => {
    fetchServices(page, debouncedSearch);
  }, [page, debouncedSearch, fetchServices]);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
  }, []);

  return {
    services,
    meta,
    isLoading,
    error,
    fetchServices,
    page,
    setPage,
    search,
    setSearch,
    loading: isLoading,
  };
};