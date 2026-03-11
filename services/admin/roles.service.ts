// services/admin/roles.service.ts
import axios from "../../core/axios";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — alignées sur les modèles Laravel (Roles + User)
// ─────────────────────────────────────────────────────────────────────────────

/** Modèle Role tel que retourné par Laravel */
export interface Role {
  id:         number;
  name:       string;
  slug:       string;           // "super-admin" | "admin" | "manager" | "provider"
  users_count?: number;         // withCount('users') dans RolesController::index()
  created_at?: string;
  updated_at?: string;
}

/** Stat par rôle retournée par getRoleStats() */
export interface RoleStat {
  role_id:    number;
  role_name:  string;
  role_slug:  string;
  user_count: number;
}

/** Utilisateur tel que retourné par getUsersByRole() → User::with('role') */
export interface RoleUser {
  id:         number;
  name?:      string;           // champ name sur le modèle User
  first_name?: string;          // fallback si Admin model
  email:      string;
  phone?:     string;
  phone_number?: string;        // Admin model
  status?:    "active" | "inactive" | string;
  site_id?:   number;
  site?: {
    id:  number;
    nom: string;
  } | null;
  role?: Role | null;
  created_at?: string;
}

/** Payload de création d'un admin (POST /admin/admins) */
export interface CreateAdminPayload {
  name:      string;
  email:     string;
  phone:     string;
  password:  string;
  role_slug: "admin" | "super-admin";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Résout le nom d'un user quelle que soit la structure du modèle */
export const resolveUserName = (user: RoleUser): string =>
  user.name ?? user.first_name ?? "—";

/** Résout le téléphone d'un user */
export const resolveUserPhone = (user: RoleUser): string =>
  user.phone ?? user.phone_number ?? "—";

/** Formate la date de création en dd/mm/yyyy */
export const formatJoinedDate = (dateStr?: string): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  } catch {
    return dateStr;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const RolesService = {

  /**
   * Statistiques des rôles — GET /super-admin/roles/stats
   * Retourne [{ role_id, role_name, role_slug, user_count }]
   * Utilisé pour les KPIs (total users, admins, managers, providers)
   */
  async getStats(): Promise<RoleStat[]> {
    const res = await axios.get("/super-admin/roles/stats");
    // BaseController::Response() wrappe dans { data: ... }
    return res.data?.data ?? res.data ?? [];
  },

  /**
   * Liste de tous les rôles — GET /super-admin/roles
   * Retourne les rôles paginés avec users_count
   */
  async getRoles(): Promise<Role[]> {
    const res = await axios.get("/super-admin/roles");
    const raw = res.data?.data ?? res.data;
    // Réponse paginée Laravel : { data: [...], meta: {...} }
    return raw?.data ?? raw ?? [];
  },

  /**
   * Utilisateurs d'un rôle spécifique — GET /super-admin/roles/{slug}/users
   * Retourne User::where('role_id')->with('role')->get()
   */
  async getUsersByRole(slug: string): Promise<RoleUser[]> {
    const res = await axios.get(`/super-admin/roles/${slug}/users`);
    return res.data?.data ?? res.data ?? [];
  },

  /**
   * Tous les utilisateurs de tous les rôles — appels parallèles par slug
   * On charge les 4 rôles en parallèle et on fusionne.
   * Les slugs correspondent aux roles en base.
   */
  async getAllUsers(roleSlugs: string[]): Promise<RoleUser[]> {
    const results = await Promise.all(
      roleSlugs.map(slug =>
        axios
          .get(`/super-admin/roles/${slug}/users`)
          .then(r => (r.data?.data ?? r.data ?? []) as RoleUser[])
          .catch(() => [] as RoleUser[]) // si un rôle n'existe pas encore, on ignore
      )
    );
    // Fusionner + dédupliquer par id
    const map = new Map<number, RoleUser>();
    results.flat().forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  },

  /**
   * Créer un administrateur — POST /admin/admins
   * Accessible super-admin uniquement via le middleware route
   */
  async createAdmin(payload: CreateAdminPayload): Promise<RoleUser> {
    const res = await axios.post("/admin/admins", payload);
    return res.data?.data ?? res.data;
  },

  /**
   * Activer / Désactiver un utilisateur — PUT /admin/admins/{id}
   * RolesServices::updateRole() fait un $role->update($data) générique.
   * On envoie { status: "active" | "inactive" } pour mettre à jour le champ.
   */
  async toggleUserStatus(
    id: number,
    newStatus: "active" | "inactive"
  ): Promise<RoleUser> {
    const res = await axios.put(`/admin/admins/${id}`, { status: newStatus });
    return res.data?.data ?? res.data;
  },

  /**
   * Changer le rôle d'un utilisateur — PUT /super-admin/roles/{id}
   * On passe { role_slug } et le service updateRole() met à jour.
   */
  async changeUserRole(userId: number, roleSlug: string): Promise<RoleUser> {
    const res = await axios.put(`/admin/admins/${userId}`, { role_slug: roleSlug });
    return res.data?.data ?? res.data;
  },
};