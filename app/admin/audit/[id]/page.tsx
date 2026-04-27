"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Activity, Clock, Hash, User,
  CheckCircle2, Pencil, Trash2, RefreshCw, Loader2,
} from "lucide-react";
import axiosInstance from "../../../../core/axios";
import Navbar from "@/components/Navbar";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  updated: "bg-blue-50 text-blue-700 border border-blue-100",
  deleted: "bg-red-50 text-red-700 border border-red-100",
  approved: "bg-violet-50 text-violet-700 border border-violet-100",
  rejected: "bg-rose-50 text-rose-700 border border-rose-100",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created:  <CheckCircle2 size={12} />,
  updated:  <Pencil size={12} />,
  deleted:  <Trash2 size={12} />,
  approved: <CheckCircle2 size={12} />,
  rejected: <RefreshCw size={12} />,
};

export default function AuditUserDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const userId   = params.id as string;

  const [user,    setUser]    = useState<any>(null);
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [meta,    setMeta]    = useState({ last_page: 1, total: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/activity-log", {
        params: { user_id: userId, per_page: 20, page },
      });
      const d = res.data?.data ?? res.data;
      const items: any[] = d.data ?? [];
      setLogs(items);
      setMeta({ last_page: d.last_page ?? 1, total: d.total ?? 0 });
      // Extraire les infos user depuis le premier log
      if (items.length > 0 && items[0].user) {
        setUser(items[0].user);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId, page]);

  const userName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.name || user.email || `Utilisateur #${userId}`
    : `Utilisateur #${userId}`;

  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="mt-20 p-8 space-y-8 max-w-5xl mx-auto w-full">

        {/* Retour */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-black transition text-sm font-medium bg-white px-4 py-2 rounded-xl border border-slate-100"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Header utilisateur */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-black">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{userName}</h1>
            {user?.email && (
              <a href={`mailto:${user.email}`} className="text-sm text-slate-500 hover:underline">{user.email}</a>
            )}
            <p className="text-xs text-slate-400 mt-1">{meta.total} action{meta.total > 1 ? "s" : ""} enregistrée{meta.total > 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Timeline des actions */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <h3 className="font-black text-slate-900">Journal d'activité horodaté</h3>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm italic">
              Aucune activité enregistrée pour cet utilisateur.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition group">
                  {/* Icône action */}
                  <div className={`mt-0.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${ACTION_STYLES[log.action] ?? "bg-slate-50 text-slate-700 border border-slate-100"}`}>
                    {ACTION_ICONS[log.action] ?? <Activity size={12} />}
                    {log.action}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">
                      {log.description || `${log.model_type?.split("\\").pop()} #${log.model_id}`}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Hash size={10} />
                        {log.model_type?.split("\\").pop() ?? "Entité"} #{log.model_id}
                      </span>
                      {log.ip_address && (
                        <span className="text-[10px] text-slate-400 font-mono">IP: {log.ip_address}</span>
                      )}
                    </div>
                  </div>

                  {/* Date horodatée */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-700">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">{meta.total} actions · Page {page}/{meta.last_page}</p>
              <Paginate currentPage={page} totalPages={meta.last_page} onPageChange={setPage} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
