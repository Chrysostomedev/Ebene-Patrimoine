import { useState, useEffect, useCallback } from "react";
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

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AssetService.getAssets(filters);
      setData(response.items);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du patrimoine");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const setPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const updateFilters = (newFilters: Partial<AssetFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
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