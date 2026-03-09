/**
 * services/manager.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service HTTP pour les gestionnaires (Managers).
 *
 * Routes Laravel protégées par middleware admin :
 *   GET    /admin/managers          → index()   — liste tous les managers (User avec role MANAGER)
 *   POST   /admin/managers          → store()   — crée un manager
 *   GET    /admin/managers/{id}     → show()    — détails d'un manager
 *   PUT    /admin/managers/{id}     → update()  — modifier un manager
 *   DELETE /admin/managers/{id}     → destroy() — supprimer un manager
 *
 * Structure retournée par le backend :
 *   - Un manager = un User avec role MANAGER + relation manager (table managers)
 *   - index() retourne : User[] avec relation eager loaded "manager"
 *   - show()  retourne : User avec relations "manager" + "role"
 *
 * TODO (future API) :
 *   - GET /admin/managers/stats  — KPIs globaux managers
 *   - GET /admin/managers/{id}/tickets — tickets/interventions liés au manager
 *   - PUT /admin/managers/activate/{id}   — activer un manager
 *   - PUT /admin/managers/desactivate/{id} — désactiver un manager
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from "../core/axios";

// ── Interfaces ────────────────────────────────────────────────────────────────

/**
 * Relation "manager" eager-loaded sur l'User.
 * Correspond à la table `managers` (user_id, email, ...).
 */
export interface ManagerRelation {
  id: number;
  user_id: number;
  email: string;
  // TODO: ajouter les champs supplémentaires si la table managers évolue
  // ex: managed_site_id?: number;  site?: { id: number; name: string };
}

/**
 * Un gestionnaire = un User avec rôle MANAGER.
 * C'est la structure retournée par index() / show() / store() / update().
 */
export interface Manager {
  id: number;                     // id de l'User
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  role_id?: number;

  // Relations eager-loaded
  role?: { id: number; name: string };       // toujours "MANAGER"
  manager?: ManagerRelation;                  // relation managers table

  /**
   * ── Site géré — PRÉPARÉ pour future API ──────────────────────────────────
   * Le backend ne retourne pas encore cette relation.
   * Décommenter + adapter quand l'API gérera le site assigné au manager.
   *
   * managed_site?: {
   *   id: number;
   *   nom: string;
   *   address?: string;
   * };
   */
}

/**
 * Stats globales managers — STRUCTURE À ADAPTER selon future route /stats.
 * Pour l'instant, on calcule localement depuis la liste (voir useManagers).
 */
export interface ManagerStats {
  total_managers: number;
  active_managers: number;
  inactive_managers: number;
  // TODO: ajouter quand le backend implémente /admin/managers/stats
  // average_response_time?: string;
}

/**
 * Détails d'un manager + stats associées (pour la page details/[id]).
 * Retourné par show() enrichi côté service.
 */
export interface ManagerDetail {
  manager: Manager;
  // TODO: quand l'API retournera des stats par manager
  // stats: {
  //   total_tickets: number;
  //   in_progress_tickets: number;
  //   closed_tickets: number;
  // };
}

/**
 * Payload de création — correspond à la validation du store() Laravel :
 *   first_name : required|string|max:255
 *   last_name  : required|string|max:255
 *   email      : required|email|unique:users,email
 *   phone      : nullable|string
 *   password   : non validé mais utilisé dans ManagerService::createManager()
 */
export interface CreateManagerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password?: string;  // Optionnel — le service utilise 'password123' par défaut si absent
}

/**
 * Payload de mise à jour — tous les champs sont "sometimes" (optionnels) :
 *   first_name : sometimes|string|max:255
 *   last_name  : sometimes|string|max:255
 *   email      : sometimes|email|unique:users,email,{id}
 *   phone      : nullable|string
 */
export interface UpdateManagerPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

// ── ManagerService ────────────────────────────────────────────────────────────

