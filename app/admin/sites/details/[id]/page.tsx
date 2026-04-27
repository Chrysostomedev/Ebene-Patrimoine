"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Filter, Download, Upload, Building2,
  Eye, ChevronLeft, MapPin, Phone, Mail, CalendarClock, X, Copy, CheckCheck, Pencil,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import { FieldConfig } from "@/components/ReusableForm";

import { useTypes } from "../../../../../hooks/admin/useTypes";
import { useSubTypeAssets } from "../../../../../hooks/admin/useSubTypeAssets";
import { AssetService, CompanyAsset } from "../../../../../services/admin/asset.service";
import {
  getSiteById,
  getSiteStats,
  resolveManagerName,
  resolveManagerPhone,
  resolveManagerEmail,
  updateSite,
} from "../../../../../services/admin/site.service";
import { useToast } from "../../../../../contexts/ToastContext";
import { parseApiError } from "../../../../../core/error";
import { useSites } from "../../../../../hooks/admin/useSites";
import axiosInstance from "../../../../../core/axios";
import { formatDate, formatCurrency } from "@/lib/utils";


// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

// local formatMontant and formatDate removed - using @/lib/utils


/**
 * Formate une date ISO pour l'attribut 'value' d'un <input type="date">
 * Indispensable pour le pré-remplissage du formulaire de modification.
 */
const fmtDateForInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// ═══════════════════════════════════════════════
// COPY BUTTON
// ═══════════════════════════════════════════════

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch { /* fallback silencieux */ }
      }}
      title="Copier l'ID"
      className="ml-2 p-1 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-700"
    >
      {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ═══════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════

const ASSET_STATUS_STYLES: Record<string, string> = {
  actif: "border-green-500 bg-green-50  text-green-700",
  inactif: "border-red-400   bg-red-50    text-red-600",
  hors_usage: "border-slate-400 bg-slate-100 text-slate-700",
};
const ASSET_STATUS_LABELS: Record<string, string> = {
  actif: "Actif", inactif: "Inactif", hors_usage: "Hors usage",
};

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

interface AssetFilters { type_id?: number; sub_type_id?: number; status?: string; }

function AssetFilterDropdown({
  isOpen, onClose, filters, onApply, types, subTypes,
}: {
  isOpen: boolean; onClose: () => void;
  filters: AssetFilters; onApply: (f: AssetFilters) => void;
  types: any[]; subTypes: any[];
}) {
  const [local, setLocal] = useState<AssetFilters>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  // Sous-types filtrés selon le type sélectionné
  const filteredSubTypes = local.type_id
    ? subTypes.filter((st: any) => st.type_company_asset_id === local.type_id)
    : subTypes;

  const Pill = ({ val, current, onClick, label }: { val: string; current?: string; onClick: () => void; label: string }) => (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${(current ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition"><X size={16} className="text-slate-500" /></button>
      </div>

      <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">

        {/* Statut */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "", label: "Tous" },
              { val: "actif", label: "Actif" },
              { val: "inactif", label: "Inactif" },
              { val: "hors_usage", label: "Hors usage" },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.status ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, status: o.val || undefined })} />
            ))}
          </div>
        </div>

        {/* Type - sélection efface le sous-type si incompatible */}
        {types.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Type / Famille</p>
            <div className="flex flex-col gap-1.5">
              <Pill val="" current={String(local.type_id ?? "")} label="Tous les types"
                onClick={() => setLocal({ ...local, type_id: undefined, sub_type_id: undefined })} />
              {types.map((t: any) => (
                <Pill key={t.id} val={String(t.id)} current={String(local.type_id ?? "")} label={t.name}
                  onClick={() => setLocal({ ...local, type_id: t.id, sub_type_id: undefined })} />
              ))}
            </div>
          </div>
        )}

        {/* Sous-type - filtré selon le type sélectionné */}
        {filteredSubTypes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Sous-type {local.type_id ? <span className="text-slate-300 normal-case font-medium">(filtrés)</span> : ""}
            </p>
            <div className="flex flex-col gap-1.5">
              <Pill val="" current={String(local.sub_type_id ?? "")} label="Tous les sous-types"
                onClick={() => setLocal({ ...local, sub_type_id: undefined })} />
              {filteredSubTypes.map((st: any) => (
                <Pill key={st.id} val={String(st.id)} current={String(local.sub_type_id ?? "")} label={st.name}
                  onClick={() => setLocal({ ...local, sub_type_id: st.id })} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
          Réinitialiser
        </button>
        <button onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ASSET SIDE PANEL
// ═══════════════════════════════════════════════

function AssetSidePanel({
  patrimoine, onClose, onEdit,
}: {
  patrimoine: CompanyAsset | null; onClose: () => void; onEdit: () => void;
}) {
  if (!patrimoine) return null;

  const typeName = patrimoine.type?.name ?? "-";
  const subTypeName = (patrimoine as any).sub_type?.name ?? patrimoine.subType?.name ?? "-";
  const siteName = patrimoine.site?.nom ?? "-";

  const infoRows = [
    { label: "Famille / Type", value: typeName },
    { label: "Sous-type", value: subTypeName },
    { label: "Codification", value: patrimoine.codification },
    { label: "Désignation", value: patrimoine.designation },
    { label: "Site", value: siteName },
    { label: "Date d'entrée", value: formatDate(patrimoine.date_entree) },
    { label: "Valeur d'entrée", value: formatCurrency(patrimoine.valeur_entree) },

  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-7 pt-4 pb-5 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">#{patrimoine.id}</span>
            <CopyButton text={String(patrimoine.id)} />
          </div>
          <h2 className="text-xl font-black text-slate-900 leading-tight">{patrimoine.designation}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{patrimoine.codification}</p>
          <div className="mt-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${ASSET_STATUS_STYLES[patrimoine.status] ?? ""}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{
                backgroundColor: patrimoine.status === "actif" ? "#22c55e" : patrimoine.status === "inactif" ? "#ef4444" : "#94a3b8"
              }} />
              {ASSET_STATUS_LABELS[patrimoine.status] ?? patrimoine.status}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-7 pb-7">
          <div className="space-y-0">
            {infoRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{row.label}</p>
                <p className="text-sm font-bold text-slate-900 text-right max-w-[60%] truncate">{row.value}</p>
              </div>
            ))}
          </div>
          {patrimoine.description && (
            <div className="mt-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: patrimoine.description }}
              />
            </div>
          )}
        </div>
        <div className="px-7 py-5 border-t border-slate-100 shrink-0">
          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            Modifier le patrimoine
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
// PAGE DÉTAILS SITE
// ═══════════════════════════════════════════════

const PER_PAGE = 10;

export default function SiteDetailsPage() {
  const params = useParams();
  const siteId = Number(params?.id);

  const { types } = useTypes();
  const { subTypes } = useSubTypeAssets();

  const [site, setSite] = useState<any>(null);
  const [siteStats, setSiteStats] = useState<any>(null);
  const [loadingSite, setLoadingSite] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<CompanyAsset | null>(null);
  const [selectedPatrimoine, setSelectedPatrimoine] = useState<CompanyAsset | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [patrimoines, setPatrimoines] = useState<CompanyAsset[]>([]);
  const [loadingPatrimoines, setLoadingPatrimoines] = useState(false);
  const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
  const { managers, managersLoading, fetchManagers } = useSites();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const { toast } = useToast();
  const [modalError, setModalError] = useState<string | null>(null); // Erreur spécifique à la modale
  const [isSubmitting, setIsSubmitting] = useState(false);               // État de soumission global
  const [importLoading, setImportLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch site
  useEffect(() => {
    if (!siteId) return;
    setLoadingSite(true);
    getSiteById(siteId)
      .then(data => setSite(data))
      .catch(() => setSite(null))
      .finally(() => setLoadingSite(false));
    fetchManagers();
  }, [siteId]);

  // ── Fetch stats - comparaison en Number pour éviter string vs number
  useEffect(() => {
    if (!siteId) return;
    getSiteStats()
      .then(data => {
        const perSite = data?.tickets_par_site?.find(
          (s: any) => Number(s.site_id) === Number(siteId)
        );
        setSiteStats({
          tickets_en_cours: perSite?.tickets_en_cours ?? 0,
          tickets_clos: perSite?.tickets_clos ?? 0,
          cout_loyer_moyen: data?.cout_loyer_moyen_par_site ?? null,
        });
      })
      .catch(() => setSiteStats(null));
  }, [siteId]);

  const fetchPatrimoines = async () => {
    if (!siteId) return;
    setLoadingPatrimoines(true);
    try {
      const data = await AssetService.getAssets({ site_id: siteId, per_page: 1000, ...filters });
      setPatrimoines(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPatrimoines(false);
    }
  };

  useEffect(() => { fetchPatrimoines(); }, [siteId, filters]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Pagination côté client
  const totalPages = Math.ceil(patrimoines.length / PER_PAGE) || 1;
  const paginatedPatrimoines = patrimoines.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const activeFiltersCount = [filters.status, filters.type_id, filters.sub_type_id].filter(Boolean).length;

  const handleOpenDetails = (p: CompanyAsset) => { setSelectedPatrimoine(p); setIsDetailsOpen(true); };
  const handleEdit = () => {
    if (!selectedPatrimoine) return;
    setEditingData(selectedPatrimoine);
    setSelectedTypeId(String((selectedPatrimoine as any).type_company_asset_id ?? ""));
    setIsDetailsOpen(false);
    setIsModalOpen(true);
    setModalError(null);
  };


  // ── Create / Update
  const handleCreateOrUpdate = async (formData: any) => {
    setModalError(null);
    setIsSubmitting(true);
    try {
      if (editingData) {
        await AssetService.updateAsset(editingData.id, formData);
        toast.success("Patrimoine mis à jour avec succès.");
      } else {
        await AssetService.createAsset({ ...formData, site_id: siteId });
        toast.success("Patrimoine créé avec succès.");
      }
      await fetchPatrimoines();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      const msg = parseApiError(err);
      toast.error(msg);
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleUpdateSite = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        manager_id: formData.manager_id ? Number(formData.manager_id) : undefined,
      };
      await updateSite(siteId, payload);
      setFlashMessage({ type: "success", message: "Site mis à jour avec succès." });
      setIsEditSiteModalOpen(false);
      // Refresh site data
      const data = await getSiteById(siteId);
      setSite(data);
    } catch (err: any) {
      setFlashMessage({ type: "error", message: err?.response?.data?.message ?? "Erreur lors de la mise à jour." });
    }
  };

  // ── Export
  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const response = await axiosInstance.get("/admin/asset/export", {
        params: { site_id: siteId, ...filters },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: response.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cd = (response.headers["content-disposition"] as string) ?? "";
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      link.download = m?.[1]?.replace(/['"]/g, "") ?? `patrimoines_site_${siteId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFlashMessage({ type: "success", message: "Export téléchargé." });
    } catch {
      setFlashMessage({ type: "error", message: "Erreur lors de l'exportation." });
    } finally {
      setExportLoading(false);
    }
  };

  // ── Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("site_id", String(siteId));
      await axiosInstance.post("/admin/asset/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchPatrimoines();
      setFlashMessage({ type: "success", message: `"${file.name}" importé avec succès.` });
    } catch (err: any) {
      setFlashMessage({ type: "error", message: err?.response?.data?.message ?? "Erreur lors de l'import." });
    } finally {
      setImportLoading(false);
    }
  };

  // ── Colonnes DataTable - clés exactes du back (type, subType, site.nom)
  // Utilisation de as keyof CompanyAsset pour satisfaire TypeScript sur les clés imbriquées ou calculées
  const columns: ColumnConfig<CompanyAsset>[] = [
    {
      header: "Codification", key: "codification",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
          {row.codification}
        </span>
      ),
    },
    // {
    //   header: "ID", key: "id" as any,
    //   render: (_: any, row: CompanyAsset) => (
    //     <div className="flex items-center">
    //       <span className="font-black text-slate-900 text-sm">#{row.id}</span>
    //       <CopyButton text={String(row.id)} />
    //     </div>
    //   ),
    // },
    {
      header: "Type", key: "type",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-700">{row.type?.name ?? "-"}</span>
      ),
    },
    {
      header: "Sous-type", key: "subType",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-700">{(row as any).sub_type?.name ?? row.subType?.name ?? "-"}</span>
      ),
    },
    {
      header: "Désignation", key: "designation",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-medium text-slate-900 text-sm">{row.designation}</span>
      ),
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: CompanyAsset) => (
        <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${ASSET_STATUS_STYLES[row.status] ?? ""}`}>
          {ASSET_STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Date entrée", key: "date_entree",
      render: (_: any, row: CompanyAsset) => <span className="text-xs text-slate-500">{formatDate(row.date_entree)}</span>,
    },
    {
      header: "Valeur", key: "valeur_entree",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm font-bold text-slate-900">{formatCurrency(row.valeur_entree)}</span>
      ),
    },

    {
      header: "Actions", key: "actions",
      render: (_: any, row: CompanyAsset) => (
        <button onClick={() => handleOpenDetails(row)}
          className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  // ── Champs formulaire - codification retirée (générée auto par le back)
  // Sous-types filtrés selon le type sélectionné dans le formulaire
  const filteredSubTypesForForm = selectedTypeId
    ? subTypes.filter((st: any) => String(st.type_company_asset_id) === selectedTypeId)
    : subTypes;

  const assetFields: FieldConfig[] = [
    {
      name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true,
      options: types.map((t: any) => ({ label: t.name, value: String(t.id) })),
    },
    {
      name: "sub_type_company_asset_id", label: "Sous-type", type: "select", required: true,
      options: filteredSubTypesForForm.map((st: any) => ({ label: st.name, value: String(st.id) })),
    },
    { name: "designation", label: "Désignation", type: "text", required: true },
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: [
        { label: "Actif", value: "actif" },
        { label: "Inactif", value: "inactif" },
        { label: "Hors usage", value: "hors_usage" },
      ],
    },
    {
      name: "criticite", label: "Criticité", type: "select",
      options: [
        { label: "Non critique", value: "non_critique" },
        { label: "Critique", value: "critique" },
      ],
    },
    { name: "date_entree", label: "Date d'entrée", type: "date", required: true, icon: CalendarClock },
    { name: "valeur_entree", label: "Valeur d'entrée", type: "number", required: true },
    { name: "images", label: "Photos du patrimoine", type: "image-upload", gridSpan: 2, maxImages: 3 },
    {
      name: "description", label: "Description", type: "rich-text", gridSpan: 2,
      placeholder: "Décrivez plus en détail le patrimoine"
    },
  ];


  // ── Infos du site via helpers robustes
  const siteName = site?.nom ?? "-";
  const location = site?.localisation ?? "-";
  const responsible = resolveManagerName(site);
  const phone = resolveManagerPhone(site);
  const email = resolveManagerEmail(site);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* suppression de pl-64 car déjà géré par AppShell dans le layout admin */}
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="mt-4 p-8 space-y-8">


          {/* ── Header site ── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <Link href="/admin/sites" className="flex items-center gap-2 text-slate-500 hover:text-black transition bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium">
                <ChevronLeft size={18} /> Retour
              </Link>
              {loadingSite ? (
                <div className="space-y-2 animate-pulse">
                  <div className="w-72 h-12 bg-slate-100 rounded-xl" />
                  <div className="w-44 h-5 bg-slate-50 rounded-lg" />
                </div>
              ) : (
                <div>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">{siteName}</h1>
                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <MapPin size={18} />
                    <span className="font-medium text-lg">{location}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[320px]">
                {loadingSite ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="w-40 h-5 bg-slate-100 rounded-lg" />
                    <div className="w-32 h-4 bg-slate-50 rounded-lg" />
                    <div className="w-48 h-4 bg-slate-50 rounded-lg" />
                  </div>
                ) : (
                  <>
                    {responsible !== "-" && <h3 className="text-xl font-bold text-slate-900">{responsible}</h3>}
                    <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100"><Phone size={16} className="text-slate-900" /></div>
                      {phone}
                    </div>
                    {/* <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100"><Mail size={16} className="text-slate-900" /></div>
                      {email}
                    </div> */}
                  </>
                )}
              </div>

              {/* Bouton modifier le site */}
              <button
                onClick={() => setIsEditSiteModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                <Pencil size={16} /> Modifier le site
              </button>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="Coût moyen / site" value={formatCurrency(siteStats?.cout_loyer_moyen)} delta="+0%" trend="up" />

            <StatsCard label="Tickets en cours" value={siteStats?.tickets_en_cours ?? 0} delta="+0%" trend="up" />
            <StatsCard label="Tickets clôturés" value={siteStats?.tickets_clos ?? 0} delta="+0%" trend="up" />
            <StatsCard label="Total patrimoines" value={patrimoines.length} delta="+0%" trend="up" />
          </div>

          {/* ── Barre d'actions ── */}
          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeFiltersCount === 0 && <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>}
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {ASSET_STATUS_LABELS[filters.status] ?? filters.status}
                  <button onClick={() => { setFilters(f => ({ ...f, status: undefined })); setCurrentPage(1); }} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
              {filters.type_id && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {types.find((t: any) => t.id === filters.type_id)?.name ?? `Type #${filters.type_id}`}
                  <button onClick={() => { setFilters(f => ({ ...f, type_id: undefined, sub_type_id: undefined })); setCurrentPage(1); }} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
              {filters.sub_type_id && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {subTypes.find((st: any) => st.id === filters.sub_type_id)?.name ?? `Sous-type #${filters.sub_type_id}`}
                  <button onClick={() => { setFilters(f => ({ ...f, sub_type_id: undefined })); setCurrentPage(1); }} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">


              {/* Importer */}
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                {importLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Download size={16} />}
                Importer
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importLoading} onChange={handleImport} />
              </label>

              {/* Exporter */}
              <button onClick={handleExport} disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait">
                {exportLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Upload size={16} />}
                Exporter
              </button>

              {/* Filtrer */}
              <div className="relative" ref={filterRef}>
                <button onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || activeFiltersCount > 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}>
                  <Filter size={16} /> Filtrer
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <AssetFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={(f) => { setFilters(f); setCurrentPage(1); setFiltersOpen(false); }}
                  types={types}
                  subTypes={subTypes}
                />
              </div>

              <button onClick={() => { setEditingData(null); setSelectedTypeId(""); setIsModalOpen(true); setModalError(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm">
                <Building2 size={16} /> Ajouter un patrimoine
              </button>

            </div>
          </div>

          {/* ── DataTable patrimoines ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingPatrimoines ? (
              <div className="py-16 text-center">
                <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm">Chargement des patrimoines...</p>
              </div>
            ) : paginatedPatrimoines.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucun patrimoine{activeFiltersCount > 0 ? " pour ces filtres" : ""}.
              </div>
            ) : (
              <DataTable columns={columns} data={paginatedPatrimoines} title="Patrimoines du site" onViewAll={() => { }} />
            )}
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-xs text-slate-400">
                Page {currentPage} sur {totalPages} · {patrimoines.length} patrimoine{patrimoines.length > 1 ? "s" : ""}
              </p>
              <Paginate currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        </main>
      </div>

      <AssetSidePanel
        patrimoine={isDetailsOpen ? selectedPatrimoine : null}
        onClose={() => { setIsDetailsOpen(false); setSelectedPatrimoine(null); }}
        onEdit={handleEdit}
      />

      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingData(null); setSelectedTypeId(""); }}
        title={editingData ? "Modifier le patrimoine" : "Ajouter un patrimoine"}
        subtitle="Renseignez les informations du patrimoine"
        fields={assetFields}
        initialValues={editingData ? {
          type_company_asset_id: String((editingData as any).type_company_asset_id ?? ""),
          sub_type_company_asset_id: String((editingData as any).sub_type_company_asset_id ?? ""),
          site_id: String(siteId), // On force l'ID du site actuel
          designation: editingData.designation,
          status: editingData.status,
          criticite: editingData.criticite ?? "non_critique",
          date_entree: fmtDateForInput(editingData.date_entree),
          valeur_entree: editingData.valeur_entree ?? "",
          images: (editingData as any).attachments ?? [], // Transformation des attachments en images pour ImageUpload
          description: editingData.description ?? "",
        } : {}}
        onFieldChange={(name, value, setter) => {
          if (name === "type_company_asset_id") {
            setSelectedTypeId(String(value));
            setter("sub_type_company_asset_id", "");
          }
        }}
        onSubmit={handleCreateOrUpdate}
        submitLabel={editingData ? "Mettre à jour" : "Enregistrer"}
        error={modalError}
        isSubmitting={isSubmitting}
      />


      <ReusableForm
        isOpen={isEditSiteModalOpen}
        onClose={() => setIsEditSiteModalOpen(false)}
        title="Modifier le site"
        subtitle="Modifiez les informations de ce site"
        fields={[
          { name: "nom", label: "Nom du site", type: "text", required: true },
          { name: "ref_contrat", label: "Référence contrat", type: "text", required: true },
          {
            name: "manager_id",
            label: managersLoading ? "Gestionnaire (chargement...)" : "Gestionnaire",
            type: "select",
            disabled: managersLoading,
            options: managers.map((m: any) => ({
              label: resolveManagerName(m) || `Manager #${m.id}`,
              value: String(m.id),
            })),
          },
          {
            name: "status", label: "Statut", type: "select", required: true,
            options: [{ label: "Actif", value: "active" }, { label: "Inactif", value: "inactive" }],
          },
          { name: "effectifs", label: "Effectifs", type: "number" },
          { name: "loyer", label: "Loyer mensuel (FCFA)", type: "number" },
          { name: "superficie", label: "Superficie (m²)", type: "number" },
          { name: "localisation", label: "Localisation", type: "text", gridSpan: 2 },
          { name: "date_deb_contrat", label: "Date de début de contrat", type: "date" },
          { name: "date_fin_contrat", label: "Date de fin de contrat", type: "date" },
        ]}
        initialValues={{
          nom: site?.nom ?? "",
          ref_contrat: site?.ref_contrat ?? "",
          manager_id: String(site?.manager_id ?? site?.manager?.id ?? ""),
          status: site?.status ?? "active",
          effectifs: site?.effectifs ?? "",
          loyer: site?.loyer ?? "",
          superficie: site?.superficie ?? "",
          localisation: site?.localisation ?? "",
          date_deb_contrat: fmtDateForInput(site?.date_deb_contrat),
          date_fin_contrat: fmtDateForInput(site?.date_fin_contrat),
        }}
        onSubmit={handleUpdateSite}
        submitLabel="Mettre à jour le site"
      />
    </div>
  );
}