/**
 * app/admin/transferts/[id]/page.tsx
 *
 * Page de détail d'un transfert d'actif
 * ------------------------------------------------------------
 * - Affiche les informations complètes du transfert
 * - Permet la mise à jour du statut (effectué / annulé)
 * - Affiche l'historique et les métadonnées
 * - UI organisée avec layout 2/3 + 1/3 pour cohérence dashboard
 */

"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calendar,
  User,
  Hash,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Package,
  MapPin
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

import { useTransferDetail } from "../../../../hooks/admin/useTransferts";
import {
  formatTransferDate,
  getActorName
} from "../../../../services/admin/transfertService";



/* ============================================================
   STYLES DES STATUTS
   ============================================================ */

const STATUT_STYLES: Record<string, string> = {
  effectué: "bg-green-50 text-green-700 border-green-200",
  en_cours: "bg-blue-50 text-blue-700 border-blue-200",
  annulé: "bg-red-50 text-red-600 border-red-200"
};

const STATUT_LABELS: Record<string, string> = {
  effectué: "Effectué",
  en_cours: "En cours",
  annulé: "Annulé"
};

const STATUT_DOT: Record<string, string> = {
  effectué: "#22c55e",
  en_cours: "#3b82f6",
  annulé: "#ef4444"
};



/* ============================================================
   TIMELINE STEP COMPONENT
   ============================================================ */

function TimelineStep({
  icon,
  label,
  sublabel,
  active,
  done
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  active?: boolean
  done?: boolean
}) {

  return (
    <div className={`flex items-start gap-4 ${!active && !done ? "opacity-40" : ""}`}>

      <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white border-slate-200">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>

        {sublabel && (
          <p className="text-xs text-slate-400 mt-0.5">
            {sublabel}
          </p>
        )}
      </div>

    </div>
  );
}



/* ============================================================
   PAGE
   ============================================================ */

