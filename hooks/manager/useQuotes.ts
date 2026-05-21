import { useState, useEffect, useCallback, useRef } from "react";
import { QuoteService } from "../../services/manager/quote.service";
import type { Quote, QuoteFilters, QuoteStats, PaginatedResponse } from "../../types/manager.types";

export function useQuotes(initialFilters: QuoteFilters = {}) {
  const [data, setData] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<Quote>["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<QuoteFilters>({
    page: 1,
    per_page: 15,
    ...initialFilters,
  });
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(initialFilters.search);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [filters.search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeFilters = { ...filters, search: debouncedSearch };
      const [paginatedData, statsData] = await Promise.all([
        QuoteService.getQuotes(activeFilters),
        QuoteService.getStats(activeFilters),
      ]);
      setData(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement des devis");
    } finally {
      setIsLoading(false);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = (partial: Partial<QuoteFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...partial };
      if (partial.search !== undefined) {
        next.page = 1;
      }
      return next;
    });
  };

  const exportQuotes = async () => {
    try {
      const blob = await QuoteService.exportQuotes({ ...filters, search: debouncedSearch });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devis_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export devis", err);
    }
  };

  return {
    quotes: data,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: fetchData,
    exportQuotes,
  };
}