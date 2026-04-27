// "use client";

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import Link from "next/link";
// import {
//   ChevronLeft, CheckCircle2, Clock, XCircle, FileText,
//   Eye, Download, X, MapPin, Briefcase, DollarSign,
//   Calendar, AlertTriangle, TrendingUp,
// } from "lucide-react";

// import Navbar from "@/components/Navbar";
// // import StatsCard from "@/components/StatsCard";

// import { InvoiceService, Invoice } from "../../../../../services/admin/invoice.service";

// // ═══════════════════════════════════════════════════════════════════════════
// // HELPERS
// // ═══════════════════════════════════════════════════════════════════════════

// const formatMontant = (v?: number): string => {
//   if (!v && v !== 0) return "-";
//   if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
//   if (v >= 1_000) return `${Math.round(v / 1_000)}K FCFA`;
//   return `${v.toLocaleString("fr-FR")} FCFA`;
// };

// const formatDate = (iso?: string | null): string => {
//   if (!iso) return "-";
//   return new Date(iso).toLocaleDateString("fr-FR", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const formatDateLong = (iso?: string | null): string => {
//   if (!iso) return "-";
//   return new Date(iso).toLocaleDateString("fr-FR", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // COMPOSANTS
// // ═══════════════════════════════════════════════════════════════════════════

// function StatusBadge({ status }: { status: string }) {
//   const styles: Record<string, string> = {
//     paid: "border-black bg-black text-white",
//     pending: "border-slate-300 bg-slate-100 text-slate-700",
//     overdue: "border-red-500 bg-red-100 text-red-600",
//     cancelled: "border-slate-400 bg-slate-100 text-slate-500",
//   };
//   const labels: Record<string, string> = {
//     paid: "Payée",
//     pending: "En attente",
//     overdue: "En retard",
//     cancelled: "Annulée",
//   };
//   const icons: Record<string, JSX.Element> = {
//     paid: <CheckCircle2 size={14} />,
//     pending: <Clock size={14} />,
//     overdue: <AlertTriangle size={14} />,
//     cancelled: <XCircle size={14} />,
//   };

//   return (
//     <span
//       className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold ${
//         styles[status] ?? "border-slate-200 bg-slate-50 text-slate-500"
//       }`}
//     >
//       {icons[status]}
//       {labels[status] ?? status}
//     </span>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // TIMELINE FLUX COMPLET : Rapport → Devis → Facture
// // ═══════════════════════════════════════════════════════════════════════════

// interface FlowStepProps {
//   label: string;
//   reference?: string;
//   date?: string;
//   status?: string;
//   icon: JSX.Element;
//   isLast?: boolean;
// }

// function FlowStep({ label, reference, date, status, icon, isLast }: FlowStepProps) {
//   return (
//     <div className="flex gap-4">
//       {/* Icône + ligne */}
//       <div className="flex flex-col items-center">
//         <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white shrink-0">
//           {icon}
//         </div>
//         {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
//       </div>

//       {/* Contenu */}
//       <div className="flex-1 pb-6">
//         <h4 className="text-sm font-black text-slate-900 mb-1">{label}</h4>
//         {reference && <p className="text-xs text-slate-500 mb-1">Réf : {reference}</p>}
//         {date && <p className="text-xs text-slate-400">{formatDate(date)}</p>}
//         {status && (
//           <div className="mt-2">
//             <StatusBadge status={status} />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // FACTURES LIÉES AU RAPPORT/TICKET
// // ═══════════════════════════════════════════════════════════════════════════

// interface RelatedInvoicesListProps {
//   invoices: Invoice[];
//   currentInvoiceId: number;
// }

// function RelatedInvoicesList({ invoices, currentInvoiceId }: RelatedInvoicesListProps) {
//   if (invoices.length <= 1) return null;

//   return (
//     <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
//         Factures liées ({invoices.length})
//       </h3>
//       <div className="space-y-3">
//         {invoices.map((inv) => {
//           const isCurrent = inv.id === currentInvoiceId;
//           return (
//             <Link
//               key={inv.id}
//               href={`/admin/factures/details/${inv.id}`}
//               className={`block p-4 rounded-xl border transition-all ${
//                 isCurrent
//                   ? "border-slate-900 bg-slate-900 text-white"
//                   : "border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md"
//               }`}
//             >
//               <div className="flex items-center justify-between mb-2">
//                 <div className="flex items-center gap-3">
//                   <span className="text-sm font-black">{inv.reference}</span>
//                   {isCurrent && (
//                     <span className="text-xs bg-white text-slate-900 px-2 py-0.5 rounded-full font-bold">
//                       Actuelle
//                     </span>
//                   )}
//                 </div>
//                 <StatusBadge status={inv.payment_status} />
//               </div>
//               <div className="flex items-center justify-between text-xs">
//                 <span className={isCurrent ? "text-slate-300" : "text-slate-500"}>
//                   {formatDate(inv.invoice_date)}
//                 </span>
//                 <span className="font-bold">{formatMontant(inv.amount_ttc)}</span>
//               </div>
//             </Link>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // PDF PREVIEW MODAL
// // ═══════════════════════════════════════════════════════════════════════════