export default function TransferDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {

  const { id: idStr } = use(params);
  const id = Number(idStr);

  const router = useRouter();


  /* ============================================================
     HOOK DATA
     ============================================================ */

  const {
    transfer,
    loading,
    error,
    actionLoading,
    handleUpdateStatus,
    refresh
  } = useTransferDetail(id);



  /* ============================================================
     LOADING STATE
     ============================================================ */

  if (loading) {

    return (
      <div className="flex min-h-screen bg-gray-50">

        <Sidebar />

        <div className="flex flex-col flex-1 pl-64">

          <Navbar />

          <main className="mt-20 p-8 space-y-6 animate-pulse">

            <div className="h-8 w-48 bg-slate-200 rounded-xl" />

            <div className="h-40 bg-white rounded-3xl border border-slate-100" />

            <div className="grid grid-cols-3 gap-6">
              <div className="h-64 bg-white rounded-3xl border border-slate-100" />
              <div className="h-64 bg-white rounded-3xl border border-slate-100" />
              <div className="h-64 bg-white rounded-3xl border border-slate-100" />
            </div>

          </main>

        </div>

      </div>
    );
  }



  /* ============================================================
     ERROR STATE
     ============================================================ */

  if (error || !transfer) {

    return (
      <div className="flex min-h-screen bg-gray-50">

        <Sidebar />

        <div className="flex flex-col flex-1 pl-64">

          <Navbar />

          <main className="mt-20 p-8">

            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm mb-6">

              <AlertCircle size={16} />

              <span>
                {error || "Transfert introuvable"}
              </span>

              <button
                onClick={refresh}
                className="ml-auto flex items-center gap-2 text-xs font-bold underline"
              >
                <RefreshCw size={12} />
                Réessayer
              </button>

            </div>

            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-slate-500"
            >
              <ArrowLeft size={15} />
              Retour
            </button>

          </main>

        </div>

      </div>
    );
  }



  /* ============================================================
     DATA EXTRACTION
     ============================================================ */

  const assetDesig =
    transfer.asset?.designation ??
    `Actif #${transfer.company_asset_id}`;

  const assetCode = transfer.asset?.codification ?? "";
  const assetType = transfer.asset?.type ?? "";

  const siteFrom =
    transfer.fromSite?.nom ??
    `Site #${transfer.from_site_id}`;

  const siteTo =
    transfer.toSite?.nom ??
    `Site #${transfer.to_site_id}`;

  const actorName = getActorName(transfer.actor);

  const isCompleted = transfer.status === "effectué";
  const isCancelled = transfer.status === "annulé";
  const isPending = transfer.status === "en_cours";



  /* ============================================================
     UI
     ============================================================ */

  return (

    <div className="flex min-h-screen bg-gray-50">

      <Sidebar />

      <div className="flex flex-col flex-1 pl-64">

        <Navbar />

        <main className="mt-20 p-8 space-y-8">


          {/* ======================================================
             BOUTON RETOUR
             ====================================================== */}

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-100 text-sm font-medium transition"
          >
            <ArrowLeft size={16} />
            Retour aux transferts
          </button>



          {/* ======================================================
             HEADER IDENTITÉ DU TRANSFERT
             ====================================================== */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

            <div className="flex flex-col md:flex-row md:justify-between gap-6">

              {/* Informations principales */}

              <div className="space-y-3">

                <div className="flex items-center gap-3 flex-wrap">

                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">
                    #{transfer.id}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUT_STYLES[transfer.status]}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: STATUT_DOT[transfer.status] }}
                    />

                    {STATUT_LABELS[transfer.status]}

                  </span>

                </div>


                <h1 className="text-3xl font-black text-slate-900">
                  {assetDesig}
                </h1>


                <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">

                  {assetCode && (
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold">
                      {assetCode}
                    </span>
                  )}

                  {assetType && (
                    <span className="flex items-center gap-1">
                      <Package size={13} />
                      {assetType}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Building2 size={13} />
                    {siteFrom}
                  </span>

                  <span className="flex items-center gap-1">
                    <ArrowRightLeft size={13} />
                    {siteTo}
                  </span>

                </div>

              </div>



              {/* Actions */}

              <div className="flex flex-col gap-2">

                <Link
                  href={`/admin/patrimoines/${transfer.company_asset_id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Package size={14} />
                  Voir l'actif
                </Link>


                {isPending && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus("effectué")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold"
                    >
                      <CheckCircle2 size={14} />
                      Marquer effectué
                    </button>

                    <button
                      onClick={() => handleUpdateStatus("annulé")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold"
                    >
                      <XCircle size={14} />
                      Annuler
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>



          {/* ======================================================
             GRID PRINCIPAL
             ====================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


            {/* CONTENU PRINCIPAL */}

            <div className="xl:col-span-2 space-y-6">


              {/* TRAJET */}

              <div className="bg-white rounded-3xl border border-slate-100 p-6">

                <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                  Trajet
                </h2>

                <div className="flex items-center gap-4 text-sm">

                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {siteFrom}
                  </span>

                  <ArrowRightLeft size={14} />

                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {siteTo}
                  </span>

                </div>

              </div>



              {/* INFORMATIONS */}

              <div className="bg-white rounded-3xl border border-slate-100 p-6">

                <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                  Informations
                </h2>

                <div className="grid grid-cols-2 gap-6 text-sm">

                  <div className="flex items-center gap-2">
                    <Hash size={14} />
                    ID Actif : {transfer.company_asset_id}
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={14} />
                    Initié par : {actorName}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    Date transfert : {formatTransferDate(transfer.transfer_date)}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    Créé le : {formatTransferDate(transfer.created_at)}
                  </div>

                </div>

              </div>



              {/* MOTIF */}

              {transfer.reason && (

                <div className="bg-white rounded-3xl border border-slate-100 p-6">

                  <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={14} />
                    Motif du transfert
                  </h2>

                  <div className="bg-slate-50 rounded-xl p-4 text-sm italic">
                    {transfer.reason}
                  </div>

                </div>

              )}

            </div>



            {/* SIDEBAR */}

            <div className="space-y-6">


              {/* TIMELINE */}

              <div className="bg-white rounded-3xl border border-slate-100 p-6">

                <h2 className="text-sm font-black uppercase tracking-widest mb-4">
                  Historique
                </h2>

                <div className="space-y-4">

                  <TimelineStep
                    icon={<Calendar size={14} />}
                    label="Création du transfert"
                    sublabel={formatTransferDate(transfer.created_at)}
                    done
                  />

                  <TimelineStep
                    icon={<ArrowRightLeft size={14} />}
                    label="Transfert effectué"
                    active={isCompleted}
                  />

                </div>

              </div>


              {/* RÉSUMÉ */}

              <div
                className={`rounded-3xl p-6 border ${
                  isCompleted
                    ? "bg-green-50 border-green-100"
                    : isCancelled
                    ? "bg-red-50 border-red-100"
                    : "bg-blue-50 border-blue-100"
                }`}
              >

                <p className="text-sm font-bold">

                  {isCompleted && "Le transfert a été effectué."}
                  {isCancelled && "Le transfert a été annulé."}
                  {isPending && "Le transfert est en attente."}

                </p>

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>

  );

}