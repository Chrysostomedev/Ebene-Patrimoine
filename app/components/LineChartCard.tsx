"use client";

import { useState } from "react";

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

interface LineChartCardProps {
  title: string;
  data: { label?: string; value?: number; annee?: number; mois?: number; total?: number }[];
}

export default function LineChartCard({ title, data }: LineChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 200;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 0;

  const isApiFormat = data.length > 0 && "mois" in data[0];

  let normalizedData: { label: string; value: number }[];

  if (isApiFormat) {
    const map: Record<number, number> = {};
    data.forEach(d => { if (d.mois && d.total !== undefined) map[d.mois] = d.total; });
    normalizedData = MOIS_LABELS.map((label, i) => ({
      label,
      value: map[i + 1] ?? 0,
    }));
  } else {
    normalizedData = data.map(d => ({ label: d.label ?? "", value: d.value ?? 0 }));
  }

  const values = normalizedData.map(d => d.value);
  const maxValue = Math.max(...values, 1);

  // Graduation Y propre : on veut 5 paliers arrondis lisibles
  const rawStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const niceMax = niceStep * 5;

  const ySteps = 5;
  // Labels de haut en bas : niceMax → 0
  const yAxisLabels = Array.from({ length: ySteps + 1 }, (_, i) =>
    niceMax - i * niceStep
  );

  // Mapping Y : value=0 → y=SVG_HEIGHT-PADDING_BOTTOM, value=niceMax → y=PADDING_TOP
  const toY = (value: number) =>
    SVG_HEIGHT - PADDING_BOTTOM - (value / niceMax) * (SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

  const points = normalizedData.map((d, i) => ({
    x: (i / (normalizedData.length - 1)) * SVG_WIDTH,
    y: toY(d.value),
    value: d.value,
    label: d.label,
  }));

  // Lignes de grille alignées sur les vraies valeurs Y
  const gridLines = yAxisLabels.map(v => toY(v));

  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const cp1x = arr[i - 1].x + (p.x - arr[i - 1].x) / 2;
    return `${acc} C ${cp1x},${arr[i - 1].y} ${cp1x},${p.y} ${p.x},${p.y}`;
  }, "");

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString();

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 h-full flex flex-col">
      <h3 className="text-[17px] font-semibold text-slate-500 mb-8 uppercase tracking-tight">
        {title}
      </h3>

      <div className="relative flex-1 flex">
        {/* Axe Y */}
        <div className="flex flex-col justify-between text-[11px] font-bold text-slate-300 pr-4 pb-8">
          {yAxisLabels.map((label) => (
            <span key={label}>
              {label >= 1000 ? `${Math.round(label / 1000)}K` : label}
            </span>
          ))}
        </div>

        <div className="relative flex-1 flex flex-col">
          <div className="relative w-full h-[220px]">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Lignes de grille alignées sur les vraies valeurs */}
              {gridLines.map((yPos, i) => (
                <line
                  key={i}
                  x1="0" y1={yPos}
                  x2={SVG_WIDTH} y2={yPos}
                  stroke="#F1F5F9"
                  strokeWidth="1.5"
                />
              ))}

              {/* Courbe */}
              <path
                d={pathD}
                fill="none"
                stroke="green"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Points interactifs */}
              {points.map((p, i) => (
                <g key={i}>
                  {/* Zone de hover invisible plus large */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="18"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Point visible */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 7 : 5}
                    fill="white"
                    stroke={hoveredIndex === i ? "#0F172A" : "#CBD5E1"}
                    strokeWidth={hoveredIndex === i ? 3 : 2}
                    style={{ transition: "all 0.15s ease", pointerEvents: "none" }}
                  />

                  {/* Tooltip au survol */}
                  {hoveredIndex === i && p.value > 0 && (
                    <>
                      <line
                        x1={p.x} y1={p.y}
                        x2={p.x} y2={SVG_HEIGHT}
                        stroke="#6366F1"
                        strokeDasharray="4 4"
                        strokeWidth="2"
                        style={{ pointerEvents: "none" }}
                      />
                      <foreignObject
                        x={p.x - 45}
                        y={p.y - 52}
                        width="90"
                        height="36"
                        style={{ pointerEvents: "none", overflow: "visible" }}
                      >
                        <div className="bg-theme-primary text-white text-[13px] font-black rounded-xl py-1.5 shadow-2xl text-center">
                          {formatValue(p.value)}
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
            {normalizedData.map(d => (
              <span key={d.label} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}