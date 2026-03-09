"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Filter, Download, Upload, Building2, X } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { useSubTypeAssets } from "../../../../hooks/useSubTypeAssets";
import { useTypes } from "../../../../hooks/useTypes";
import { SubTypeAssetService } from "../../../../services/sub-type-asset.service";

// ── Dropdown filtre par type — style CANAL+ noir/blanc ──
function FilterDropdown({
  isOpen,
  onClose,
  types,
  selectedTypeId,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  types: any[];
  selectedTypeId: number | undefined;
  onApply: (typeId: number | undefined) => void;
}) {
  const [local, setLocal] = useState<number | undefined>(selectedTypeId);

  useEffect(() => { setLocal(selectedTypeId); }, [selectedTypeId]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtrer par type</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Liste des types */}
      <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto">
        <button
          onClick={() => setLocal(undefined)}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            !local ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Tous les types
        </button>
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setLocal(t.id)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${
              local === t.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.name}</span>
            <span className={`text-[10px] font-black ${local === t.id ? "opacity-60" : "opacity-40"}`}>{t.code}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal(undefined); onApply(undefined); onClose(); }}
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

// ── Page principale ──
export default function SousTypePage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubType, setSelectedSubType] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { subTypes, isLoading, fetchSubTypes } = useSubTypeAssets();
  const { types, fetchTypes } = useTypes();

  useEffect(() => { fetchTypes(); fetchSubTypes(); }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  // Ferme dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showFlash = (type: "success" | "error", message: string) =>
    setFlashMessage({ type, message });

  // ── Filtre côté client par type ──
  const filteredSubTypes = selectedTypeId
    ? subTypes.filter(
        (st: any) =>
          st.type?.id === selectedTypeId ||
          st.type_company_asset_id === selectedTypeId
      )
    : subTypes;

  // ── Détails panel ──
  const handleOpenDetails = (subType: any) => {
    setSelectedSubType({
      title: subType.name,
      reference: subType.id,
      fields: [
        { label: "Famille / Type", value: subType.type?.name || "-" },
        { label: "Codification", value: subType.code },
        { label: "Sous-type", value: subType.name },
        { label: "Description", value: subType.description || "-" },
        { label: "Date d'ajout", value: subType.created_at?.split("T")[0] || "-" },
      ],
      description: subType.description,
      rawData: subType,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedSubType?.rawData) return;
    setEditingData({
      type_company_asset_id: selectedSubType.rawData.type?.id || "",
      name: selectedSubType.rawData.name,
      code: selectedSubType.rawData.code,
      description: selectedSubType.rawData.description,
    });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  // ── CRUD ──
  const handleCreateOrUpdateSubType = async (formData: Record<string, any>) => {
    try {
      if (editingData && selectedSubType?.reference) {
        await SubTypeAssetService.updateSubType(selectedSubType.reference, formData);
        showFlash("success", "Sous-type mis à jour avec succès.");
      } else {
        await SubTypeAssetService.createSubType(formData);
        showFlash("success", "Sous-type créé avec succès.");
      }
      await fetchSubTypes();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message || "Erreur serveur.");
    }
  };

  // ── Import ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      // await SubTypeAssetService.importSubTypes(file); // décommenter quand endpoint dispo
      showFlash("success", "Import réussi.");
      await fetchSubTypes();
    } catch {
      showFlash("error", "Erreur lors de l'import.");
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  // ── Export ──
  const handleExport = async () => {
    setExportLoading(true);
    try {
      // await SubTypeAssetService.exportSubTypes(); // décommenter quand endpoint dispo
      showFlash("success", "Export téléchargé.");
    } catch {
      showFlash("error", "Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Colonnes ──
  const columns = [
    { header: "Type", key: "type", render: (_: any, row: any) => row.type?.name || "-" },
    { header: "Codification", key: "code" },
    { header: "Sous-type", key: "name" },
    { header: "Description", key: "description", render: (_: any, row: any) => row.description || "-" },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
        >
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  const subTypeFields: FieldConfig[] = [
    {
      name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true,
      // label = name du type (plus lisible que le code seul)
      options: types.map((t: any) => ({ label: t.name, value: String(t.id) })),
    },
    { name: "name", label: "Sous-type", type: "text", required: true },
    { name: "code", label: "Codification", type: "text", required: true },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Sous-type de patrimoine"
            subtitle="Ce menu vous permet de voir les sous-types disponibles"
          />

          {/* Barre d'actions */}
          <div className="shrink-0 flex justify-end items-center gap-3">

            {/* Import */}
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-50 pointer-events-none" : ""}`}>
              <Download size={16} />
              {importLoading ? "Import..." : "Importer"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            </label>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Upload size={16} />
              {exportLoading ? "Export..." : "Exporter"}
            </button>

            {/* Filtre par type — dropdown CANAL+ */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                  filtersOpen || selectedTypeId
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={16} />
                Filtrer
                {selectedTypeId && (
                  <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>

              <FilterDropdown
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                types={types}
                selectedTypeId={selectedTypeId}
                onApply={(typeId) => { setSelectedTypeId(typeId); }}
              />
            </div>

            {/* Ajouter */}
            <button
              onClick={() => { setEditingData(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <Building2 size={16} /> Ajouter un sous-type
            </button>
          </div>

          {/* Badge filtre actif */}
          {selectedTypeId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {types.find((t: any) => t.id === selectedTypeId)?.name ?? "Type"}
                <button
                  onClick={() => setSelectedTypeId(undefined)}
                  className="hover:opacity-70 transition"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={isLoading ? [] : filteredSubTypes} onViewAll={() => {}} />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={1} totalPages={1} onPageChange={() => {}} />
            </div>
          </div>

          <ReusableForm
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingData(null); }}
            title={editingData ? "Modifier un sous-type" : "Ajouter un nouveau sous-type"}
            subtitle="Remplissez les informations ci-dessous."
            fields={subTypeFields}
            onSubmit={handleCreateOrUpdateSubType}
            initialValues={editingData || {}}
          />

          <SideDetailsPanel
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            title={selectedSubType?.title || ""}
            reference={selectedSubType?.reference}
            fields={selectedSubType?.fields || []}
            descriptionContent={selectedSubType?.description}
            onEdit={handleEdit}
          />

          {flashMessage && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              flashMessage.type === "success"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flashMessage.message}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}