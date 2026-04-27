"use client";

import { useState } from "react";

interface DataPoint {
  label?: string;
  value?: number;
  // formats alternatifs acceptés
  mois?: number;
  annee?: number;
  total?: number;
}

interface LineChartCardProps {
  title: string;
  data: DataPoint[];
  tooltipSuffix?: string; // ex: "équipements", "tickets"
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/** Formate un entier en version courte lisible */
function fmtShort(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(v));
}

/** Calcule un pas "propre" pour l'axe Y */
function niceScale(maxVal: number, steps = 5): { step: number; max: number } {
  if (maxVal <= 0) return { step: 1, max: steps };
  const raw = maxVal / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.ceil(raw / mag) * mag;
  return { step, max: step * steps };
}

export default function LineChartCard({
  title,
  data,
  tooltipSuffix = "éléments",
}: LineChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const SVG_W = 800;
  const SVG_H = 200;
  const PAD_T = 20;
  const PAD_B = 0;

  // ── Normalisation des données ──────────────────────────────────────────────
  let points: { label: string; value: number }[];

  const hasMois = data.length > 0 && "mois" in data[0] && data[0].mois != null;

  if (hasMois) {
    // Format back : { mois, annee, total }
    const map: Record<number, number> = {};
    data.forEach(d => {
      if (d.mois != null) map[d.mois] = Math.round(Number(d.total ?? d.value ?? 0));
    });
    // Affiche seulement les mois présents dans les données (pas les 12)
    const months = data
      .filter(d => d.mois != null)
      .sort((a, b) => (a.annee ?? 0) * 12 + (a.mois ?? 0) - ((b.annee ?? 0) * 12 + (b.mois ?? 0)));
    points = months.map(d => ({
      label: MOIS_LABELS[(d.mois! - 1) % 12],
      value: Math.round(Number(d.total ?? d.value ?? 0)),
    }));
  } else {
    // Format direct : { label, value } ou { label, total }
    points = data.map(d => ({
      label: d.label ?? "",
      value: Math.round(Number(d.value ?? d.total ?? 0)),
    }));
  }

  // Fallback si vide
  if (points.length === 0) {
    points = MOIS_LABELS.slice(0, 3).map(l => ({ label: l, value: 0 }));
  }
  // Besoin d'au moins 2 points pour tracer une ligne
  if (points.length === 1) points = [...points, { ...points[0] }];

  const values = points.map(p => p.value);
  const maxVal = Math.max(...values, 1);
  const { step, max: niceMax } = niceScale(maxVal);

  // Labels axe Y (haut → bas)
  const Y_STEPS = 5;
  const yLabels = Array.from({ length: Y_STEPS + 1 }, (_, i) =>
    Math.round(niceMax - i * step)
  );

  const toY = (v: number) =>
    SVG_H - PAD_B - (v / niceMax) * (SVG_H - PAD_T - PAD_B);

  const svgPoints = points.map((p, i) => ({
    x: (i / (points.length - 1)) * SVG_W,
    y: toY(p.value),
    value: p.value,
    label: p.label,
  }));

  const gridLines = yLabels.map(v => toY(v));

  const pathD = svgPoints.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const cpx = arr[i - 1].x + (p.x - arr[i - 1].x) / 2;
    return `${acc} C ${cpx},${arr[i - 1].y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, "");

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 h-full flex flex-col">
      <h3 className="text-[17px] font-semibold text-slate-500 mb-8 uppercase tracking-tight">
        {title}
      </h3>

      <div className="relative flex-1 flex">
        {/* Axe Y */}
        <div className="flex flex-col justify-between text-[11px] font-bold text-slate-300 pr-4 pb-8 min-w-[36px] text-right">
          {yLabels.map((v, i) => (
            <span key={i}>{fmtShort(v)}</span>
          ))}
        </div>

        <div className="relative flex-1 flex flex-col">
          <div className="relative w-full h-[220px]">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Grille */}
              {gridLines.map((yPos, i) => (
                <line key={i} x1="0" y1={yPos} x2={SVG_W} y2={yPos}
                  stroke="#F1F5F9" strokeWidth="1.5" />
              ))}

              {/* Courbe */}
              <path d={pathD} fill="none" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />

              {/* Points interactifs */}
              {svgPoints.map((p, i) => (
                <g key={i}>
                  {/* Zone hover */}
                  <circle cx={p.x} cy={p.y} r="18" fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Point visible */}
                  <circle cx={p.x} cy={p.y}
                    r={hoveredIndex === i ? 7 : 5}
                    fill="white"
                    stroke={hoveredIndex === i ? "#0F172A" : "#CBD5E1"}
                    strokeWidth={hoveredIndex === i ? 3 : 2}
                    style={{ transition: "all 0.15s ease", pointerEvents: "none" }}
                  />

                  {/* Tooltip */}
                  {hoveredIndex === i && (
                    <>
                      <line x1={p.x} y1={p.y} x2={p.x} y2={SVG_H}
                        stroke="#6366F1" strokeDasharray="4 4" strokeWidth="2"
                        style={{ pointerEvents: "none" }}
                      />
                      <foreignObject
                        x={p.x - 60}
                        y={p.y - 62}
                        width="120"
                        height="48"
                        style={{ pointerEvents: "none", overflow: "visible" }}
                      >
                        <div className="bg-slate-900 text-white rounded-xl py-2 px-3 shadow-2xl text-center">
                          <div className="text-[15px] font-black leading-tight">{fmtShort(p.value)}</div>
                          <div className="text-[10px] text-slate-400 font-medium leading-tight">{tooltipSuffix}</div>
                        </div>
                      </foreignObject>
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Axe X */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t-2 border-slate-100">
            {points.map((p, i) => (
              <span key={i} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