export const ManagerService = {

  /**
   * GET /admin/managers
   * Récupère la liste de tous les gestionnaires.
   *
   * ⚠️  Le backend retourne un tableau simple (pas de pagination).
   *     La pagination est gérée côté front dans useManagers.
   *     Si le backend évolue vers une pagination, adapter ici.
   *
   * @param params — optionnels, préparés pour future pagination/filtres backend
   */
  async getManagers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
    /**
     * ── Filtre site — COMMENTÉ car pas encore géré côté Backend ─────────────
     * TODO: Décommenter quand l'API supportera le filtre par site
     * site_id?: number;
     */
  }): Promise<Manager[]> {
    const response = await axios.get("/admin/managers", { params });

    // Le backend retourne { data: Manager[], message: string }
    // On extrait selon la structure BaseController::Response()
    return response.data.data ?? [];
  },

  /**
   * GET /admin/managers/{id}
   * Retourne les détails d'un manager avec ses relations (manager + role).
   */
  async getManager(id: number): Promise<ManagerDetail> {
    const response = await axios.get(`/admin/managers/${id}`);

    return {
      manager: response.data.data,
      // TODO: enrichir avec stats quand l'API le supportera
    };
  },

  /**
   * POST /admin/managers
   * Crée un nouveau gestionnaire.
   * Côté backend : crée User + enregistre dans table managers + assigne rôle MANAGER.
   */
  async createManager(payload: CreateManagerPayload): Promise<Manager> {
    const response = await axios.post("/admin/managers", payload);
    return response.data.data;
  },

  /**
   * PUT /admin/managers/{id}
   * Met à jour un gestionnaire (champs optionnels).
   * Si email modifié, le backend sync aussi la table managers.
   */
  async updateManager(id: number, payload: UpdateManagerPayload): Promise<Manager> {
    const response = await axios.put(`/admin/managers/${id}`, payload);
    return response.data.data;
  },

  /**
   * DELETE /admin/managers/{id}
   * Supprime un gestionnaire (soft delete si configuré, hard delete sinon).
   */
  async deleteManager(id: number): Promise<boolean> {
    const response = await axios.delete(`/admin/managers/${id}`);
    return response.data.success ?? true;
  },

  /**
   * ── Activation / Désactivation — PRÉPARÉS pour future API ────────────────
   * Le backend n'a pas encore ces routes, mais le modèle User a "is_active".
   * On peut simuler via updateManager en attendant la vraie route.
   *
   * TODO: Remplacer par une vraie route quand disponible :
   *   PUT /admin/managers/activate/{id}
   *   PUT /admin/managers/desactivate/{id}
   */
  async activateManager(id: number): Promise<Manager> {
    // Simulation via update jusqu'à ce que la vraie route existe
    const response = await axios.put(`/admin/managers/${id}`, { is_active: true });
    return response.data.data;
  },

  async desactivateManager(id: number): Promise<Manager> {
    // Simulation via update jusqu'à ce que la vraie route existe
    const response = await axios.put(`/admin/managers/${id}`, { is_active: false });
    return response.data.data;
  },

  /**
   * ── Tickets par manager — PRÉPARÉ pour future API ────────────────────────
   * TODO: Décommenter et adapter quand la route sera disponible
   *
   * async getManagerTickets(id: number, params?: { page?: number; status?: string }) {
   *   const response = await axios.get(`/admin/managers/${id}/tickets`, { params });
   *   return {
   *     items: response.data.data ?? [],
   *     meta: response.data.meta ?? { current_page: 1, last_page: 1, total: 0 },
   *   };
   * },
   */

  /**
   * ── Stats globales — PRÉPARÉ pour future API ─────────────────────────────
   * TODO: Décommenter quand la route /admin/managers/stats sera disponible
   *
   * async getStats(): Promise<ManagerStats> {
   *   const response = await axios.get("/admin/managers/stats");
   *   return response.data.data;
   * },
   */
};