"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useProviders.ts
//
// Stratégie Option B :
//   1. Charge tous les tickets du site → GET /manager/ticket
//   2. Déduplique par provider.id → liste prestataires
//   3. Calcule les stats globaux côté client
//   4. Recherche client-side sur le tableau en mémoire
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  ProviderService,
  type Provider,
  type ProviderStats,
  type ProviderFilters,
  type ProviderTicket,
} from "../../services/manager/provider.service";

interface UseProvidersReturn {
  providers: Provider[];
  filteredProviders: Provider[];
  stats: ProviderStats | null;
  isLoading: boolean;
  error: string | null;
  search: (value: string) => void;
  refresh: () => void;
  exportProviders: () => Promise<void>;
}

export function useProviders(
  initialFilters: ProviderFilters = {}
): UseProvidersReturn {
  const [providers, setProviders]               = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [rawTickets, setRawTickets]             = useState<ProviderTicket[]>([]);
  const [stats, setStats]                       = useState<ProviderStats | null>(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [error, setError]                       = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { providers: list, rawTickets: tickets } =
        await ProviderService.getProviders(initialFilters);

      const globalStats = ProviderService.computeGlobalStats(list, tickets);

      setProviders(list);
      setFilteredProviders(list);
      setRawTickets(tickets);
      setStats(globalStats);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Impossible de charger les prestataires."
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Recherche client-side : filtre sur company_name, city, service.name
   */
  const search = (value: string) => {
    const v = value.toLowerCase().trim();
    if (!v) {
      setFilteredProviders(providers);
      return;
    }
    setFilteredProviders(
      providers.filter(
        (p) =>
          p.company_name?.toLowerCase().includes(v) ||
          p.city?.toLowerCase().includes(v) ||
          p.service?.name?.toLowerCase().includes(v)
      )
    );
  };

  /**
   * Export : délègue sur GET /manager/ticket/export
   */
  const exportProviders = async () => {
    try {
      const blob = await ProviderService.exportProviderTickets();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `prestataires_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export prestataires", err);
    }
  };

  return {
    providers,
    filteredProviders,
    stats,
    isLoading,
    error,
    search,
    refresh: fetchAll,
    exportProviders,
  };
}