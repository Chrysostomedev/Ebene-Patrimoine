/**
 * hooks/useManagers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook pour la gestion des gestionnaires (Managers).
 *
 * Différence clé avec useProviders :
 *   - Le backend retourne une liste simple (pas paginée)
 *   - La pagination, la recherche et les filtres sont gérés CÔTÉ FRONT
 *   - Les stats KPIs sont calculées localement depuis la liste complète
 *
 * Quand le backend évolue vers une pagination server-side, il suffit de
 * basculer fetchManagers() vers l'approche paginée (comme useProviders).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from "react";
import { ManagerService, Manager, ManagerStats } from "../services/manager.service";

// ── Constantes ────────────────────────────────────────────────────────────────
const PER_PAGE = 12; // Nombre de managers par page (pagination front)

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useManagers = () => {

  // ── État brut (tous les managers récupérés du backend) ────────────────────
  const [allManagers, setAllManagers] = useState<Manager[]>([]);

  // ── État de chargement ────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);

  // ── Pagination front ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Recherche (filtre local sur first_name, last_name, email) ────────────
  const [search, setSearch] = useState("");

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    /**
     * ── Filtre site — COMMENTÉ car pas encore géré côté Backend ─────────────
     * TODO: Décommenter quand l'API retournera le site du manager
     * site_id?: number;
     */
  }>({});

  // ── Fetch initial — charge TOUS les managers (liste simple du backend) ────
  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const data = await ManagerService.getManagers();
      setAllManagers(data);
    } catch (err) {
      console.error("Erreur chargement gestionnaires", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchManagers();
  }, []);

  // ── Managers filtrés (recherche + filtres) — recalculé à chaque changement ─
  const filteredManagers = useMemo(() => {
    let result = [...allManagers];

    // Filtre recherche — sur nom, prénom, email
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(m =>
        [m.first_name, m.last_name, m.email]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(q))
      );
    }

    // Filtre is_active
    if (filters.is_active !== undefined) {
      result = result.filter(m => m.is_active === filters.is_active);
    }

    /**
     * ── Filtre site — COMMENTÉ car pas encore géré côté Backend ─────────────
     * TODO: Décommenter quand l'API retournera managed_site sur le manager
     *
     * if (filters.site_id !== undefined) {
     *   result = result.filter(m => m.managed_site?.id === filters.site_id);
     * }
     */

    return result;
  }, [allManagers, search, filters]);

  // ── Pagination front — appliquée sur les managers filtrés ─────────────────
  const meta = useMemo(() => {
    const total = filteredManagers.length;
    const last_page = Math.max(1, Math.ceil(total / PER_PAGE));
    return {
      current_page: page,
      last_page,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredManagers.length, page]);

  // ── Managers de la page courante ───────────────────────────────────────────
  const managers = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredManagers.slice(start, start + PER_PAGE);
  }, [filteredManagers, page]);

  // ── Stats KPIs — calculées localement depuis allManagers ─────────────────
  const stats = useMemo<ManagerStats>(() => ({
    total_managers: allManagers.length,
    active_managers: allManagers.filter(m => m.is_active !== false).length,
    inactive_managers: allManagers.filter(m => m.is_active === false).length,
  }), [allManagers]);

  /**
   * ── applySearch ────────────────────────────────────────────────────────────
   * Met à jour le terme de recherche et remet la pagination à 1.
   */
  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  /**
   * ── applyFilters ───────────────────────────────────────────────────────────
   * Met à jour les filtres actifs et remet la pagination à 1.
   */
  const applyFilters = (newFilters: typeof filters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  /**
   * ── resetFilters ───────────────────────────────────────────────────────────
   * Remet tous les filtres à zéro.
   */
  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  return {
    // Liste paginée + filtrée (pour la page liste)
    managers,
    // Stats KPIs calculées localement
    stats,
    // Méta pagination
    meta,
    // Page courante
    page,
    setPage,
    // Recherche
    search,
    applySearch,
    // Filtres
    filters,
    applyFilters,
    resetFilters,
    // Loading
    isLoading,
    // Refetch manuel (après création, suppression, toggle statut)
    fetchManagers,
    // Liste complète (utile pour les selects dans les formulaires)
    allManagers,
  };
};