"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, ChevronRight, MessageSquare } from "lucide-react";

export interface AssetResult {
  asset_id: number;
  status: "RAS" | "OBSERVATION" | "ANOMALIE";
  comment: string;
}

interface Asset {
  id: number;
  designation: string;
  codification: string;
}

interface AssetChecklistProps {
  assets: Asset[];
  onChange: (results: AssetResult[]) => void;
  initialResults?: AssetResult[];
}

export default function AssetChecklist({ assets, onChange, initialResults }: AssetChecklistProps) {
  const [results, setResults] = useState<Record<number, AssetResult>>({});

  useEffect(() => {
    // Initialisation
    const initial: Record<number, AssetResult> = {};
    assets.forEach(asset => {
      const existing = initialResults?.find(r => r.asset_id === asset.id);
      initial[asset.id] = existing || {
        asset_id: asset.id,
        status: "RAS",
        comment: ""
      };
    });
    setResults(initial);
  }, [assets, initialResults]);

  const updateResult = (assetId: number, update: Partial<AssetResult>) => {
    const newResults = {
      ...results,
      [assetId]: { ...results[assetId], ...update }
    };
    setResults(newResults);
    onChange(Object.values(newResults));
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <Info className="mx-auto text-slate-400 mb-2" size={24} />
        <p className="text-sm text-slate-500 font-medium">Aucun équipement trouvé pour ce site.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Checklist des Équipements</h3>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
          {assets.length} Équipement{assets.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {assets.map((asset) => {
          const result = results[asset.id] || { status: "RAS", comment: "" };
          const needsComment = result.status !== "RAS";

          return (
            <div 
              key={asset.id} 
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                result.status === "ANOMALIE" ? "bg-red-50/30 border-red-100 shadow-sm shadow-red-50" :
                result.status === "OBSERVATION" ? "bg-amber-50/30 border-amber-100 shadow-sm shadow-amber-50" :
                "bg-white border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    result.status === "ANOMALIE" ? "bg-red-500 text-white" :
                    result.status === "OBSERVATION" ? "bg-amber-500 text-white" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {result.status === "RAS" && <CheckCircle2 size={16} />}
                    {result.status === "OBSERVATION" && <Info size={16} />}
                    {result.status === "ANOMALIE" && <AlertCircle size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{asset.designation}</p>
                    <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">{asset.codification}</p>
                  </div>
                </div>

                <div className="flex items-center bg-slate-100/50 p-1 rounded-xl shrink-0 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => updateResult(asset.id, { status: "RAS" })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${
                      result.status === "RAS" 
                        ? "bg-white text-emerald-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CheckCircle2 size={12} /> RAS
                  </button>
                  <button
                    type="button"
                    onClick={() => updateResult(asset.id, { status: "OBSERVATION" })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${
                      result.status === "OBSERVATION" 
                        ? "bg-white text-amber-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Info size={12} /> OBSERVATION
                  </button>
                  <button
                    type="button"
                    onClick={() => updateResult(asset.id, { status: "ANOMALIE" })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${
                      result.status === "ANOMALIE" 
                        ? "bg-white text-red-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <AlertCircle size={12} /> ANOMALIE
                  </button>
                </div>
              </div>

              {needsComment && (
                <div className="mt-4 pt-4 border-t border-slate-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={12} className={result.status === "ANOMALIE" ? "text-red-400" : "text-amber-400"} />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {result.status === "ANOMALIE" ? "Description de l'anomalie" : "Commentaire / Observation"}
                    </label>
                  </div>
                  <textarea
                    value={result.comment}
                    onChange={(e) => updateResult(asset.id, { comment: e.target.value })}
                    placeholder={result.status === "ANOMALIE" ? "Décrivez l'anomalie détectée..." : "Détaillez votre observation..."}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all focus:ring-2 outline-none min-h-[80px] ${
                      result.status === "ANOMALIE" 
                        ? "bg-white border-red-100 focus:ring-red-500/20 focus:border-red-500 text-red-900 placeholder:text-red-300" 
                        : "bg-white border-amber-100 focus:ring-amber-500/20 focus:border-amber-500 text-amber-900 placeholder:text-amber-300"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
