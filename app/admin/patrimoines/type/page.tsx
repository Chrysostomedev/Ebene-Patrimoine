"use client";

import { useState, useEffect } from "react";
import { Eye, Download, Upload, Building2 } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { useTypes } from "../../../../hooks/admin/useTypes";
import { TypeAssetService } from "../../../../services/admin/type-asset.service";

export default function PatrimoinesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatrimoine, setSelectedPatrimoine] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { types, isLoading, fetchTypes, meta, setPage } = useTypes();

  useEffect(() => { fetchTypes(); }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const showFlash = (type: "success" | "error", message: string) =>
    setFlashMessage({ type, message });

  // ── Détails panel ──
  const handleOpenDetails = (patrimoine: any) => {
    setSelectedPatrimoine({
      title: patrimoine.name,
      reference: patrimoine.id,
      fields: [
        { label: "Famille / Type", value: patrimoine.name },
        { label: "Codification", value: patrimoine.code },
        { label: "Description", value: patrimoine.description || "-" },
        { label: "Date d'ajout", value: patrimoine.created_at?.split("T")[0] || "-" },
      ],
      description: patrimoine.description,
      rawData: patrimoine,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedPatrimoine?.rawData) return;
    setEditingData({
      name: selectedPatrimoine.rawData.name,
      code: selectedPatrimoine.rawData.code,
      description: selectedPatrimoine.rawData.description,
    });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  // ── CRUD ──
  const handleCreateOrUpdateType = async (formData: Record<string, any>) => {
    try {
      if (editingData && selectedPatrimoine?.reference) {
        await TypeAssetService.updateType(selectedPatrimoine.reference, formData);
        showFlash("success", "Type de patrimoine mis à jour avec succès.");
      } else {
        await TypeAssetService.createType(formData);
        showFlash("success", "Type de patrimoine créé avec succès.");
      }
      await fetchTypes();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat().join(" | ");
        showFlash("error", errors);
      } else {
        showFlash("error", err?.response?.data?.message || "Erreur serveur.");
      }
    }
  };

  // ── Import ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      // await TypeAssetService.importTypes(file); // décommenter quand endpoint dispo
      showFlash("success", "Import réussi.");
      await fetchTypes();
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
      // await TypeAssetService.exportTypes(); // décommenter quand endpoint dispo
      showFlash("success", "Export téléchargé.");
    } catch {
      showFlash("error", "Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  const sortedTypes = [...types].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const columns = [
    { header: "Type", key: "name" },
    { header: "Codification", key: "code" },
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

  const typeFields: FieldConfig[] = [
    { name: "name", label: "Famille / Type", type: "text", required: true },
    { name: "code", label: "Codification", type: "text", placeholder: "ex: SD1245", required: true },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2, placeholder: "Décrivez le patrimoine" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Type de patrimoine"
            subtitle="Ce menu vous permet de voir les différents patrimoines disponibles"
          />

          {/* Barre d'actions — PAS de filtre sur cette vue */}
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

            {/* Ajouter */}
            <button
              onClick={() => { setEditingData(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <Building2 size={16} /> Ajouter un type
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={isLoading ? [] : sortedTypes} onViewAll={() => {}} />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate
                currentPage={meta?.current_page || 1}
                totalPages={meta?.last_page || 1}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </div>

          <ReusableForm
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingData(null); }}
            title={editingData ? "Modifier un type de patrimoine" : "Ajouter un nouveau type"}
            subtitle="Remplissez les informations ci-dessous."
            fields={typeFields}
            onSubmit={handleCreateOrUpdateType}
            initialValues={editingData || {}}
          />

          <SideDetailsPanel
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            title={selectedPatrimoine?.title || ""}
            reference={selectedPatrimoine?.reference}
            fields={selectedPatrimoine?.fields || []}
            descriptionContent={selectedPatrimoine?.description}
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