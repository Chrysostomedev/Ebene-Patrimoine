"use client";

import { useState, useEffect, useCallback } from "react";
import {
  providerPlanningService,
  Planning,
  PlanningStats,
  PlanningFilters,
} from "../services/providerPlanningService";

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseProviderPlanningReturn {
  // Data
  plannings:       Planning[];
  stats:           PlanningStats | null;
  selectedPlanning: Planning | null;

  // States
  isLoading:       boolean;
  isLoadingStats:  boolean;
  error:           string;

  // Panel
  isPanelOpen:     boolean;
  openPanel:       (planning: Planning) => void;
  closePanel:      () => void;

  // Filtres
  filters:         PlanningFilters;
  setFilters:      (f: Partial<PlanningFilters>) => void;

  // Actions
  refresh:         () => void;
}

export function useProviderPlanning(): UseProviderPlanningReturn {
  const [plannings,        setPlannings]        = useState<Planning[]>([]);
  const [stats,            setStats]            = useState<PlanningStats | null>(null);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning | null>(null);

  const [isLoading,        setIsLoading]        = useState(true);
  const [isLoadingStats,   setIsLoadingStats]   = useState(true);
  const [error,            setError]            = useState("");

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [filters, setFiltersState] = useState<PlanningFilters>({ per_page: 200 });

  // ── Fetch plannings ────────────────────────────────────────────────────────
  const fetchPlannings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await providerPlanningService.getPlannings(filters);
      setPlannings(result.items);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement des plannings.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const result = await providerPlanningService.getStats();
      setStats(result);
    } catch {
      // non bloquant
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchPlannings(); }, [fetchPlannings]);
  useEffect(() => { fetchStats();    }, [fetchStats]);

  // ── Filtres ────────────────────────────────────────────────────────────────
  const setFilters = (partial: Partial<PlanningFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  // ── Panel ──────────────────────────────────────────────────────────────────
  const openPanel = (planning: Planning) => {
    setSelectedPlanning(planning);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedPlanning(null), 300);
  };

  return {
    plannings,
    stats,
    selectedPlanning,
    isLoading,
    isLoadingStats,
    error,
    isPanelOpen,
    openPanel,
    closePanel,
    filters,
    setFilters,
    refresh: fetchPlannings,
  };
}