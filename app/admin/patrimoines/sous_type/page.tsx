"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Filter, Download, Upload, Building2, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import UniversalImportPreview, { ColumnDef, ImportResult } from "@/components/UniversalImportPreview";

import { useSubTypeAssets } from "../../../../hooks/admin/useSubTypeAssets";
import { useTypes } from "../../../../hooks/admin/useTypes";
import { SubTypeAssetService } from "../../../../services/admin/sub-type-asset.service";
import { useToast } from "@/contexts/ToastContext";

// Colonnes attendues par SubTypesImport.php : nom*, code*, type_asset*, description
const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "nom",         label: "Nom",         required: true  },
  { key: "code",        label: "Code",        required: true  },
  { key: "type_asset",  label: "Type parent", required: true  },
  { key: "description", label: "Description", required: false },
];

function FilterDropdown({ isOpen, onClose, types, selectedTypeId, onApply }: {
  isOpen: boolean; onClose: () => void; types: any[];
  selectedTypeId: number | undefined; onApply: (id: number | undefined) => void;
}) {
  const [local, setLocal] = useState<number | undefined>(selectedTypeId);
  useEffect(() => { setLocal(selectedTypeId); }, [selectedTypeId]);
  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtrer par type</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition"><X size={16} className="text-slate-500" /></button>
      </div>
      <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto">
        <button onClick={() => setLocal(undefined)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${!local ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
          Tous les types
        </button>
        {types.map(t => (
          <button key={t.id} onClick={() => setLocal(t.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${local === t.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
            <span>{t.name}</span>
            <span className={`text-[10px] font-black ${local === t.id ? "opacity-60" : "opacity-40"}`}>{t.code}</span>
          </button>
        ))}
      </div>
      <div className="px-4 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => { setLocal(undefined); onApply(undefined); onClose(); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">Réinitialiser</button>
        <button onClick={() => { onApply(local); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">Appliquer</button>
      </div>
    </div>
  );
}

export default function SousTypePage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [selectedItem,  setSelectedItem]  = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData,   setEditingData]   = useState<Record<string, any> | null>(null);
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewFile,   setPreviewFile]   = useState<File | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const { toast } = useToast();

  const { subTypes, isLoading, fetchSubTypes } = useSubTypeAssets();
  const { types, fetchTypes } = useTypes();

  useEffect(() => { fetchTypes(); fetchSubTypes(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);


  const filteredSubTypes = selectedTypeId
    ? subTypes.filter((st: any) => st.type?.id === selectedTypeId || st.type_company_asset_id === selectedTypeId)
    : subTypes;

  const handleOpenDetails = (item: any) => {
    setSelectedItem({
      title: item.name, reference: item.id,
      fields: [
        { label: "Famille / Type", value: item.type?.name || "-" },
        { label: "Codification",   value: item.code },
        { label: "Sous-type",      value: item.name },
        { label: "Description",    value: item.description || "-" },
        { label: "Date d'ajout",   value: item.created_at?.split("T")[0] || "-" },
      ],
      description: item.description, rawData: item,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedItem?.rawData) return;
    setEditingData({ type_company_asset_id: selectedItem.rawData.type?.id || "", name: selectedItem.rawData.name, code: selectedItem.rawData.code, description: selectedItem.rawData.description });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  const handleCreateOrUpdate = async (formData: Record<string, any>) => {
    try {
      if (editingData && selectedItem?.reference) {
        await SubTypeAssetService.updateSubType(selectedItem.reference, formData);
        toast.success("Sous-type mis à jour avec succès.");
      } else {
        await SubTypeAssetService.createSubType(formData);
        toast.success("Sous-type créé avec succès.");
      }
      await fetchSubTypes();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur serveur.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleConfirmImport = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    const XLSX = await import("xlsx");
    const ws   = XLSX.utils.json_to_sheet(rows);
    const wb   = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SousTypes");
    const buf  = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buf], "import_sous_types.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    try {
      await SubTypeAssetService.importSubTypes(file);
      await fetchSubTypes();
      toast.success(`${rows.length} sous-type${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""} avec succès.`);
      return { imported: rows.length, skipped: 0, errors: [] };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de l'import.";
      toast.error(msg);
      return { imported: 0, skipped: 0, errors: [{ row: 0, message: msg }] };
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await SubTypeAssetService.exportSubTypes();
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    { header: "Type",         key: "type",        render: (_: any, row: any) => row.type?.name || "-" },
    { header: "Codification", key: "code" },
    { header: "Sous-type",    key: "name" },
    { header: "Description",  key: "description", render: (_: any, row: any) => row.description || "-" },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button onClick={() => handleOpenDetails(row)} className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  const subTypeFields: FieldConfig[] = [
    { name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true, options: types.map((t: any) => ({ label: t.name, value: String(t.id) })) },
    { name: "name",        label: "Sous-type",    type: "text",      required: true },
    { name: "code",        label: "Codification", type: "text",      required: true },
    { name: "description", label: "Description",  type: "rich-text", gridSpan: 2 },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">
        <PageHeader title="Sous-type de patrimoine" subtitle="Gérez les sous-types de patrimoine" />

        <div className="shrink-0 flex justify-end items-center gap-3">
         
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition">
            <Download size={16} /> Importer
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
          </label>
          <button onClick={handleExport} disabled={exportLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50">
            {exportLoading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload size={16} />}
            Exporter
          </button>
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || selectedTypeId ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <Filter size={16} /> Filtrer
              {selectedTypeId && <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
            </button>
            <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} types={types} selectedTypeId={selectedTypeId} onApply={id => setSelectedTypeId(id)} />
          </div>
          <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            <Building2 size={16} /> Ajouter un sous-type
          </button>
        </div>

        {selectedTypeId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
            <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
              {types.find((t: any) => t.id === selectedTypeId)?.name ?? "Type"}
              <button onClick={() => setSelectedTypeId(undefined)} className="hover:opacity-70 transition"><X size={12} /></button>
            </span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable columns={columns as any} data={isLoading ? [] : filteredSubTypes} onViewAll={() => {}} />
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
        dedupeKey={["code", "type_asset"]}
        existingData={subTypes.map((st: any) => ({ code: st.code, type_asset: st.type?.name ?? "" }))}
        onConfirm={handleConfirmImport}
        title="Prévisualisation — Import Sous-types de patrimoine"
      />
    </div>
  );
}
