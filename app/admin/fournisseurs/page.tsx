"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Filter, Download, Upload, PlusCircle, X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SearchInput from "@/components/SearchInput";
import ReusableForm from "@/components/ReusableForm";
import StatsCard from "@/components/StatsCard";
import Paginate from "@/components/Paginate";
import PrestCard from "@/components/PrestCard"; // On réutilise le PrestCard pour les Fournisseurs
import PageHeader from "@/components/PageHeader";

import { useSuppliers } from "../../../hooks/admin/useSuppliers";
import { SupplierService, Supplier } from "../../../services/admin/supplier.service";
import { useToast } from "@/contexts/ToastContext";

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

interface SupplierFilters { is_active?: boolean; }

function SupplierFilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: SupplierFilters;
  onApply: (f: SupplierFilters) => void;
}) {
  const [local, setLocal] = useState<SupplierFilters>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const currentStatus =
    local.is_active === undefined ? "" :
    local.is_active ? "true" : "false";

  const Pill = ({
    val, current, onClick, label,
  }: { val: string; current: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
        current === val
          ? "bg-slate-900 text-white"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "",      label: "Tous les fournisseurs" },
              { val: "true",  label: "Actifs seulement"      },
              { val: "false", label: "Inactifs seulement"    },
            ].map(o => (
              <Pill
                key={o.val} val={o.val} current={currentStatus} label={o.label}
                onClick={() => setLocal({
                  ...local,
                  is_active: o.val === "" ? undefined : o.val === "true",
                })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════

export default function FournisseursPage() {
  const router = useRouter();

  const {
    suppliers, stats, isLoading, meta,
    page, setPage,
    applySearch, applyFilters, filters,
    fetchSuppliers,
  } = useSuppliers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);



  const activeCount = [
    filters.is_active !== undefined ? "1" : "",
  ].filter(Boolean).length;

  const handleExport = () =>
    toast.error("Fonctionnalité d'export en cours de développement.");
  const handleImport = () =>
    toast.error("Fonctionnalité d'import en cours de développement.");

  // Champs formulaire création fournisseur
  const supplierFields = [
    { name: "last_name",  label: "Nom",                type: "text",     required: true },
    { name: "first_name", label: "Prénom",             type: "text",     required: true },
    { name: "email",      label: "Email",              type: "email",    required: true },
    { name: "phone",      label: "Téléphone",          type: "text",     required: true },
    { name: "password",   label: "Mot de passe (optionnel)", type: "password" },
  ];

  const handleCreate = async (formData: any) => {
    try {
      await SupplierService.createSupplier(formData);
      toast.success("Fournisseur créé avec succès.");
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Erreur lors de la création.");
    }
  };

  const kpis = [
    { label: "Total fournisseurs",  value: stats?.total_suppliers ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Fournisseurs actifs", value: stats?.active_suppliers ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Fournisseurs inactifs", value: stats?.inactive_suppliers ?? 0, delta: "+0%", trend: "down" as const },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="mt-20 p-6 space-y-8">
          <PageHeader
            title="Fournisseurs"
            subtitle="Gérez vos fournisseurs de services"
          />


          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {filters.is_active !== undefined && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.is_active ? "Actifs" : "Inactifs"}
                  <button onClick={() => applyFilters({ is_active: undefined })} className="hover:opacity-70 transition">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
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

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                    filtersOpen || activeCount > 0
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={16} /> Filtrer
                  {activeCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>
                <SupplierFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={(f) => { applyFilters(f); setFiltersOpen(false); }}
                />
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <PlusCircle size={16} /> Ajouter un fournisseur
              </button>
            </div>
          </div>

          {/* Liste + Search */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="w-80">
              <SearchInput
                onSearch={applySearch}
                placeholder="Rechercher un fournisseur..."
              />
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm">Chargement des fournisseurs...</p>
              </div>
            ) : suppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map(s => (
                  <PrestCard // Réutilisation du PrestCard
                    key={s.id}
                    id={s.id}
                    name={`${s.first_name} ${s.last_name}`}
                    location={""}
                    category={"Fournisseur"}
                    phone={s.phone ?? "-"}
                    email={s.email ?? "-"}
                    rating={0}
                    status={s.is_active ? "Actif" : "Inactif"}
                    onProfilClick={() => {}}
                    onTicketsClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 italic">
                Aucun fournisseur trouvé{activeCount > 0 ? " pour ces filtres" : ""}.
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-400">
                Page {page} sur {meta.last_page} · {meta.total} fournisseur{meta.total > 1 ? "s" : ""}
              </p>
              <Paginate currentPage={page} totalPages={meta.last_page} onPageChange={setPage} />
            </div>
          </div>
        </main>

        <ReusableForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Ajouter un nouveau fournisseur"
          subtitle="Enregistrez un fournisseur de services pour l'application."
          fields={supplierFields as any}
          onSubmit={handleCreate}
          submitLabel="Créer le fournisseur"
        />
    </div>
  );
}
