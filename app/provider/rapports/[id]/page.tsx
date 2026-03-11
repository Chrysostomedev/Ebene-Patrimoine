"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar      from "@/components/Sidebar";
import Navbar       from "@/components/Navbar";
import StatsCard    from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";

import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, X, Star, AlertCircle,
  MapPin, Wrench, Edit2, AlertTriangle,
} from "lucide-react";

import {
  providerReportService, InterventionReport,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  TYPE_LABELS, TYPE_STYLES,
  RESULT_LABELS, RESULT_STYLES,
  formatDate, formatDateTime, getAttachmentUrl,
  getSiteName, getProviderName, isEditable,
} from "@services/providerReportService";
import { useProviderReports } from "@hooks/useProviderReports";

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold
      ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s==="validated" ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}
function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold
      ${TYPE_STYLES[type] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold
      ${RESULT_STYLES[result] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {RESULT_LABELS[result] ?? result}
    </span>
  );
}
function StarRatingDisplay({ value }: { value?: number|null }) {
  if (!value) return <span className="text-slate-400 text-sm">Non noté</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({length:5},(_,i)=>(
          <Star key={i} size={18}
            className={i<value?"fill-yellow-400 text-yellow-400":"fill-slate-200 text-slate-200"}/>
        ))}
      </div>
      <span className="text-sm font-black text-slate-700">{value}/5</span>
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

// ─── Timeline — trace de tous les mouvements du rapport ───────────────────────
interface TimelineEvent {
  label:     string;
  sublabel?: string;
  date?:     string;
  icon:      React.ReactNode;
  dotColor:  string;
  bgColor:   string;
  borderColor: string;
}

