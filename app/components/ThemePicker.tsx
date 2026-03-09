"use client";

import { Check, Zap } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { THEME_COLORS } from "../../lib/theme-config";

export default function ThemePicker() {
  const { theme, setThemeColor } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Thème de couleur
        </p>
        <span className="text-xs text-slate-500 font-medium">
          {THEME_COLORS.find(t => t.id === theme.color)?.label}
        </span>
      </div>

      <div className="space-y-3">
        {THEME_COLORS.map(themeConfig => {
          const active = theme.color === themeConfig.id;
          return (
            <button
              key={themeConfig.id}
              onClick={() => setThemeColor(themeConfig.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                active 
                  ? "border-slate-900 bg-slate-50 shadow-sm" 
                  : "border-slate-100 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Preview couleurs */}
              <div className="flex gap-1.5 shrink-0">
                <div 
                  className="w-10 h-10 rounded-xl shadow-sm" 
                  style={{ backgroundColor: themeConfig.preview.primary }}
                />
                <div className="flex flex-col gap-1">
                  <div 
                    className="w-6 h-[18px] rounded-md" 
                    style={{ backgroundColor: themeConfig.preview.light }}
                  />
                  <div 
                    className="w-6 h-[18px] rounded-md" 
                    style={{ backgroundColor: themeConfig.preview.bg }}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <p className={`font-black text-sm flex items-center gap-2 ${active ? "text-slate-900" : "text-slate-700"}`}>
                  <span className="text-base">{themeConfig.icon}</span>
                  {themeConfig.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{themeConfig.description}</p>
              </div>

              {/* Badge actif */}
              {active && (
                <span className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-black shrink-0">
                  <Check size={10} /> Actif
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Zap size={14} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 mb-1">Application instantanée</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Le thème s'applique immédiatement à toute l'interface et est sauvegardé automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
