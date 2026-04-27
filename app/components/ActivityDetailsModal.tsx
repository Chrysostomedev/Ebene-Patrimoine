"use client";

import React from "react";
import { X, Clock, User, Activity, Globe, Info, Database } from "lucide-react";
import { ActivityLog } from "../../hooks/common/useActivityLogs";

interface ActivityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: ActivityLog | null;
}

export default function ActivityDetailsModal({ isOpen, onClose, log }: ActivityDetailsModalProps) {
  if (!isOpen || !log) return null;

  const initial = (log.user?.first_name?.[0] || log.user?.email?.[0] || "A").toUpperCase();
  const dateStr = log.created_at 
    ? new Intl.DateTimeFormat("fr-FR", { 
        weekday: "long", day: "numeric", month: "long", year: "numeric", 
        hour: "2-digit", minute: "2-digit" 
      }).format(new Date(log.created_at)) 
    : "-";

  const renderProperties = (props: any) => {
    if (!props || (typeof props === "object" && Object.keys(props).length === 0)) {
        return <p className="text-xs text-slate-400 italic">Aucune donnée supplémentaire.</p>;
    }

    if (typeof props !== "object") {
        return <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(props, null, 2)}</pre>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(props).map(([key, value]) => (
          <div key={key} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{key}</span>
            <span className="text-xs font-semibold text-slate-700 max-w-[70%] text-right truncate">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] animate-in fade-in" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-full max-w-[500px] bg-white z-[10001] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-900 rounded-xl">
                <Activity size={20} className="text-white" />
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Détails de l'activité</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Référence #{log.id}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* User Info */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
              <User size={12} /> Auteur de l'action
            </h3>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-lg">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {log.user?.first_name ? `${log.user.first_name} ${log.user.last_name || ""}` : log.user?.email || "Utilisateur"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{log.user?.email || "Email non renseigné"}</p>
              </div>
            </div>
          </section>

          {/* Action Details */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
              <Info size={12} /> Description de l'action
            </h3>
            <div className="space-y-4 px-1">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">Type d'action</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase">
                   {log.action}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">Détails</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{log.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">Date & Heure</p>
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> {dateStr}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">Adresse IP</p>
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Globe size={12} className="text-slate-400" /> {log.ip_address || "Interne"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Scope */}
          <section className="space-y-4">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
               <Database size={12} /> Données Techniques
             </h3>
             <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                {renderProperties(log.properties)}
             </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
           >
             Fermer les détails
           </button>
        </div>
      </div>
    </>
  );
}
