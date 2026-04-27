"use client";

import { useState, useEffect } from "react";
import { Eye, Download, Upload, Building2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import UniversalImportPreview, { ColumnDef, ImportResult } from "@/components/UniversalImportPreview";

import { useTypes } from "../../../../hooks/admin/useTypes";
import { TypeAssetService } from "../../../../services/admin/type-asset.service";
import { useToast } from "@/contexts/ToastContext";

// Colonnes attendues par TypesImport.php : nom*, code*, description
const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  { key: "description", label: "Description", required: false },
];

export default function PatrimoinesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  // Preview import
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const { types, isLoading, fetchTypes, meta, setPage } = useTypes();

  useEffect(() => { fetchTypes(); }, []);

  const handleOpenDetails = (item: any) => {
    setSelectedItem({
      title: item.name, reference: item.id,
      fields: [
        { label: "Famille / Type", value: item.name },
        { label: "Codification", value: item.code },
        { label: "Description", value: item.description || "-" },
        { label: "Date d'ajout", value: item.created_at?.split("T")[0] || "-" },
      ],
      description: item.description, rawData: item,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedItem?.rawData) return;
    setEditingData({ name: selectedItem.rawData.name, code: selectedItem.rawData.code, description: selectedItem.rawData.description });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  const handleCreateOrUpdate = async (formData: Record<string, any>) => {
    try {
      if (editingData && selectedItem?.reference) {
        await TypeAssetService.updateType(selectedItem.reference, formData);
        toast.success("Type mis à jour avec succès.");
      } else {
        await TypeAssetService.createType(formData);
        toast.success("Type créé avec succès.");
      }
      await fetchTypes();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur serveur.");
    }
  };

  // ── Import via preview ──────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleConfirmImport = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    // Envoie le fichier original au back (qui gère la déduplication)
    // On reconstruit un fichier XLSX à partir des lignes éditées
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Types");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buf], "import_types.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    try {
      await TypeAssetService.importTypes(file);
      await fetchTypes();
      toast.success(`${rows.length} type${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""} avec succès.`);
      return { imported: rows.length, skipped: 0, errors: [] };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de l'import.";
      toast.error(msg);
      return { imported: 0, skipped: 0, errors: [{ row: 0, message: msg }] };
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    try {
      await TypeAssetService.exportTypes();
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  const sortedTypes = [...types].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const columns = [
    { header: "Type", key: "name" },
    { header: "Codification", key: "code" },
    { header: "Description", key: "description", render: (_: any, row: any) => row.description || "-" },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button onClick={() => handleOpenDetails(row)} className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  const typeFields: FieldConfig[] = [
    { name: "name", label: "Famille / Type", type: "text", required: true },
    { name: "code", label: "Codification", type: "text", required: true, placeholder: "ex: SD1245" },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">
        <PageHeader title="Type de patrimoine" subtitle="Gérez les familles et types de patrimoine" />

        <div className="shrink-0 flex justify-end items-center gap-3">

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition">
            <Download size={16} /> Importer
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
          </label>
          <button onClick={handleExport} disabled={exportLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50">
            {exportLoading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload size={16} />}
            Exporter
          </button>
          <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            <Building2 size={16} /> Ajouter un type
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable columns={columns as any} data={isLoading ? [] : sortedTypes} onViewAll={() => { }} />
          <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
            <Paginate currentPage={meta?.current_page || 1} totalPages={meta?.last_page || 1} onPageChange={p => setPage(p)} />
          </div>
        </div>

        <ReusableForm
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingData(null); }}
          title={editingData ? "Modifier un type" : "Ajouter un nouveau type"}
          subtitle="Remplissez les informations ci-dessous."
          fields={typeFields}
          onSubmit={handleCreateOrUpdate}
          initialValues={editingData || {}}
        />

        <SideDetailsPanel
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={selectedItem?.title || ""}
          reference={selectedItem?.reference}
          fields={selectedItem?.fields || []}
          descriptionContent={selectedItem?.description}
          onEdit={handleEdit}
        />

      </main>

      <UniversalImportPreview
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewFile(null); }}
        file={previewFile}
        columns={IMPORT_COLUMNS}
        dedupeKey="code"
        existingData={types.map(t => ({ code: t.code, nom: t.name }))}
        onConfirm={handleConfirmImport}
        title="Prévisualisation — Import Types de patrimoine"
      />
    </div>
  );
}
