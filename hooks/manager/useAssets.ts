import { useState, useEffect, useCallback, useRef } from "react";
import { AssetService } from "../../services/manager/asset.service";
import type { Asset, AssetFilters, PaginatedResponse } from "../../types/manager.types";

export function useAssets(initialFilters: AssetFilters = {}) {
  const [data, setData] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Asset>["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    page: 1,
    per_page: 10,
    ...initialFilters,
  });
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(initialFilters.search);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAssets = useCallback(async () => {
     setIsLoading(true);
     setError(null);
     try {
       const response = await AssetService.getAssets({ ...filters, search: debouncedSearch }).catch(err => {
         if (err?.response?.status === 403) {
           return { items: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } };
         }
         throw err;
       });
       setData(response.items);
       setMeta(response.meta);
     } catch (err: any) {
       if (err?.response?.status === 403) {
         setError(null);
       } else {
         setError(err.message || "Erreur lors du chargement du patrimoine");
       }
     } finally {
       setIsLoading(false);
     }
   }, [filters, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [filters.search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const setPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const updateFilters = (newFilters: Partial<AssetFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      if (newFilters.search !== undefined) {
        next.page = 1;
      }
      return next;
    });
  };

  return {
    assets: data,
    meta,
    isLoading,
    error,
    filters,
    setPage,
    updateFilters,
    refresh: fetchAssets,
  };
}