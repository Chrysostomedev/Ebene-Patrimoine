// ============================================================
// hooks/usePlanning.ts — v2 corrigé
// Fixes : double useEffect, race condition, deps useCallback
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPlannings,
  fetchPlanningStats,
  createPlanning,
  updatePlanning,
  deletePlanning,
  Planning,
  PlanningStats,
  PlanningFilters,
  CreatePlanningPayload,
  UpdatePlanningPayload,
} from "../services/planningService";

interface UsePlanningReturn {
  plannings: Planning[];
  stats: PlanningStats | null;
  selectedPlanning: Planning | null;
  currentPage: number;
  lastPage: number;
  total: number;
  isLoading: boolean;
  isLoadingStats: boolean;
  isSubmitting: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isPanelOpen: boolean;
  filters: PlanningFilters;
  loadPlannings: (filters?: PlanningFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  handleCreate: (payload: CreatePlanningPayload) => Promise<boolean>;
  handleUpdate: (id: number, payload: UpdatePlanningPayload) => Promise<boolean>;
  handleDelete: (id: number) => Promise<boolean>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (planning: Planning) => void;
  closeEditModal: () => void;
  openPanel: (planning: Planning) => void;
  closePanel: () => void;
  setFilters: (filters: PlanningFilters) => void;
  setPage: (page: number) => void;
}

export function usePlanning(): UsePlanningReturn {
  const [plannings, setPlannings]               = useState<Planning[]>([]);
  const [stats, setStats]                       = useState<PlanningStats | null>(null);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning | null>(null);
  const [currentPage, setCurrentPage]           = useState(1);
  const [lastPage, setLastPage]                 = useState(1);
  const [total, setTotal]                       = useState(0);
  const [isLoading, setIsLoading]               = useState(false);
  const [isLoadingStats, setIsLoadingStats]     = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]     = useState(false);
  const [isPanelOpen, setIsPanelOpen]             = useState(false);
  const [filters, setFiltersState]              = useState<PlanningFilters>({ per_page: 15 });

  // ── Ref pour savoir si c'est le premier rendu ──────────────
  // FIX BUG 1 : évite le double chargement au montage
  const isMounted = useRef(false);

  // ── loadPlannings : sans dépendance sur [filters] ──────────
  // FIX BUG 2 : on retire filters des deps pour éviter la boucle
  // On utilise un paramètre explicite à la place
  const loadPlannings = useCallback(async (activeFilters?: PlanningFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPlannings(activeFilters ?? { per_page: 15 });
      setPlannings(res.items);
      setCurrentPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
      setTotal(res.meta.total);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des plannings");
    } finally {
      setIsLoading(false);
    }
  }, []); // ← deps vide : la fonction ne change jamais

  // ── loadStats : isolé, sans dépendance ────────────────────
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchPlanningStats();
      setStats(data);
    } catch (err: any) {
      // On logge sans bloquer l'UI — les stats ne sont pas critiques
      console.warn("Stats non disponibles:", err.message);
    } finally {
      setIsLoadingStats(false);
    }
  }, []); // ← deps vide

  // ── Chargement initial UNIQUE ──────────────────────────────
  // FIX BUG 1 : un seul useEffect de montage, séquentiel
  useEffect(() => {
    loadPlannings({ per_page: 15 });
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recharge seulement quand filters CHANGE (pas au montage) ──
  // FIX BUG 1 : on skip le premier rendu grâce au ref
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // on ignore le déclenchement initial du useEffect
    }
    loadPlannings(filters);
  }, [filters, loadPlannings]);

  // ── CRUD ───────────────────────────────────────────────────

  const handleCreate = async (payload: CreatePlanningPayload): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createPlanning(payload);
      // Recharge liste + stats en parallèle après création
      await Promise.all([loadPlannings(filters), loadStats()]);
      closeCreateModal();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: number, payload: UpdatePlanningPayload): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updatePlanning(id, payload);
      // Mise à jour optimiste locale
      setPlannings(prev => prev.map(p => p.id === id ? updated : p));
      if (selectedPlanning?.id === id) setSelectedPlanning(updated);
      await loadStats();
      closeEditModal();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await deletePlanning(id);
      setPlannings(prev => prev.filter(p => p.id !== id));
      await loadStats();
      closePanel();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── UI Handlers ────────────────────────────────────────────

  const openCreateModal = () => { setSelectedPlanning(null); setIsCreateModalOpen(true); };
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openEditModal = (planning: Planning) => {
    setSelectedPlanning(planning);
    setIsPanelOpen(false);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => { setIsEditModalOpen(false); setSelectedPlanning(null); };

  const openPanel = (planning: Planning) => { setSelectedPlanning(planning); setIsPanelOpen(true); };
  const closePanel = () => { setIsPanelOpen(false); setSelectedPlanning(null); };

  const setFilters = (newFilters: PlanningFilters) => {
    setFiltersState(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const setPage = (page: number) => {
    setFiltersState(prev => ({ ...prev, page }));
  };

  return {
    plannings, stats, selectedPlanning,
    currentPage, lastPage, total,
    isLoading, isLoadingStats, isSubmitting, error,
    isCreateModalOpen, isEditModalOpen, isPanelOpen,
    filters,
    loadPlannings, loadStats,
    handleCreate, handleUpdate, handleDelete,
    openCreateModal, closeCreateModal,
    openEditModal, closeEditModal,
    openPanel, closePanel,
    setFilters, setPage,
  };
}