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
import RichContent from "@/components/RichContent";

import { useDesignation } from "../../../../hooks/admin/useDesignation";
import { useSubTypeAssets } from "../../../../hooks/admin/useSubTypeAssets";
import { DesignationService } from "../../../../services/admin/designation.service";
import { useToast } from "@/contexts/ToastContext";
import { parseApiError } from "../../../../core/error";

const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "code", label: "Code", required: true },
  { key: "sub_type", label: "Sous-type parent", required: true },
  { key: "description", label: "Description", required: false },
];

function FilterDropdown({ isOpen, onClose, subTypes, selectedSubTypeId, onApply }: {
  isOpen: boolean; onClose: () => void; subTypes: any[];
  selectedSubTypeId: number | undefined; onApply: (id: number | undefined) => void;
}) {
  const [local, setLocal] = useState<number | undefined>(selectedSubTypeId);
  useEffect(() => { setLocal(selectedSubTypeId); }, [selectedSubTypeId]);
  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtrer par sous-type</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition"><X size={16} className="text-slate-500" /></button>
      </div>
      <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto">
        <button onClick={() => setLocal(undefined)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${!local ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
          Tous les sous-types
        </button>
        {subTypes.map(st => (
          <button key={st.id} onClick={() => setLocal(st.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${local === st.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
            <span>{st.name}</span>
            <span className={`text-[10px] font-black ${local === st.id ? "opacity-60" : "opacity-40"}`}>{st.code}</span>
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

export default function DesignationPage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSubTypeId, setSelectedSubTypeId] = useState<number | undefined>(undefined);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const { designations, isLoading, fetchDesignations } = useDesignation();
  const { subTypes, fetchSubTypes } = useSubTypeAssets();

  useEffect(() => { fetchSubTypes(); fetchDesignations(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filteredDesignations = selectedSubTypeId
    ? designations.filter((d: any) => d.sub_type_company_asset_id === selectedSubTypeId)
    : designations;

  const handleOpenDetails = (item: any) => {
    setSelectedItem({
      title: item.name, reference: item.id,
      fields: [
        { label: "Sous-type parent", value: item.sub_type?.name || item.subType?.name || subTypes.find((st: any) => st.id === item.sub_type_company_asset_id)?.name || "-" },
        { label: "Codification", value: item.code },
        { label: "Désignation", value: item.name },
        { label: "Date d'ajout", value: item.created_at?.split("T")[0] || "-" },
      ],
      description: item.description, rawData: item,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedItem?.rawData) return;
    setEditingData({
      sub_type_company_asset_id: selectedItem.rawData.sub_type_company_asset_id || "",
      name: selectedItem.rawData.name,
      code: selectedItem.rawData.code,
      description: selectedItem.rawData.description
    });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  const handleCreateOrUpdate = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      sub_type_company_asset_id: formData.sub_type_company_asset_id ? Number(formData.sub_type_company_asset_id) : undefined
    };

    console.log("[Designation] Payload envoyé:", payload);

    try {
      if (editingData && selectedItem?.reference) {
        await DesignationService.updateDesignation(selectedItem.reference, payload);
        toast.success("Désignation mise à jour avec succès.");
      } else {
        await DesignationService.createDesignation(payload as any);
        toast.success("Désignation créée avec succès.");
      }
      await fetchDesignations();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      console.error("[Designation] Erreur:", err);
      const msg = parseApiError(err, { name: "Désignation", code: "Codification" });
      toast.error(msg);
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
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Designations");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buf], "import_designations.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    try {
      await DesignationService.importDesignations(file);
      await fetchDesignations();
      toast.success(`${rows.length} désignation${rows.length > 1 ? "s" : ""} importée${rows.length > 1 ? "s" : ""} avec succès.`);
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
      await DesignationService.exportDesignations();
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    { header: "Sous-type", key: "sub_type_company_asset_id", render: (_: any, row: any) => row.sub_type?.name || row.subType?.name || subTypes.find((st: any) => st.id === row.sub_type_company_asset_id)?.name || "-" },
    { header: "Codification", key: "code" },
    { header: "Désignation", key: "name" },
    { header: "Description", key: "description", render: (_: any, row: any) => <RichContent content={row.description || "-"} isTruncated /> },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button onClick={() => handleOpenDetails(row)} className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
          <Eye size={18} />
        </button>
      ),
    },
  ];

  const designationFields: FieldConfig[] = [
    { name: "sub_type_company_asset_id", label: "Sous-type", type: "select", required: true, options: subTypes.map((st: any) => ({ label: st.name, value: String(st.id) })) },
    { name: "name", label: "Désignation", type: "text", required: true, placeholder: "Ex: Pompe à chaleur" },
    { name: "code", label: "Codification", type: "text", required: true, placeholder: "Ex: 01", minLength: 1, maxLength: 2 },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
  ];

  const handleFieldChange = (name: string, value: any, setter: (n: string, v: any) => void) => {
    if (name === "sub_type_company_asset_id" && !editingData) {
      const subTypeId = Number(value);
      if (!subTypeId) {
        setter("code", "");
        return;
      }

      // Calculer le prochain code numérique pour ce sous-type
      const related = designations.filter(
        (d: any) => Number(d.sub_type_company_asset_id) === subTypeId
      );

      const numericCodes = related
        .map((d: any) => parseInt(d.code))
        .filter((c: number) => !isNaN(c));

      const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
      const nextCode = String(maxCode + 1).padStart(2, '0');

      setter("code", nextCode);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">
        <PageHeader title="Désignation de patrimoine" subtitle="Gérez les désignations de patrimoine" />

        <div className="shrink-0 flex justify-end items-center gap-3">
          {/* <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition">
            <Download size={16} /> Importer
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
          </label>
          <button onClick={handleExport} disabled={exportLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50">
            {exportLoading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload size={16} />}
            Exporter
          </button> */}
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || selectedSubTypeId ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <Filter size={16} /> Filtrer
              {selectedSubTypeId && <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
            </button>
            <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} subTypes={subTypes} selectedSubTypeId={selectedSubTypeId} onApply={id => setSelectedSubTypeId(id)} />
          </div>
          <button onClick={() => { setEditingData(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            <Building2 size={16} /> Ajouter une désignation
          </button>
        </div>

        {selectedSubTypeId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
            <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
              {subTypes.find((st: any) => st.id === selectedSubTypeId)?.name ?? "Sous-type"}
              <button onClick={() => setSelectedSubTypeId(undefined)} className="hover:opacity-70 transition"><X size={12} /></button>
            </span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable columns={columns as any} data={isLoading ? [] : filteredDesignations} onViewAll={() => { }} />
          <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
            <Paginate currentPage={1} totalPages={1} onPageChange={() => { }} />
          </div>
        </div>

        <ReusableForm
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingData(null); }}
          title={editingData ? "Modifier une désignation" : "Ajouter une nouvelle désignation"}
          subtitle="Remplissez les informations ci-dessous."
          fields={designationFields}
          onSubmit={handleCreateOrUpdate}
          onFieldChange={handleFieldChange}
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
        dedupeKey={["code", "sub_type"]}
        existingData={designations.map((d: any) => ({ code: d.code, sub_type: d.sub_type?.name ?? "" }))}
        onConfirm={handleConfirmImport}
        title="Prévisualisation — Import Désignations de patrimoine"
      />
    </div>
  );
}
