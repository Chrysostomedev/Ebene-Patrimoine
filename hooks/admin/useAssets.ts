// hooks/admin/useAssets.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { CompanyAsset, AssetService } from "../../services/admin/asset.service";

const PER_PAGE = 15;

type Filters = {
  search?: string;
  type_id?: number;
  sub_type_id?: number;
  status?: string;
  site_id?: number;
};

export const useAssets = () => {
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    current_page: number; last_page: number; per_page: number; total: number;
  } | null>(null);
  const [page, setPageState] = useState(1);
  const [filters, setFilters] = useState<Filters>({});

  const fetchAssets = useCallback(async (
    overridePage?: number,
    overrideFilters?: Filters
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AssetService.getAssets({
        page: overridePage ?? 1,
        per_page: PER_PAGE,
        ...(overrideFilters ?? {}),
      });
      setAssets(data.items);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? "Erreur");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    fetchAssets(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey]);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const applyFilters = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPageState(1);
  }, []);

  const refetch = useCallback(() => {
    // Lit les valeurs courantes via un setState fonctionnel pour éviter les stale closures
    setPageState(p => {
      setFilters(f => {
        fetchAssets(p, f);
        return f;
      });
      return p;
    });
  }, [fetchAssets]);

  return {
    assets,
    isLoading,
    error,
    fetchAssets: refetch,
    meta,
    page,
    setPage,
    filters,
    applyFilters,
  };
};