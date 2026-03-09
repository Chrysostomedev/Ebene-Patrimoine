// hooks/useAssets.ts
import { useState, useEffect, useRef } from "react";
import { CompanyAsset, AssetService } from "../services/asset.service";

const PER_PAGE = 15;

export const useAssets = () => {
  const [assets,    setAssets]    = useState<CompanyAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [meta,      setMeta]      = useState<{
    current_page: number; last_page: number; per_page: number; total: number;
  } | null>(null);
  const [page,    setPageState] = useState(1);
  const [filters, setFilters]   = useState<{
    search?:      string;
    type_id?:     number;
    sub_type_id?: number;
    status?:      string;
    site_id?:     number;
  }>({});

  // Références pour éviter les closures périmées
  const pageRef    = useRef(page);
  const filtersRef = useRef(filters);
  useEffect(() => { pageRef.current    = page;    }, [page]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchAssets = async (
    overridePage?:    number,
    overrideFilters?: typeof filters
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page:     overridePage    ?? pageRef.current,
        per_page: PER_PAGE,
        ...(overrideFilters ?? filtersRef.current),
      };
      const data = await AssetService.getAssets(params);
      setAssets(data.items);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? "Erreur lors de la récupération des actifs");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch à chaque changement de page ou filtre
  useEffect(() => {
    fetchAssets(page, filters);
  }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPage = (newPage: number) => {
    setPageState(newPage);
  };

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPageState(1);
  };

  return {
    assets,
    isLoading,
    error,
    fetchAssets: () => fetchAssets(),
    meta,
    page,
    setPage,
    filters,
    applyFilters,
  };
};