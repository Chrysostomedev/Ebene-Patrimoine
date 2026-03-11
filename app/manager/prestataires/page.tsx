"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Filter, Download, Upload, PlusCircle, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SearchInput from "@/components/SearchInput";
import ReusableForm from "@/components/ReusableForm";
import StatsCard from "@/components/StatsCard";
import ProfileModal from "@/components/ProfileModal";
import Paginate from "@/components/Paginate";
import PrestCard from "@/components/PrestCard";
import PageHeader from "@/components/PageHeader";

/* -------------------------------------------------------------------------- */
/*                              STATIC MOCK DATA                              */
/* -------------------------------------------------------------------------- */

// STATIC: services simulés
const services = [
  { id: 1, name: "Maintenance Réseau" },
  { id: 2, name: "Sécurité" },
  { id: 3, name: "Infrastructure IT" },
];

// STATIC: prestataires simulés
const mockProviders = [
  {
    id: 1,
    company_name: "SOUDOTEC",
    city: "Abidjan",
    is_active: true,
    rating: 4.5,
    date_entree: "2024-03-10",
    service: { id: 1, name: "Maintenance Réseau" },
    user: {
      phone: "0700000000",
      email: "contact@soudotec.ci",
    },
    logoUrl: "/images/provider1.png",
  },
  {
    id: 2,
    company_name: "Tech Services CI",
    city: "Abidjan",
    is_active: false,
    rating: 3.8,
    date_entree: "2023-09-02",
    service: { id: 2, name: "Sécurité" },
    user: {
      phone: "0500000000",
      email: "contact@techservices.ci",
    },
    logoUrl: "/images/provider2.png",
  },
];

