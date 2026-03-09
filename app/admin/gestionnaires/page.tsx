"use client";

/**
 * app/admin/gestionnaires/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page liste gestionnaires — refonte UI :
 *  - Filtre avec dropdown propre (ref click-outside)
 *  - Boutons Exporter + Importer (importer → toast "en cours de développement")
 *  - Profil → side panel à droite (ManagerProfilPanel)
 *  - Palette noir/blanc/gris uniquement
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from "react";
import { Filter, Upload, Download, PlusCircle, Search, Users, UserCheck, UserX } from "lucide-react";

import Navbar               from "@/components/Navbar";
import Sidebar              from "@/components/Sidebar";
import SearchInput          from "@/components/SearchInput";
import ReusableForm         from "@/components/ReusableForm";
import StatsCard            from "@/components/StatsCard";
import Paginate             from "@/components/Paginate";
import PageHeader           from "@/components/PageHeader";
import GestCard             from "@/components/GestCard";
import ManagerProfilPanel   from "@/components/managerProfilPanel";

import { useManagers }                    from "../../../hooks/useManagers";
import { ManagerService, Manager }        from "../../../services/manager.service";

export default function GestionnairesPage() {

  // ── Hook managers ──────────────────────────────────────────────────────────
  const {
    managers, stats, isLoading, meta,
    page, setPage,
    applySearch, applyFilters, filters,
    fetchManagers,
  } = useManagers();

  // ── UI State ───────────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen]             = useState(false);
  const [selectedManager, setSelectedManager]     = useState<Manager | null>(null); // pour le side panel
  const [flash, setFlash]                         = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ── Ref pour fermer le dropdown filtre au clic extérieur ──────────────────
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtersOpen]);

  // ── Compteur de filtres actifs (pour le badge sur le bouton) ──────────────
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length;

  // ── Flash message ──────────────────────────────────────────────────────────
  const showFlash = (type: "success" | "error" | "info", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 3000);
  };

   // ── Import / Export — endpoints pas encore en ligne ──
   const handleExport = () =>
    showFlash("error", "Fonctionnalité d'export en cours de développement.");
  const handleImport = () =>
    showFlash("error", "Fonctionnalité d'import en cours de développement.");

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Total gestionnaires",      value: stats?.total_managers   ?? 0, delta: "+0%", trend: "up"   as const },
    { label: "Gestionnaires actifs",     value: stats?.active_managers  ?? 0, delta: "+0%", trend: "up"   as const },
    { label: "Gestionnaires inactifs",   value: stats?.inactive_managers ?? 0, delta: "+0%", trend: "down" as const },
  ];

  // ── Champs formulaire création ─────────────────────────────────────────────
  const gestFields = [
    { name: "first_name", label: "Prénom",        type: "text",  required: true },
    { name: "last_name",  label: "Nom",            type: "text",  required: true },
    { name: "email",      label: "Email",          type: "email", required: true },
    { name: "phone",      label: "Téléphone",      type: "text"                  },
    { name: "password",   label: "Mot de passe",   type: "text"                  },
  ];

  // ── Création ───────────────────────────────────────────────────────────────
  const handleCreate = async (formData: any) => {
    try {
      await ManagerService.createManager({
        first_name: formData.first_name,
        last_name:  formData.last_name,
        email:      formData.email,
        phone:      formData.phone    || undefined,
        password:   formData.password || undefined,
      });
      showFlash("success", "Gestionnaire créé avec succès");
      setIsCreateModalOpen(false);
      fetchManagers();
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message || "Erreur lors de la création");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">

          {/* ── En-tête ────────────────────────────────────────────────── */}
          <PageHeader
            title="Gestionnaires"
            subtitle="Gérez les managers et leurs accès à la plateforme"
          />

          {/* ── Flash message ─────────────────────────────────────────── */}
          {flash && (
            <div className={`px-5 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              flash.type === "success" ? "bg-slate-900 text-white" :
              flash.type === "info"    ? "bg-slate-100 text-slate-700 border border-slate-200" :
                                         "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {flash.message}
            </div>
          )}

          {/* ── KPIs ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
          </div>

          {/* ── Toolbar : Filtres + Actions ────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* ── Barre de recherche ───────────────────────────────────── */}
            <div className="w-72">
              <SearchInput
                onSearch={applySearch}
                placeholder="Rechercher un gestionnaire..."
              />
            </div>

            {/* ── Actions droite ───────────────────────────────────────── */}
            <div className="flex items-center gap-2">

              {/* ── Filtre dropdown ────────────────────────────────────── */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    filtersOpen || activeFilterCount > 0
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={14} />
                  Filtrer par
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Dropdown filtre */}
                {filtersOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-4">

                    {/* Label */}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Statut
                    </p>

                    {/* Options statut */}
                    <div className="space-y-1.5">
                      {[
                        { label: "Tous",      value: ""      },
                        { label: "Actifs",    value: "true"  },
                        { label: "Inactifs",  value: "false" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            applyFilters({
                              is_active: opt.value === "" ? undefined : opt.value === "true",
                            });
                            setFiltersOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (opt.value === "" && filters.is_active === undefined) ||
                            (opt.value === "true"  && filters.is_active === true)  ||
                            (opt.value === "false" && filters.is_active === false)
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/*
                     * ── Filtre site — COMMENTÉ, préparé pour future API ───
                     * TODO: décommenter quand l'API supportera ce filtre
                     *
                     * <div>
                     *   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                     *     Site
                     *   </p>
                     *   <div className="space-y-1.5">
                     *     <button onClick={() => applyFilters({ site_id: undefined })} ...>
                     *       Tous les sites
                     *     </button>
                     *     {sites.map(s => (
                     *       <button key={s.id} onClick={() => applyFilters({ site_id: s.id })} ...>
                     *         {s.name}
                     *       </button>
                     *     ))}
                     *   </div>
                     * </div>
                     */}

                    {/* Reset filtres */}
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { applyFilters({ is_active: undefined }); setFiltersOpen(false); }}
                        className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 font-medium pt-1 border-t border-slate-100 transition-colors"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Importer */}
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Download size={16} /> Importer
              </button>

              {/* Exporter */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Upload size={16} /> Exporter
              </button>

              {/* ── Ajouter ──────────────────────────────────────────── */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all"
              >
                <PlusCircle size={14} />
                Ajouter
              </button>
            </div>
          </div>

          {/* ── Grille de cartes ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">

            {isLoading ? (
              <div className="text-center py-20 text-slate-300 text-sm italic">
                Chargement...
              </div>
            ) : managers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(m => (
                  <GestCard
                    key={m.id}
                    id={m.id}
                    firstName={m.first_name}
                    lastName={m.last_name}
                    email={m.email}
                    phone={m.phone}
                    role={m.role?.name ?? "Manager"}
                    status={m.is_active !== false ? "Actif" : "Inactif"}
                    // onProfilClick → ouvre le side panel à droite
                    onProfilClick={() => setSelectedManager(m)}
                    /*
                     * ── site — COMMENTÉ, préparé pour future API ─────────
                     * site={m.managed_site?.nom}
                     */
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-300 text-sm">
                Aucun gestionnaire trouvé.
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-end pt-4 border-t border-slate-50">
              <Paginate
                currentPage={page}
                totalPages={meta.last_page}
                onPageChange={setPage}
              />
            </div>
          </div>

          {/* ── Modal création ─────────────────────────────────────────── */}
          <ReusableForm
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Ajouter un gestionnaire"
            subtitle="Les informations ci-dessous permettront de créer le compte du gestionnaire."
            fields={gestFields}
            onSubmit={handleCreate}
            submitLabel="Créer le gestionnaire"
          />

        </main>
      </div>

      {/* ── Side panel profil (s'ouvre à droite) ──────────────────────── */}
      <ManagerProfilPanel
        isOpen={!!selectedManager}
        onClose={() => setSelectedManager(null)}
        manager={selectedManager}
      />
    </div>
  );
}