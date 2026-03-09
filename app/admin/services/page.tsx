"use client";

import { useState, useEffect } from "react";
import { Eye, Download, Upload, Briefcase } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { useServices } from "../../../hooks/useServices";
import { ServiceService } from "../../../services/service.service";

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, any> | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { services, isLoading, fetchServices } = useServices();

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const showFlash = (type: "success" | "error", message: string) =>
    setFlashMessage({ type, message });

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
        await ServiceService.updateService(selectedService.reference, formData);
        showFlash("success", "Service mis à jour avec succès.");
      } else {
        await ServiceService.createService(formData);
        showFlash("success", "Service créé avec succès.");
      }
      await fetchServices();
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
      // await ServiceService.importServices(file); // décommenter quand endpoint dispo
      showFlash( "error", "Fonctionnalité d'import en developpement.");
      await fetchServices();
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
      // await ServiceService.exportServices(); // décommenter quand endpoint dispo
      showFlash( "error", "Fonctionnalité d'export en developpement, disponible très bientot.");
    } catch {
      showFlash("error", "Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Colonnes ──
  const columns = [
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
  // Seulement name + description — conforme au validator Laravel
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
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Services"
            subtitle="Gestion des services disponibles pour les prestataires"
          />

          {/* Barre d'actions — pas de filtre pour les services */}
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
              <Briefcase size={16} /> Ajouter un service
            </button>
          </div>

          {/* Table — pas de pagination (Services::all() retourne tout) */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable
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

          {/* Flash */}
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