// STATIC: statistiques simulées
const stats = {
  total_providers: 2,
  active_providers: 1,
  inactive_providers: 1,
  average_intervention_time: "2h 10m",
};

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function PrestatairesPage() {

  const router = useRouter();

  /* ------------------------------ STATIC STATE ----------------------------- */

  const [providers] = useState(mockProviders); // STATIC
  const [filteredProviders, setFilteredProviders] = useState(mockProviders);

  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);

  const [filters, setFilters] = useState<any>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  /* -------------------------------------------------------------------------- */
  /*                               STATIC ACTIONS                               */
  /* -------------------------------------------------------------------------- */

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 4000);
  };

  // STATIC: recherche simulée
  const applySearch = (value: string) => {
    const v = value.toLowerCase();

    setFilteredProviders(
      providers.filter((p) =>
        p.company_name.toLowerCase().includes(v)
      )
    );
  };

  // STATIC: filtres simulés
  const applyFilters = (f: any) => {

    let result = [...providers];

    if (f.is_active !== undefined) {
      result = result.filter((p) => p.is_active === f.is_active);
    }

    if (f.service_id) {
      result = result.filter((p) => p.service?.id === f.service_id);
    }

    setFilters(f);
    setFilteredProviders(result);
  };

  const handleExport = () =>
    showFlash("error", "Export désactivé (mode statique)");

  const handleImport = () =>
    showFlash("error", "Import désactivé (mode statique)");

  /* -------------------------------------------------------------------------- */
  /*                             FORM FIELDS STATIC                             */
  /* -------------------------------------------------------------------------- */

  const prestFields = [

    { name: "company_name", label: "Nom du prestataire", type: "text", required: true },

    {
      name: "service_id",
      label: "Service",
      type: "select",
      required: true,
      options: services.map(s => ({
        label: s.name,
        value: String(s.id),
      })),
    },

    { name: "city", label: "Ville", type: "text", required: true },

    { name: "street", label: "Rue / Adresse", type: "text" },

    { name: "date_entree", label: "Date d'entrée", type: "date", required: true },

    { name: "users.password", label: "Mot de passe", type: "password", required: true },

    { name: "users.last_name", label: "Nom du responsable", type: "text", required: true },
    { name: "users.first_name", label: "Prénom", type: "text", required: true },

    { name: "users.email", label: "Email du responsable", type: "email", required: true },
    { name: "users.phone", label: "Téléphone", type: "text", required: true },

    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },

    {
      name: "logo",
      label: "Logo du prestataire",
      type: "image-upload",
      gridSpan: 1,
      maxImages: 1,
    },

    {
      name: "images",
      label: "Photos supplémentaires",
      type: "image-upload",
      gridSpan: 1,
      maxImages: 3,
    },
  ];

  const handleCreate = () => {
    // STATIC: aucune sauvegarde
    showFlash("success", "Création simulée (mode statique)");
    setIsModalOpen(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                                   KPIs                                     */
  /* -------------------------------------------------------------------------- */

  const kpis = [
    {
      label: "Total prestataires",
      value: stats.total_providers,
      delta: "+0%",
      trend: "up" as const,
    },
    {
      label: "Prestataires actifs",
      value: stats.active_providers,
      delta: "+0%",
      trend: "up" as const,
    },
    {
      label: "Prestataires inactifs",
      value: stats.inactive_providers,
      delta: "+0%",
      trend: "down" as const,
    },
    {
      label: "Délai moyen intervention",
      value: stats.average_intervention_time,
      delta: "+0%",
      trend: "up" as const,
    },
  ];

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">

          <PageHeader
            title="Prestataires"
            subtitle="Gérez tous vos prestataires de services"
          />

          {/* Flash message */}
          {flash && (
            <div
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
                flash.type === "success"
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-red-600 bg-red-100 border-red-300"
              }`}
            >
              {flash.message}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => (
              <StatsCard key={i} {...k} />
            ))}
          </div>

          {/* Barre actions */}
          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Download size={16} /> Importer
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Upload size={16} /> Exporter
              </button>

              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Filter size={16} /> Filtrer
              </button>

            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <PlusCircle size={16} /> Ajouter un prestataire
            </button>

          </div>

          {/* Liste */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">

            <div className="w-80">
              <SearchInput
                onSearch={applySearch}
                placeholder="Rechercher un prestataire..."
              />
            </div>

            {filteredProviders.length > 0 ? (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {filteredProviders.map(p => (

                  <PrestCard
                    key={p.id}
                    id={p.id}
                    name={p.company_name}
                    location={p.city}
                    category={p.service?.name}
                    phone={p.user?.phone}
                    email={p.user?.email}
                    rating={p.rating}
                    status={p.is_active ? "Actif" : "Inactif"}
                    logo={p.logoUrl}
                    onProfilClick={() => setSelectedProvider(p)}
                    onTicketsClick={() => router.push(`/admin/prestataires/details/${p.id}`)}
                    detailUrl={`/admin/prestataires/details/${p.id}`}
                  />

                ))}

              </div>

            ) : (

              <div className="py-20 text-center text-slate-400 italic">
                Aucun prestataire trouvé.
              </div>

            )}

            {/* Pagination statique */}
            <div className="flex justify-end pt-4 border-t border-slate-50">
              <Paginate currentPage={1} totalPages={1} onPageChange={() => {}} />
            </div>

          </div>

        </main>

      </div>

      {/* Formulaire création */}
      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un nouveau prestataire"
        subtitle="Mode statique — aucune sauvegarde backend"
        fields={prestFields as any}
        onSubmit={handleCreate}
        submitLabel="Créer le prestataire"
      />

      {/* Profile modal */}
      <ProfileModal
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        provider={
          selectedProvider
            ? {
                name: selectedProvider.company_name,
                location: selectedProvider.city,
                phone: selectedProvider.user?.phone,
                email: selectedProvider.user?.email,
                category: selectedProvider.service?.name,
                dateEntree: selectedProvider.date_entree,
                status: selectedProvider.is_active ? "Actif" : "Inactif",
                logo: selectedProvider.logoUrl,
                stats: {
                  totalBillets: { value: 12, delta: "+0%" },
                  ticketsEnCours: { value: 3, delta: "+0%" },
                  ticketsTraites: { value: 9, delta: "+0%" },
                  noteObtenue: `${selectedProvider.rating}/5`,
                },
              }
            : null
        }
      />

    </div>
  );
}