// function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
//   return (
//     <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
//       <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
//         <div className="flex items-center gap-3">
//           <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
//             <FileText size={14} className="text-white" />
//           </div>
//           <p className="text-white font-bold text-sm">{name}</p>
//         </div>
//         <div className="flex items-center gap-3">
//           <a
//             href={url}
//             download
//             target="_blank"
//             rel="noreferrer"
//             className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"
//           >
//             <Download size={14} /> Télécharger
//           </a>
//           <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
//             <X size={18} className="text-white" />
//           </button>
//         </div>
//       </div>
//       <div className="flex-1">
//         <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name} />
//       </div>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // PAGE DÉTAIL FACTURE
// // ═══════════════════════════════════════════════════════════════════════════

// export default function FactureDetailsPage() {
//   const params = useParams();
//   const invoiceId = Number(params.id);

//   const [invoice, setInvoice] = useState<Invoice | null>(null);
//   const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
//   const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

//   const showFlash = (type: "success" | "error", message: string) => {
//     setFlash({ type, message });
//     setTimeout(() => setFlash(null), 5000);
//   };

//   // ── Chargement facture ──────────────────────────────────────────────────────
//   const fetchInvoice = async () => {
//     setIsLoading(true);
//     try {
//       const data = await InvoiceService.getInvoice(invoiceId);
//       setInvoice(data);

//       // Charger les factures liées au même rapport
//       if (data.report_id) {
//         const related = await InvoiceService.getInvoicesByReport(data.report_id);
//         setRelatedInvoices(related);
//       }
//     } catch (err) {
//       console.error("Erreur chargement facture", err);
//       showFlash("error", "Impossible de charger la facture.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (invoiceId) fetchInvoice();
//   }, [invoiceId]);

//   // ── Calculs ─────────────────────────────────────────────────────────────────
//   const isPaid = invoice?.payment_status === "paid";
//   const isOverdue = invoice?.payment_status === "overdue";

//   const providerName = invoice?.provider?.name ?? invoice?.provider?.company_name ?? "-";
//   const siteName = invoice?.site?.nom ?? invoice?.site?.name ?? "-";
//   const reportRef = invoice?.interventionReport?.reference ?? `Rapport #${invoice?.report_id}`;
//   const quoteRef = invoice?.quote?.reference ?? "-";

//   const pdfUrl = invoice?.pdf_path ? InvoiceService.getPdfUrl(invoice.pdf_path) : null;
//   const pdfName = invoice?.pdf_path?.split("/").pop() ?? "facture.pdf";

//   // KPIs
//   const kpis = [
//     { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
//     { label: "Site", value: siteName, delta: "", trend: "up" as const },
//     {
//       label: "Montant HT",
//       value: invoice?.amount_ht ?? 0,
//       delta: "",
//       trend: "up" as const,
//       isCurrency: true,
//     },
//     {
//       label: "Montant TTC",
//       value: invoice?.amount_ttc ?? 0,
//       delta: "",
//       trend: "up" as const,
//       isCurrency: true,
//     },
//   ];

//   return (
//     <div className="flex min-h-screen bg-gray-50">
//
//       <div className="flex-1 flex flex-col pl-64">
//         <Navbar />
//         <main className="mt-20 p-8 space-y-8">
//           {/* Flash */}
//           {flash && (
//             <div
//               className={`px-6 py-4 rounded-2xl text-sm font-semibold ${
//                 flash.type === "success"
//                   ? "bg-green-50 text-green-700 border border-green-200"
//                   : "bg-red-50 text-red-700 border border-red-200"
//               }`}
//             >
//               {flash.message}
//             </div>
//           )}

//           {/* ── Header ────────────────────────────────────────────────────── */}
//           <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
//             <div className="space-y-4">
//               <Link
//                 href="/admin/factures"
//                 className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
//               >
//                 <ChevronLeft size={18} /> Retour
//               </Link>
//               <div>
//                 <div className="flex items-center gap-4 mb-1">
//                   <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
//                     {isLoading ? "Chargement..." : invoice?.reference ?? `Facture #${invoiceId}`}
//                   </h1>
//                   {invoice && <StatusBadge status={invoice.payment_status} />}
//                 </div>
//                 <div className="flex items-center gap-2 text-slate-400 mt-1">
//                   <Briefcase size={18} />
//                   <span className="font-medium text-lg">Rapport : {reportRef}</span>
//                 </div>
//                 <div className="flex items-center gap-2 text-slate-500 mt-1">
//                   <MapPin size={15} />
//                   <span className="text-sm font-medium">{siteName}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Bloc droit - dates */}
//             <div className="flex flex-col gap-4">
//               <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
//                 <div className="flex flex-col gap-2 text-sm">
//                   <div className="flex justify-between items-center">
//                     <span className="text-slate-400 font-medium">Date facture</span>
//                     <span className="font-bold text-slate-900">{formatDate(invoice?.invoice_date)}</span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-slate-400 font-medium">Échéance</span>
//                     <span className={`font-bold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
//                       {formatDate(invoice?.due_date)}
//                     </span>
//                   </div>
//                   {isPaid && invoice?.payment_date && (
//                     <div className="flex justify-between items-center border-t border-slate-200 pt-2">
//                       <span className="text-slate-400 font-medium">Payée le</span>
//                       <span className="font-bold text-emerald-700">{formatDate(invoice.payment_date)}</span>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ── KPIs ──────────────────────────────────────────────────────── */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {kpis.map((k, i) => (
//               <StatsCard key={i} {...k} />
//             ))}
//           </div>