function buildTimeline(report: InterventionReport): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Soumission du rapport (étape 5 logique métier)
  events.push({
    label:     "Rapport soumis",
    sublabel:  report.ticket?.subject
               ? `Ticket : "${report.ticket.subject}"`
               : `Ticket #${report.ticket_id}`,
    date:      report.created_at,
    icon:      <FileText size={14}/>,
    dotColor:  "text-blue-500",
    bgColor:   "bg-blue-50",
    borderColor: "border-blue-200",
  });

  // 2. Intervention effectuée (étape 2)
  if (report.start_date) {
    events.push({
      label:     `Intervention ${TYPE_LABELS[report.intervention_type??""]}`,
      sublabel:  report.end_date
                 ? `Du ${formatDate(report.start_date)} au ${formatDate(report.end_date)}`
                 : `Le ${formatDate(report.start_date)}`,
      date:      report.start_date,
      icon:      <Wrench size={14}/>,
      dotColor:  "text-purple-500",
      bgColor:   "bg-purple-50",
      borderColor: "border-purple-200",
    });
  }

  // 3. Résultat renseigné (étape 4)
  if (report.result) {
    const isAnomal = report.result === "anomalie";
    events.push({
      label:     `Résultat : ${RESULT_LABELS[report.result]}`,
      sublabel:  report.findings
                 ? `"${report.findings.slice(0,80)}${report.findings.length>80?"…":""}"`
                 : undefined,
      date:      report.updated_at ?? report.created_at,
      icon:      isAnomal ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>,
      dotColor:  isAnomal ? "text-red-500" : "text-green-500",
      bgColor:   isAnomal ? "bg-red-50"    : "bg-green-50",
      borderColor: isAnomal ? "border-red-200" : "border-green-200",
    });
  }

  // 4. Pièces jointes déposées (étape 3)
  const count = report.attachments?.length ?? 0;
  if (count > 0) {
    const pdfsN   = (report.attachments??[]).filter(a=>a.file_type==="document").length;
    const photosN = (report.attachments??[]).filter(a=>a.file_type==="photo").length;
    events.push({
      label:     `${count} pièce${count>1?"s":""} jointe${count>1?"s":""} déposée${count>1?"s":""}`,
      sublabel:  `${pdfsN} document${pdfsN>1?"s":""} · ${photosN} photo${photosN>1?"s":""}`,
      date:      report.created_at,
      icon:      <FileText size={14}/>,
      dotColor:  "text-slate-500",
      bgColor:   "bg-slate-50",
      borderColor: "border-slate-200",
    });
  }

  // 5. Validation par le gestionnaire
  if (report.status === "validated") {
    events.push({
      label:     "Rapport validé par le gestionnaire",
      sublabel:  report.manager_comment
                 ? `Commentaire : "${report.manager_comment.slice(0,80)}${report.manager_comment.length>80?"…":""}"`
                 : report.rating ? `Note attribuée : ${report.rating}/5` : undefined,
      date:      report.validated_at,
      icon:      <CheckCircle2 size={14}/>,
      dotColor:  "text-emerald-500",
      bgColor:   "bg-emerald-50",
      borderColor: "border-emerald-200",
    });
  }

  return events;
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0
          ${event.bgColor} ${event.borderColor}`}>
          <span className={event.dotColor}>{event.icon}</span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-100 mt-2"/>}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <h4 className="text-sm font-bold text-slate-900">{event.label}</h4>
          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{formatDate(event.date)}</span>
        </div>
        {event.sublabel && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.sublabel}</p>
        )}
      </div>
    </div>
  );
}

// ─── Champs édition (sans ticket_id — non modifiable) ─────────────────────────
const editFields: FieldConfig[] = [
  {
    name:"intervention_type", label:"Type d'intervention", type:"select",
    options:[
      {label:"Sélectionner…",  value:""},
      {label:"Curatif",        value:"curatif"},
      {label:"Préventif",      value:"preventif"},
    ],
  },
  {
    name:"result", label:"Résultat de l'intervention", type:"select",
    options:[
      {label:"Sélectionner…",    value:""},
      {label:"RAS",               value:"ras"},
      {label:"Anomalie détectée", value:"anomalie"},
      {label:"Résolu",            value:"resolu"},
    ],
  },
  {name:"start_date",  label:"Date de début",                  type:"date"},
  {name:"end_date",    label:"Date de fin",                    type:"date"},
  {name:"description", label:"Description",                    type:"textarea"},
  {name:"findings",    label:"Observations / Constatations",   type:"textarea"},
  {name:"attachments", label:"Ajouter des pièces jointes",
   type:"pdf-upload", maxPDFs:10, gridSpan:2} as any,
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProviderRapportsDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const reportId = Number(params?.id);

  const [report,     setReport]     = useState<InterventionReport|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [pdfPreview, setPdfPreview] = useState<{url:string;name:string}|null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [flash,      setFlash]      = useState<{type:"success"|"error";msg:string}|null>(null);

  const { updateReport, submitting } = useProviderReports();

  const showFlash = (type: "success"|"error", msg: string) => {
    setFlash({type,msg}); setTimeout(()=>setFlash(null), 4500);
  };

  // ── Chargement ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!reportId) return;
    const load = async () => {
      setLoading(true); setError("");
      try {
        setReport(await providerReportService.getReportById(reportId));
      } catch (e:any) {
        setError(
          e.response?.data?.message ??
          e.response?.data?.error   ??
          "Impossible de charger ce rapport."
        );
      } finally { setLoading(false); }
    };
    load();
  },[reportId]);

  // ── Mise à jour ────────────────────────────────────────────────────────────
  const handleUpdate = async (formData: any) => {
    if (!report) return;
    const ok = await updateReport(report.id, {
      intervention_type: formData.intervention_type || undefined,
      result:            formData.result            || undefined,
      start_date:        formData.start_date        || undefined,
      end_date:          formData.end_date          || undefined,
      description:       formData.description       || undefined,
      findings:          formData.findings          || undefined,
      attachments:       formData.attachments?.length ? formData.attachments : undefined,
    });
    if (ok) {
      setIsEditOpen(false);
      showFlash("success","Rapport mis à jour avec succès.");
      // Rechargement pour avoir les nouvelles pièces jointes
      try {
        setReport(await providerReportService.getReportById(report.id));
      } catch { /* silencieux */ }
    } else {
      showFlash("error","Erreur lors de la mise à jour.");
    }
  };

  // ── Données dérivées ───────────────────────────────────────────────────────
  const pdfs       = (report?.attachments??[]).filter(a=>a.file_type==="document");
  const photos     = (report?.attachments??[]).filter(a=>a.file_type==="photo");
  const timeline   = report ? buildTimeline(report) : [];
  const editable   = report ? isEditable(report) : false;

  const kpis = [
    {label:"Prestataire",    value: getProviderName(report?.provider), delta:"", trend:"up" as const},
    {label:"Site",           value: getSiteName(report?.site),         delta:"", trend:"up" as const},
    {label:"Pièces jointes", value: report?.attachments?.length??0,    delta:"", trend:"up" as const},
    {label:"Note",           value: report?.rating?`${report.rating}/5`:"N/A", delta:"", trend:"up" as const},
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar/>
      <div className="flex-1 flex flex-col">
        <Navbar/>
        <main className="ml-64 mt-20 p-8 space-y-8">

          <button onClick={()=>router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-black transition
              bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium">
            <ChevronLeft size={16}/> Retour
          </button>

          {flash && (
            <div className={`px-5 py-4 rounded-2xl text-sm font-semibold border
              ${flash.type==="success"
                ?"bg-green-50 text-green-700 border-green-200"
                :"bg-red-50 text-red-700 border-red-200"}`}>
              {flash.msg}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0"/> {error}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-80 bg-slate-100 rounded-2xl"/>
              <div className="h-44 bg-slate-100 rounded-3xl"/>
              <div className="grid grid-cols-4 gap-6">
                {[0,1,2,3].map(i=><div key={i} className="h-28 bg-slate-100 rounded-3xl"/>)}
              </div>
            </div>
          )}

          {report && (
            <>
              {/* ── Header ───────────────────────────────────────────── */}
              <div className="bg-white flex flex-col md:flex-row md:items-start justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight uppercase">
                      Rapport #{reportId}
                    </h1>
                    <StatusBadge status={report.status}/>
                    <TypeBadge   type={report.intervention_type}/>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={16}/>
                    <span className="font-medium text-base">{getSiteName(report.site)}</span>
                  </div>
                  {report.ticket?.subject && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Wrench size={14}/>
                      <span className="text-sm font-medium">{report.ticket.subject}</span>
                    </div>
                  )}
                  {report.result && <ResultBadge result={report.result}/>}
                </div>

                {/* Dates + bouton modifier */}
                <div className="flex flex-col gap-4 min-w-[270px]">
                  <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 space-y-2.5">
                    {[
                      {label:"Créé le",   value:formatDate(report.created_at),   show:true},
                      {label:"Début",     value:formatDate(report.start_date),   show:true},
                      {label:"Fin",       value:formatDate(report.end_date),     show:!!report.end_date},
                      {label:"Validé le", value:formatDate(report.validated_at), show:!!report.validated_at, green:true},
                    ].filter(r=>r.show).map((r,i)=>(
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">{r.label}</span>
                        <span className={`font-bold ${ (r as any).green?"text-emerald-700":"text-slate-900"}`}>{r.value}</span>
                      </div>
                    ))}
                    {report.status==="validated" && report.rating && (
                      <div className="border-t border-slate-100 pt-3">
                        <StarRatingDisplay value={report.rating}/>
                      </div>
                    )}
                  </div>
                  {editable && (
                    <button onClick={()=>setIsEditOpen(true)}
                      className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition">
                      <Edit2 size={15}/> Modifier le rapport
                    </button>
                  )}
                </div>
              </div>

              {/* ── KPIs ──────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k,i)=><StatsCard key={i} {...k}/>)}
              </div>

              {/* ── Layout 3 colonnes ─────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Colonne gauche */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Description */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Description</h3>
                    {report.description
                      ? <p className="text-sm text-slate-700 leading-relaxed">{report.description}</p>
                      : <p className="text-slate-400 text-sm italic">Aucune description renseignée.</p>
                    }
                  </div>

                  {/* Observations */}
                  {report.findings && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        Observations / Constatations
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                        {report.findings}
                      </p>
                    </div>
                  )}

                  {/* Commentaire du gestionnaire */}
                  {report.status==="validated" && report.manager_comment && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-6">
                      <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">
                        Commentaire du gestionnaire
                      </h3>
                      <p className="text-sm text-emerald-700 leading-relaxed">{report.manager_comment}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {photos.length>0 && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        Photos ({photos.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
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

                  {/* ── Timeline des mouvements ──────────────────────── */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                      Historique des mouvements
                    </h3>
                    {timeline.length>0
                      ? <div>
                          {timeline.map((evt,i)=>(
                            <TimelineItem key={i} event={evt} isLast={i===timeline.length-1}/>
                          ))}
                        </div>
                      : <p className="text-sm text-slate-400 italic">Aucun mouvement enregistré.</p>
                    }
                  </div>
                </div>

                {/* Colonne droite */}
                <div className="space-y-6">

                  {/* Documents PDF */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Documents ({pdfs.length})
                    </h3>
                    {pdfs.length>0 ? (
                      <div className="space-y-3">
                        {pdfs.map(att=>{
                          const url  = getAttachmentUrl(att.file_path);
                          const name = att.file_path.split("/").pop()??"document.pdf";
                          return (
                            <div key={att.id} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                  <FileText size={16} className="text-red-500"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                                  <p className="text-[10px] text-slate-400">PDF</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={()=>setPdfPreview({url,name})}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition">
                                  <Eye size={13}/> Aperçu
                                </button>
                                <a href={url} download target="_blank" rel="noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition">
                                  <Download size={13}/> Télécharger
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
                        <FileText size={16} className="shrink-0"/>
                        <p className="text-sm font-medium">Aucun document</p>
                      </div>
                    )}
                  </div>

                  {/* Statut actuel */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Statut actuel</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{backgroundColor:`${STATUS_DOT[report.status]??"#94a3b8"}18`}}>
                        {report.status==="validated"
                          ? <CheckCircle2 size={18} className="text-green-500"/>
                          : <Clock        size={18} className="text-amber-500"/>}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {STATUS_LABELS[report.status]??report.status}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Màj : {formatDate(report.updated_at)}</p>
                      </div>
                    </div>

                    {report.status==="pending" && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
                        ⏳ En attente de validation par le gestionnaire du site.
                      </p>
                    )}
                    {report.status==="validated" && (
                      <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3 font-medium">
                        ✅ Rapport validé le {formatDate(report.validated_at)}.
                      </p>
                    )}
                    {!editable && (
                      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-medium mt-2">
                        🔒 Ce rapport ne peut plus être modifié.
                      </p>
                    )}
                  </div>

                  {/* Ticket lié */}
                  {report.ticket && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ticket lié</h3>
                      <div className="space-y-2.5">
                        {[
                          {label:"ID",     value:`#${report.ticket.id}`},
                          {label:"Sujet",  value: report.ticket.subject??"—"},
                          {label:"Type",   value: report.ticket.type==="curatif"?"Curatif":"Préventif"},
                          {label:"Statut", value: report.ticket.status??"—"},
                        ].map((f,i)=>(
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                            <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                            <span className="text-xs font-bold text-slate-900">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info prestataire */}
                  {report.provider && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Prestataire</h3>
                      <div className="space-y-2.5">
                        {[
                          {label:"Nom",       value: getProviderName(report.provider)},
                          {label:"Email",     value: report.provider.email??"—"},
                          {label:"Téléphone", value: report.provider.phone??"—"},
                        ].map((f,i)=>(
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                            <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                            <span className="text-xs font-bold text-slate-900">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* PDF Preview */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={()=>setPdfPreview(null)}/>
      )}

      {/* Formulaire édition */}
      {report && (
        <ReusableForm
          isOpen={isEditOpen}
          onClose={()=>setIsEditOpen(false)}
          title={`Modifier le rapport #${report.id}`}
          subtitle="Impossible de modifier un rapport déjà validé par le gestionnaire."
          fields={editFields}
          initialValues={{
            intervention_type: report.intervention_type??"",
            result:            report.result??"",
            start_date:        report.start_date??"",
            end_date:          report.end_date??"",
            description:       report.description??"",
            findings:          report.findings??"",
          }}
          onSubmit={handleUpdate}
          submitLabel={submitting?"Mise à jour...":"Mettre à jour"}
        />
      )}
    </div>
  );
}