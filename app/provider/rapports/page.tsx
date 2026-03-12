"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar      from "@/components/Sidebar";
import Navbar       from "@/components/Navbar";
import StatsCard    from "@/components/StatsCard";
import DataTable    from "@/components/DataTable";
import PageHeader   from "@/components/PageHeader";
import ActionGroup  from "@/components/ActionGroup";
import Paginate     from "@/components/Paginate";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";

import {
  Eye, ArrowUpRight, Download, Filter, X,
  FileText, CheckCircle2, XCircle, Clock,
  AlertCircle, PlusCircle, Edit2, Star,
} from "lucide-react";

import { useProviderReports, ReportFilterState } from "../../../hooks/provider/useProviderReports";
import {
  InterventionReport,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  TYPE_LABELS, TYPE_STYLES,
  RESULT_LABELS, RESULT_STYLES,
  formatDate, getAttachmentUrl, getSiteName, isEditable,
} from "../../../services/provider/providerReportService";

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success"|"error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-4
      rounded-2xl shadow-2xl border text-sm font-semibold
      animate-in slide-in-from-bottom-4 duration-300
      ${type==="success" ? "bg-white border-green-100 text-green-700" : "bg-white border-red-100 text-red-700"}`}>
      {type==="success"
        ? <CheckCircle2 size={18} className="text-green-500 shrink-0"/>
        : <XCircle      size={18} className="text-red-500 shrink-0"/>}
      {msg}
    </div>
  );
}

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5
      rounded-xl border text-xs font-bold ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s==="validated" ? <CheckCircle2 size={11} className="mr-1"/> : <Clock size={11} className="mr-1"/>}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}
function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold
      ${TYPE_STYLES[type] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold
      ${RESULT_STYLES[result] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {RESULT_LABELS[result] ?? result}
    </span>
  );
}
function StarRow({ value }: { value?: number|null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({length:5},(_,i)=>(
        <Star key={i} size={13}
          className={i<value?"fill-yellow-400 text-yellow-400":"fill-slate-200 text-slate-200"}/>
      ))}
    </div>
  );
}

// ─── PDF Preview Modal ─────────────────────────────────────────────────────────
function PdfPreviewModal({ url, name, onClose }: { url:string; name:string; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
            <FileText size={14} className="text-white"/>
          </div>
          <p className="text-white font-bold text-sm">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
            <Download size={14}/> Télécharger
          </a>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
            <X size={18} className="text-white"/>
          </button>
        </div>
      </div>
      <div className="flex-1">
        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name}/>
      </div>
    </div>
  );
}

// ─── Filter Dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: { isOpen:boolean; onClose:()=>void; filters:ReportFilterState; onApply:(f:ReportFilterState)=>void }) {
  const [local, setLocal] = useState(filters);
  useEffect(()=>{ setLocal(filters); },[filters]);
  if (!isOpen) return null;

  const statusOpts = [
    {val:"",          label:"Tous"},
    {val:"pending",   label:"En attente"},
    {val:"validated", label:"Validé"},
  ];
  const typeOpts = [
    {val:"",          label:"Tous"},
    {val:"curatif",   label:"Curatif"},
    {val:"preventif", label:"Préventif"},
  ];
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500"/>
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
          <div className="flex flex-col gap-2 mt-2">
            {statusOpts.map(({val,label})=>(
              <button key={val}
                onClick={()=>setLocal({...local,status:val||undefined})}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${(local.status??"")=== val?"bg-slate-900 text-white":"bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</label>
          <div className="flex flex-col gap-2 mt-2">
            {typeOpts.map(({val,label})=>(
              <button key={val}
                onClick={()=>setLocal({...local,type:val||undefined})}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${(local.type??"")=== val?"bg-slate-900 text-white":"bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={()=>{setLocal({});onApply({});onClose();}}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
          Réinitialiser
        </button>
        <button onClick={()=>{onApply(local);onClose();}}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─── Side Panel ────────────────────────────────────────────────────────────────
function ReportSidePanel({
  report, onClose, onEdit,
}: { report: InterventionReport; onClose:()=>void; onEdit:(r:InterventionReport)=>void }) {
  const [pdfPreview, setPdfPreview] = useState<{url:string;name:string}|null>(null);

  const pdfs   = (report.attachments??[]).filter(a=>a.file_type==="document");
  const photos = (report.attachments??[]).filter(a=>a.file_type==="photo");
  const editable = isEditable(report);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose}/>
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500"/>
          </button>
        </div>
        <div className="px-6 pt-4 pb-5 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-slate-900">Rapport #{report.id}</h2>
            <StatusBadge status={report.status}/>
          </div>
          <p className="text-slate-400 text-xs">{report.ticket?.subject ?? `Ticket #${report.ticket_id}`}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Champs */}
          <div className="space-y-0">
            {[
              {label:"Site",     value: getSiteName(report.site)},
              {label:"Début",    value: formatDate(report.start_date)},
              {label:"Fin",      value: formatDate(report.end_date)},
              {label:"Créé le",  value: formatDate(report.created_at)},
              {label:"Type",     render:()=><TypeBadge type={report.intervention_type}/>},
              {label:"Résultat", render:()=><ResultBadge result={report.result}/>},
            ].map((f,i)=>(
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {(f as any).render
                  ? (f as any).render()
                  : <p className="text-sm font-bold text-slate-900">{(f as any).value}</p>}
              </div>
            ))}
          </div>

          {/* Description */}
          {report.description && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {report.description}
              </p>
            </div>
          )}

          {/* Observations */}
          {report.findings && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Observations</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {report.findings}
              </p>
            </div>
          )}

          {/* Bloc validation */}
          {report.status==="validated" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 size={16}/> Validé le {formatDate(report.validated_at)}
              </div>
              {report.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Note :</span>
                  <StarRow value={report.rating}/>
                  <span className="text-xs font-bold text-slate-700">{report.rating}/5</span>
                </div>
              )}
              {report.manager_comment && (
                <p className="text-xs text-slate-600 bg-white rounded-xl p-3 border border-emerald-100">
                  {report.manager_comment}
                </p>
              )}
            </div>
          )}

          {/* PDFs */}
          {pdfs.length>0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Documents ({pdfs.length})</p>
              <div className="space-y-2">
                {pdfs.map(att=>{
                  const url  = getAttachmentUrl(att.file_path);
                  const name = att.file_path.split("/").pop()??"document.pdf";
                  return (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                      <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400">PDF</p>
                      </div>
                      <button onClick={()=>setPdfPreview({url,name})}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition shrink-0">
                        <Eye size={13}/> Aperçu
                      </button>
                      <a href={url} download target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0">
                        <Download size={13}/>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photos */}
          {photos.length>0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Photos ({photos.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(att=>{
                  const url = getAttachmentUrl(att.file_path);
                  return (
                    <a key={att.id} href={url} target="_blank" rel="noreferrer"
                      className="aspect-square rounded-xl overflow-hidden border border-slate-100 hover:opacity-80 transition">
                      <img src={url} alt="photo" className="w-full h-full object-cover"/>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {!pdfs.length && !photos.length && (
            <div className="border border-dashed border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-3 text-slate-400">
              <FileText size={18} className="shrink-0"/>
              <p className="text-sm font-medium">Aucune pièce jointe</p>
            </div>
          )}
        </div>

        {/* Footer modifier */}
        {editable && (
          <div className="px-6 py-5 border-t border-slate-100 shrink-0">
            <button
              onClick={()=>{onClose();onEdit(report);}}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
              <Edit2 size={15}/> Modifier le rapport
            </button>
          </div>
        )}
      </div>

      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={()=>setPdfPreview(null)}/>
      )}
    </>
  );
}

// ─── Champs formulaire ─────────────────────────────────────────────────────────
// Partagés création / édition
const baseFields: FieldConfig[] = [
  {
    name:"intervention_type", label:"Type d'intervention *", type:"select", required:true,
    options:[
      {label:"Sélectionner…",  value:""},
      {label:"Curatif",        value:"curatif"},
      {label:"Préventif",      value:"preventif"},
    ],
  },
  {
    name:"result", label:"Résultat de l'intervention *", type:"select", required:true,
    options:[
      {label:"Sélectionner…",    value:""},
      {label:"RAS",               value:"ras"},
      {label:"Anomalie détectée", value:"anomalie"},
      {label:"Résolu",            value:"resolu"},
    ],
  },
  {name:"start_date",   label:"Date de début *", type:"date",     required:true},
  {name:"end_date",     label:"Date de fin",     type:"date"},
  {name:"description",  label:"Description de l'intervention",   type:"textarea"},
  {name:"findings",     label:"Observations / Constatations",     type:"textarea"},
  {name:"attachments",  label:"Photos & Documents justificatifs (PDF, images)",
   type:"pdf-upload", maxPDFs:10, gridSpan:2} as any,
];

const createFields: FieldConfig[] = [
  {name:"ticket_id", label:"ID du Ticket *", type:"text", required:true},
  ...baseFields,
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProviderRapportsPage() {
  const router    = useRouter();
  const filterRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const {
    filteredReports, stats, selectedReport,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen, isEditOpen, filters,
    openPanel, closePanel, openCreate, closeCreate, openEdit, closeEdit,
    setFilters, createReport, updateReport, exportXlsx,
  } = useProviderReports();

  useEffect(()=>{
    const h = (e:MouseEvent)=>{
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const applyFilters = (f: ReportFilterState) => { setFilters(f); setCurrentPage(1); setFiltersOpen(false); };
  const activeCount  = Object.values(filters).filter(Boolean).length;
  const totalPages   = Math.ceil(filteredReports.length / PER_PAGE);
  const paginated    = filteredReports.slice((currentPage-1)*PER_PAGE, currentPage*PER_PAGE);

  const handleCreate = async (formData: any) => {
    await createReport({
      ticket_id:         parseInt(formData.ticket_id),
      intervention_type: formData.intervention_type,
      result:            formData.result,
      start_date:        formData.start_date,
      end_date:          formData.end_date   || undefined,
      description:       formData.description|| undefined,
      findings:          formData.findings   || undefined,
      attachments:       formData.attachments ?? [],
    });
  };

  const handleUpdate = async (formData: any) => {
    if (!selectedReport) return;
    await updateReport(selectedReport.id, {
      intervention_type: formData.intervention_type || undefined,
      result:            formData.result            || undefined,
      start_date:        formData.start_date        || undefined,
      end_date:          formData.end_date          || undefined,
      description:       formData.description       || undefined,
      findings:          formData.findings          || undefined,
      attachments:       formData.attachments?.length ? formData.attachments : undefined,
    });
  };

  // KPIs
  const avgRating = typeof stats?.average_rating==="string"
    ? parseFloat(stats.average_rating) : (stats?.average_rating??0);

  const kpis = [
    {label:"Total rapports",   value: statsLoading?"—":(stats?.total_reports     ??0), delta:"", trend:"up" as const},
    {label:"Rapports validés", value: statsLoading?"—":(stats?.validated_reports  ??0), delta:"", trend:"up" as const},
    {label:"En attente",       value: statsLoading?"—":(stats?.pending_reports    ??0), delta:"", trend:"up" as const},
    {label:"Note moyenne",     value: statsLoading?"—":(avgRating>0?`${avgRating.toFixed(1)}/5`:"—"), delta:"", trend:"up" as const},
  ];

  const pageActions = [
    {label:"Exporter",        icon:Download,   onClick:exportXlsx, variant:"secondary" as const},
    {label:"Nouveau rapport", icon:PlusCircle, onClick:openCreate, variant:"primary"   as const},
  ];

  const columns = [
    {header:"ID",       key:"id",         render:(_:any,row:InterventionReport)=><span className="font-black text-slate-900 text-sm">#{row.id}</span>},
    {header:"Ticket",   key:"ticket",     render:(_:any,row:InterventionReport)=><span className="text-xs text-slate-600 font-medium">{row.ticket?.subject??`#${row.ticket_id}`}</span>},
    {header:"Site",     key:"site",       render:(_:any,row:InterventionReport)=><span className="text-xs text-slate-600">{getSiteName(row.site)}</span>},
    {header:"Type",     key:"type",       render:(_:any,row:InterventionReport)=><TypeBadge type={row.intervention_type}/>},
    {header:"Résultat", key:"result",     render:(_:any,row:InterventionReport)=><ResultBadge result={row.result}/>},
    {header:"Date",     key:"created_at", render:(_:any,row:InterventionReport)=><span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>},
    {header:"Note",     key:"rating",     render:(_:any,row:InterventionReport)=><StarRow value={row.rating}/>},
    {header:"Statut",   key:"status",     render:(_:any,row:InterventionReport)=><StatusBadge status={row.status}/>},
    {
      header:"Actions", key:"actions",
      render:(_:any,row:InterventionReport)=>(
        <div className="flex items-center gap-3">
          <button onClick={()=>openPanel(row)} title="Aperçu"
            className="text-slate-800 hover:text-gray-500 transition">
            <Eye size={18}/>
          </button>
          <button
            onClick={()=>router.push(`/provider/rapports/${row.id}`)}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center"
            title="Voir les détails">
            <ArrowUpRight size={15} className="text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all"/>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar/>
      <div className="flex-1 flex flex-col">
        <Navbar/>
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Rapports d'intervention"
            subtitle="Soumettez et suivez vos rapports d'intervention. Le gestionnaire sera notifié automatiquement."
          />

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0"/> {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({length:4}).map((_,i)=>(
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28"/>
                ))
              : kpis.map((k,i)=><StatsCard key={i} {...k}/>)
            }
          </div>

          {/* Toolbar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative" ref={filterRef}>
              <button
                onClick={()=>setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition
                  ${filtersOpen||activeCount>0?"bg-slate-900 text-white border-slate-900":"border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                <Filter size={15}/> Filtrer par
                {activeCount>0 && (
                  <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>
              <FilterDropdown isOpen={filtersOpen} onClose={()=>setFiltersOpen(false)} filters={filters} onApply={applyFilters}/>
            </div>
            <ActionGroup actions={pageActions}/>
          </div>

          {/* Chips filtres actifs */}
          {activeCount>0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {STATUS_LABELS[filters.status]??filters.status}
                  <button onClick={()=>applyFilters({...filters,status:undefined})} className="hover:opacity-70"><X size={11}/></button>
                </span>
              )}
              {filters.type && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.type==="curatif"?"Curatif":"Préventif"}
                  <button onClick={()=>applyFilters({...filters,type:undefined})} className="hover:opacity-70"><X size={11}/></button>
                </span>
              )}
            </div>
          )}

          {/* DataTable */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Liste des rapports</h3>
              <span className="text-xs text-slate-400">
                {filteredReports.length} rapport{filteredReports.length>1?"s":""}
              </span>
            </div>
            <div className="px-6 py-4">
              {loading
                ? <div className="space-y-3 animate-pulse">
                    {Array.from({length:5}).map((_,i)=>(
                      <div key={i} className="h-12 bg-gray-100 rounded-xl"/>
                    ))}
                  </div>
                : <DataTable columns={columns} data={paginated} onViewAll={()=>{}}/>
              }
            </div>
            {totalPages>1 && (
              <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
                <Paginate currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}/>
              </div>
            )}
          </div>
        </main>
      </div>

      {submitSuccess && <Toast msg={submitSuccess} type="success"/>}
      {submitError   && <Toast msg={submitError}   type="error"/>}

      {/* Panel aperçu */}
      {isPanelOpen && selectedReport && (
        <ReportSidePanel report={selectedReport} onClose={closePanel} onEdit={openEdit}/>
      )}

      {/* Formulaire création */}
      <ReusableForm
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Soumettre un rapport d'intervention"
        subtitle="Renseignez les informations de votre intervention. Le gestionnaire de site sera notifié automatiquement à la soumission."
        fields={createFields}
        onSubmit={handleCreate}
        submitLabel={submitting?"Soumission en cours...":"Soumettre le rapport"}
      />

      {/* Formulaire édition */}
      {selectedReport && (
        <ReusableForm
          isOpen={isEditOpen}
          onClose={closeEdit}
          title={`Modifier le rapport #${selectedReport.id}`}
          subtitle="Les modifications sont impossibles après validation par le gestionnaire."
          fields={baseFields}
          initialValues={{
            intervention_type: selectedReport.intervention_type??"",
            result:            selectedReport.result??"",
            start_date:        selectedReport.start_date??"",
            end_date:          selectedReport.end_date??"",
            description:       selectedReport.description??"",
            findings:          selectedReport.findings??"",
          }}
          onSubmit={handleUpdate}
          submitLabel={submitting?"Mise à jour...":"Mettre à jour"}
        />
      )}
    </div>
  );
}