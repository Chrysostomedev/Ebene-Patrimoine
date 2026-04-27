"use client";

import { useState, useEffect } from "react";
import { Eye, Download, Upload, Briefcase } from "lucide-react";

import Navbar from "@/components/Navbar";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { useServices } from "../../../hooks/admin/useServices";
import { ServiceService, Service } from "../../../services/admin/service.service";
import UniversalImportPreview, { ColumnDef, ImportResult } from "@/components/UniversalImportPreview";
import { useToast } from "@/contexts/ToastContext";
import { useLanguage } from "../../../contexts/LanguageContext";

// Colonnes attendues par ServiceImport.php : nom (ou name)*, description
const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "nom",         label: "Nom",         required: true  },
  { key: "description", label: "Description", required: false },
];

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const { toast } = useToast();

  const { services, isLoading, fetchServices } = useServices();
  const { t } = useLanguage();


  // ── Détails panel ──
  const handleOpenDetails = (service: any) => {
    setSelectedService({
      title: service.name,
      reference: service.id,
      fields: [
        { label: "Nom du service", value: service.name },
        { label: "Description", value: service.description || "-" },
        { label: "Date d'ajout", value: service.created_at?.split("T")[0] || "-" },
      ],
      description: service.description,
      rawData: service,
    });
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedService?.rawData) return;
    setEditingData({
      name: selectedService.rawData.name,
      description: selectedService.rawData.description,
    });
    setIsModalOpen(true);
    setIsDetailsOpen(false);
  };

  // ── CRUD ──
  const handleCreateOrUpdate = async (formData: Record<string, any>) => {
    try {
      if (editingData && selectedService?.reference) {
        await ServiceService.updateService(selectedService.reference, formData as { name: string; description?: string });
        toast.success("Service mis à jour avec succès.");
      } else {
        await ServiceService.createService(formData as { name: string; description?: string });
        toast.success("Service créé avec succès.");
      }
      await fetchServices();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat().join(" | ");
        toast.error(errors);
      } else {
        toast.error(err?.response?.data?.message || "Erreur serveur.");
      }
    }
  };

  // ── Import via preview ──────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    XLSX.utils.book_append_sheet(wb, ws, "Services");
    const buf  = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buf], "import_services.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    try {
      await ServiceService.importServices(file);
      await fetchServices();
      toast.success(`${rows.length} service${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""} avec succès.`);
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
      await ServiceService.exportServices();
      toast.success("Export téléchargé avec succès.");
    } catch {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Colonnes ──
  const columns: ColumnConfig<Service>[] = [
    { header: "Nom du service", key: "name" },
    {
      header: "Description", key: "description",
      render: (_: any, row: any) => (
        <span className="text-slate-500 text-sm line-clamp-1">{row.description || "-"}</span>
      ),
    },
    {
      header: "Date d'ajout", key: "created_at",
      render: (_: any, row: any) => row.created_at?.split("T")[0] || "-",
    },
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

  // ── Champs formulaire ──
  // Seulement name + description - conforme au validator Laravel
  const serviceFields: FieldConfig[] = [
    {
      name: "name",
      label: "Nom du service",
      type: "text",
      required: true,
      placeholder: "ex: Maintenance électrique",
    },
    {
      name: "description",
      label: "Description",
      type: "rich-text",
      gridSpan: 2,
      placeholder: "Décrivez le service proposé",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">
          <PageHeader title={t("services.title")} subtitle={t("services.subtitle")} />

          <div className="shrink-0 flex justify-end items-center gap-3">


            {/* Import */}
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition`}>
              <Download size={16} />
              Importer
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            </label>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50"
            >
              {exportLoading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload size={16} />}
              Exporter
            </button>

            {/* Ajouter */}
            <button
              onClick={() => { setEditingData(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <Briefcase size={16} /> Ajouter un service
            </button>
          </div>

          {/* Table - pas de pagination (Services::all() retourne tout) */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable
              title="Liste des services"
              columns={columns}
              data={isLoading ? [] : services}
              onViewAll={() => {}}
            />
          </div>

          {/* Formulaire */}
          <ReusableForm
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingData(null); }}
            title={editingData ? "Modifier un service" : "Ajouter un nouveau service"}
            subtitle="Remplissez les informations ci-dessous."
            fields={serviceFields}
            onSubmit={handleCreateOrUpdate}
            initialValues={editingData || {}}
          />

          {/* Détail panel */}
          <SideDetailsPanel
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            title={selectedService?.title || ""}
            reference={selectedService?.reference}
            fields={selectedService?.fields || []}
            descriptionContent={selectedService?.description}
            onEdit={handleEdit}
          />

        </main>

      <UniversalImportPreview
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewFile(null); }}
        file={previewFile}
        columns={IMPORT_COLUMNS}
        dedupeKey="nom"
        existingData={services.map(s => ({ nom: s.name }))}
        onConfirm={handleConfirmImport}
        title="Prévisualisation — Import Services"
      />
    </div>
  );
}