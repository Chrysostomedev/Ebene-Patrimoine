import Link from "next/link";
import { Calendar, MapPin, ChevronRight, Clock, Zap } from "lucide-react";
import { Intervention } from "../../services/provider/providerDashboardService";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(isoDate: string): { day: string; time: string } {
  const date = new Date(isoDate);
  const now  = new Date();

  const isToday =
    date.getDate()     === now.getDate()  &&
    date.getMonth()    === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate()     === tomorrow.getDate()  &&
    date.getMonth()    === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const day = isToday
    ? "Aujourd'hui"
    : isTomorrow
    ? "Demain"
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return { day, time };
}

function getStatusConfig(status?: string): { dot: string; badge: string; label: string } {
  switch (status?.toLowerCase()) {
    case "en_cours":
    case "en cours":
      return { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-600 border-orange-200", label: "En cours" };
    case "planifié":
    case "planifie":
      return { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-600 border-blue-200", label: "Planifié" };
    case "terminé":
    case "termine":
      return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Terminé" };
    default:
      return { dot: "bg-gray-800", badge: "bg-gray-50 text-gray-600 border-gray-200", label: status ?? "Planifié" };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-2 w-2 rounded-full bg-gray-200" />
        <div className="h-4 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-3.5 w-3/4 bg-gray-200 rounded-full" />
      <div className="h-3 w-1/2 bg-gray-100 rounded-full" />
      <div className="h-3 w-2/5 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  interventions?: Intervention[]; // ← optionnel, défaut tableau vide
  loading?: boolean;
  viewAllHref?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function EventListCard({
  interventions = [], // ← FIX : défaut [] si undefined
  loading = false,
  viewAllHref = "#",
}: Props) {

  const isEmpty = !loading && interventions.length === 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <Zap size={13} className="text-gray-400" fill="currentColor" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Prochaines interventions
            </h2>
            {!loading && !isEmpty && (
              <p className="text-xs text-gray-400 mt-0.5">
                {interventions.length} intervention{interventions.length > 1 ? "s" : ""} planifiée{interventions.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900
                     font-semibold transition-colors group px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          Voir tout
          <ChevronRight size={13} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div className="p-5">

        {/* Vide */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <Calendar size={22} strokeWidth={1.5} className="opacity-50" />
            </div>
            <p className="text-sm font-medium text-gray-500">Aucune intervention planifiée</p>
            <p className="text-xs text-gray-400 mt-1">Les prochaines interventions apparaîtront ici</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Skeletons */}
          {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

          {/* Cards */}
          {!loading && interventions.map((intervention) => {
            const { day, time } = formatDateTime(intervention.date_debut);
            const { dot, badge, label } = getStatusConfig(intervention.status);
            const isToday = day === "Aujourd'hui";

            return (
              <div
                key={intervention.id}
                className={`
                  relative rounded-2xl border bg-white p-5
                  hover:shadow-md hover:-translate-y-0.5
                  transition-all duration-200 cursor-pointer overflow-hidden
                  ${isToday ? "border-gray-300" : "border-gray-100"}
                `}
              >
                {/* Barre accent gauche si aujourd'hui */}
                {isToday && (
                  <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gray-900 rounded-full" />
                )}

                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-3 pl-1">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                      {intervention.title ?? intervention.description ?? `Intervention #${intervention.id}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>
                    {label}
                  </span>
                </div>

                {/* Date + heure */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 pl-1">
                  <Clock size={11} strokeWidth={2} />
                  <span>
                    <span className={`font-semibold ${isToday ? "text-gray-900" : "text-gray-700"}`}>
                      {day}
                    </span>
                    {" "}à {time}
                  </span>
                </div>

                {/* Lieu */}
                {(intervention.site || intervention.location) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-1">
                    <MapPin size={11} strokeWidth={2} />
                    <span className="uppercase tracking-wide truncate font-medium">
                      {intervention.site ?? intervention.location}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}