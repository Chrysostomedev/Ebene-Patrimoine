// hooks/admin/useRoles.ts
import { useState, useEffect, useCallback } from "react";
import {
  RolesService,
  RoleUser,
  RoleStat,
  Role,
  CreateAdminPayload,
} from "../../services/admin/roles.service";

// ─────────────────────────────────────────────────────────────────────────────
// Slugs des 4 rôles — doivent correspondre exactement aux slugs en base
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_SLUGS = ["super-admin", "admin", "manager", "provider"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// KPIs calculés depuis les RoleStat
// ─────────────────────────────────────────────────────────────────────────────
export interface RoleKpis {
  totalUsers:    number;
  totalAdmins:   number;   // admin + super-admin
  totalManagers: number;
  totalProviders: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export const useRoles = () => {

  // ── Données ──
  const [users,     setUsers]     = useState<RoleUser[]>([]);
  const [roles,     setRoles]     = useState<Role[]>([]);
  const [stats,     setStats]     = useState<RoleStat[]>([]);
  const [kpis,      setKpis]      = useState<RoleKpis>({
    totalUsers: 0, totalAdmins: 0, totalManagers: 0, totalProviders: 0,
  });

  // ── États de chargement indépendants ──
  const [isLoading,       setIsLoading]       = useState(false);
  const [isCreating,      setIsCreating]       = useState(false);
  const [isTogglingId,    setIsTogglingId]     = useState<number | null>(null); // id en cours de toggle

  // ── Erreurs ──
  const [error,       setError]       = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // ─── Calcule les KPIs depuis les stats de rôle ───────────────────────────
  const buildKpis = useCallback((statsList: RoleStat[]): RoleKpis => {
    const get = (slug: string) =>
      statsList.find(s => s.role_slug === slug)?.user_count ?? 0;

    const admins    = get("admin") + get("super-admin");
    const managers  = get("manager");
    const providers = get("provider");

    return {
      totalUsers:     admins + managers + providers,
      totalAdmins:    admins,
      totalManagers:  managers,
      totalProviders: providers,
    };
  }, []);

  // ─── Chargement initial : stats + users en parallèle ─────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stats des rôles + tous les utilisateurs en parallèle
      const [fetchedStats, fetchedUsers, fetchedRoles] = await Promise.all([
        RolesService.getStats(),
        RolesService.getAllUsers([...ROLE_SLUGS]),
        RolesService.getRoles(),
      ]);

      setStats(fetchedStats);
      setKpis(buildKpis(fetchedStats));
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);

    } catch (err: any) {
      console.error("[useRoles] fetchAll:", err?.response ?? err);
      setError(
        err?.response?.data?.message ??
        err?.message ??
        "Erreur lors du chargement des utilisateurs."
      );
    } finally {
      setIsLoading(false);
    }
  }, [buildKpis]);

  // ─── Créer un admin ───────────────────────────────────────────────────────
  const createAdmin = useCallback(async (
    payload: CreateAdminPayload
  ): Promise<RoleUser | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const newUser = await RolesService.createAdmin(payload);

      // Injection optimiste dans la liste locale
      setUsers(prev => [newUser, ...prev]);

      // Recalcul des KPIs : +1 sur le rôle concerné
      setStats(prev => {
        const updated = prev.map(s =>
          s.role_slug === payload.role_slug
            ? { ...s, user_count: s.user_count + 1 }
            : s
        );
        setKpis(buildKpis(updated));
        return updated;
      });

      return newUser;
    } catch (err: any) {
      console.error("[useRoles] createAdmin:", err?.response ?? err);
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.errors?.email?.[0] ??   // erreur de validation email
        err?.message ??
        "Erreur lors de la création.";
      setCreateError(msg);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [buildKpis]);

  // ─── Toggle status (activer / désactiver) ────────────────────────────────
  const toggleUserStatus = useCallback(async (
    id: number,
    currentStatus: string
  ): Promise<boolean> => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setIsTogglingId(id);

    try {
      await RolesService.toggleUserStatus(id, newStatus);

      // Mise à jour optimiste locale — pas besoin de re-fetch
      setUsers(prev =>
        prev.map(u => u.id === id ? { ...u, status: newStatus } : u)
      );

      return true;
    } catch (err: any) {
      console.error("[useRoles] toggleUserStatus:", err?.response ?? err);
      return false;
    } finally {
      setIsTogglingId(null);
    }
  }, []);

  // ─── Changer le rôle d'un user ───────────────────────────────────────────
  const changeUserRole = useCallback(async (
    userId: number,
    newRoleSlug: string
  ): Promise<boolean> => {
    try {
      await RolesService.changeUserRole(userId, newRoleSlug);

      // Mise à jour optimiste
      setUsers(prev =>
        prev.map(u => {
          if (u.id !== userId) return u;
          const newRole = roles.find(r => r.slug === newRoleSlug) ?? null;
          return { ...u, role: newRole };
        })
      );

      // Refresh des stats pour que les KPIs restent justes
      const freshStats = await RolesService.getStats();
      setStats(freshStats);
      setKpis(buildKpis(freshStats));

      return true;
    } catch (err: any) {
      console.error("[useRoles] changeUserRole:", err?.response ?? err);
      return false;
    }
  }, [roles, buildKpis]);

  // ─── Montage ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    // Données
    users,
    roles,
    stats,
    kpis,

    // États
    isLoading,
    isCreating,
    isTogglingId,
    error,
    createError,

    // Actions
    fetchAll,
    createAdmin,
    toggleUserStatus,
    changeUserRole,
  };
};