//           {/* ── Contenu principal ─────────────────────────────────────────── */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Colonne gauche : Flux + Montants + Rapport */}
//             <div className="lg:col-span-2 space-y-6">
//               {/* FLUX COMPLET */}
//               <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">
//                   Flux de traitement
//                 </h3>
//                 <div className="space-y-0">
//                   <FlowStep
//                     label="Rapport d'intervention"
//                     reference={reportRef}
//                     date={invoice?.interventionReport?.start_date}
//                     icon={<FileText size={18} />}
//                   />
//                   {invoice?.quote && (
//                     <FlowStep label="Devis approuvé" reference={quoteRef} icon={<CheckCircle2 size={18} />} />
//                   )}
//                   <FlowStep
//                     label="Facture générée"
//                     reference={invoice?.reference}
//                     date={invoice?.invoice_date}
//                     status={invoice?.payment_status}
//                     icon={<DollarSign size={18} />}
//                     isLast
//                   />
//                 </div>
//               </div>

//               {/* Détails financiers */}
//               <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
//                   Détails financiers
//                 </h3>
//                 <div className="border border-slate-100 rounded-2xl overflow-hidden">
//                   <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-slate-500">Montant HT</span>
//                       <span className="font-bold text-slate-900">{formatMontant(invoice?.amount_ht)}</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-slate-500">TVA (18%)</span>
//                       <span className="font-bold text-slate-900">{formatMontant(invoice?.tax_amount)}</span>
//                     </div>
//                     <div className="flex justify-between text-base border-t border-slate-200 pt-2">
//                       <span className="font-black text-slate-900">Total TTC</span>
//                       <span className="font-black text-slate-900">{formatMontant(invoice?.amount_ttc)}</span>
//                     </div>
//                   </div>
//                   {isPaid && (
//                     <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
//                       <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
//                         <CheckCircle2 size={16} />
//                         Payée le {formatDateLong(invoice?.payment_date)}
//                       </div>
//                       {invoice?.payment_method && (
//                         <p className="text-xs text-emerald-600">Mode : {invoice.payment_method}</p>
//                       )}
//                       {invoice?.payment_reference && (
//                         <p className="text-xs text-emerald-600 font-mono">Réf : {invoice.payment_reference}</p>
//                       )}
//                     </div>
//                   )}
//                   {isOverdue && (
//                     <div className="px-4 py-3 bg-red-50 border-t border-red-100">
//                       <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
//                         <AlertTriangle size={16} />
//                         Facture en retard - Échéance dépassée
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Rapport lié */}
//               {invoice?.interventionReport?.description && (
//                 <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
//                     Rapport d'intervention
//                   </h3>
//                   <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
//                     {invoice.interventionReport.description}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Colonne droite : PDF + Factures liées + Infos */}
//             <div className="space-y-6">
//               {/* PDF facture */}
//               <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
//                   Document facture
//                 </h3>
//                 {pdfUrl ? (
//                   <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
//                     <div className="flex items-center gap-3">
//                       <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
//                         <FileText size={16} className="text-red-500" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-bold text-slate-900 truncate">{pdfName}</p>
//                         <p className="text-[10px] text-slate-400">PDF</p>
//                       </div>
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => setPdfPreview({ url: pdfUrl, name: pdfName })}
//                         className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
//                       >
//                         <Eye size={13} /> Aperçu
//                       </button>
//                       <a
//                         href={pdfUrl}
//                         download
//                         target="_blank"
//                         rel="noreferrer"
//                         className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
//                       >
//                         <Download size={13} /> Télécharger
//                       </a>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
//                     <FileText size={16} className="shrink-0" />
//                     <p className="text-sm font-medium">Aucun PDF attaché</p>
//                   </div>
//                 )}
//               </div>

//               {/* Factures liées */}
//               <RelatedInvoicesList invoices={relatedInvoices} currentInvoiceId={invoiceId} />

//               {/* Infos prestataire */}
//               {invoice?.provider && (
//                 <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Prestataire</h3>
//                   <div className="space-y-2.5">
//                     {[
//                       { label: "Nom", value: providerName },
//                       { label: "Email", value: invoice.provider.email ?? "-" },
//                       { label: "Téléphone", value: invoice.provider.phone ?? "-" },
//                     ].map((f, i) => (
//                       <div
//                         key={i}
//                         className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
//                       >
//                         <span className="text-xs text-slate-400 font-medium">{f.label}</span>
//                         <span className="text-xs font-bold text-slate-900">{f.value}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </main>
//       </div>

//       {/* PDF fullscreen */}
//       {pdfPreview && (
//         <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
//       )}
//     </div>
//   );
// }