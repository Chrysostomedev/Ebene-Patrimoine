"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Clock, User, FileText, Search,
  Loader2, ArrowUpRight, Hash,
} from "lucide-react";
import axiosInstance from "../../../core/axios";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  created:  "bg-emerald-50 text-emerald-700",
  updated:  "bg-blue-50 text-blue-700",
  deleted:  "bg-red-50 text-red-700",
  approved: "bg-violet-50 text-violet-700",
  rejected: "bg-rose-50 text-rose-700",
};

export default function AuditPage() {
  const router = useRouter();

  const [logs,        setLogs]        = useState<any[]>([]);
  const [stats,       setStats]       = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [meta,        setMeta]        = useState({ last_page: 1, total: 0 });
  const [modelFilter, setModelFilter] = useState("");

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/admin/activity-log/stats");
      setStats(res.data?.data ?? res.data);
    } catch {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/activity-log", {
        params: { page, per_page: 20, ...(modelFilter ? { model: modelFilter } : {}) },
      });
      const d = res.data?.data ?? res.data;
      setLogs(d.data ?? []);
      setMeta({ last_page: d.last_page ?? 1, total: d.total ?? 0 });
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLogs(); }, [page, modelFilter]);

  const kpis = [
    { label: "Total actions",  value: stats?.total_actions ?? 0, icon: <Activity size={18} /> },
    { label: "Dernières 24h",  value: stats?.last_24h ?? 0,      icon: <Clock size={18} /> },
    { label: "Top utilisateur", value: stats?.top_users?.[0]?.user ? `${stats.top_users[0].user.first_name ?? ""} ${stats.top_users[0].user.last_name ?? ""}`.trim() || stats.top_users[0].user.email || "N/A" : "N/A", icon: <User size={18} /> },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="mt-20 p-8 space-y-8">
        <PageHeader title=" Traçabilité" subtitle="Traçabilité complète des actions effectuées sur la plateforme" />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                {k.icon}
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top utilisateurs */}
        {stats?.top_users?.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Top utilisateurs actifs</h3>
            <div className="flex flex-wrap gap-3">
              {stats.top_users.map((u: any, i: number) => {
                const name = u.user ? `${u.user.first_name ?? ""} ${u.user.last_name ?? ""}`.trim() || u.user.email || `#${u.user_id}` : `#${u.user_id}`;
                const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <button
                    key={i}
                    onClick={() => router.push(`/admin/audit/${u.user_id}`)}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-black">{initials}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">{name}</p>
                      <p className="text-[10px] text-slate-400">{u.total} actions</p>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-700 transition ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Journal */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <Activity size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-slate-900">Journal d'activité</h3>
                <p className="text-xs text-slate-400">{meta.total} événements</p>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer par modèle..."
                value={modelFilter}
                onChange={e => { setModelFilter(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all w-48"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm italic">Aucun log trouvé.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log, i) => {
                const userName = log.user
                  ? `${log.user.first_name ?? ""} ${log.user.last_name ?? ""}`.trim() || log.user.email || "Système"
                  : "Système";
                const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "SY";
                return (
                  <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition group">
                    {/* Avatar utilisateur */}
                    <button
                      onClick={() => log.user_id && router.push(`/admin/audit/${log.user_id}`)}
                      className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 hover:opacity-80 transition"
                      title={`Voir les actions de ${userName}`}
                    >
                      <span className="text-white text-[10px] font-black">{initials}</span>
                    </button>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{userName}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${ACTION_STYLES[log.action] ?? "bg-slate-50 text-slate-700"}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-500 font-medium truncate">
                          {log.description || `${log.model_type?.split("\\").pop()} #${log.model_id}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Hash size={10} /> {log.model_type?.split("\\").pop()}
                        </span>
                      </div>
                    </div>

                    {/* Date + lien détail */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs font-bold text-slate-700">
                        {formatDate(log.created_at)}
                      </p>
                      {log.user_id && (
                        <button
                          onClick={() => router.push(`/admin/audit/${log.user_id}`)}
                          className="text-[10px] text-slate-400 hover:text-slate-900 flex items-center gap-0.5 transition"
                        >
                          Détails <ArrowUpRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">Page {page}/{meta.last_page} · {meta.total} événements</p>
              <Paginate currentPage={page} totalPages={meta.last_page} onPageChange={setPage} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
