"use client";

interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartCardProps {
  title: string;
  data: DonutItem[];
}

export default function DonutChartCard({ title, data = [] }: DonutChartCardProps) {
  // Calcul du total avec sécurité si une valeur est absente
  const total = data.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  // Pré-calcul des segments pour éviter la logique complexe dans le JSX et les erreurs de typage
  let currentOffset = 0;
  const segments = total > 0 ? data.map((item, i) => {
    const value = Number(item.value) || 0;
    const length = (value / total) * 100;
    const start = currentOffset;
    currentOffset += length;

    return {
      key: i,
      length,
      start,
      color: item.color
    };
  }) : [];

  // Pré-calcul des séparateurs
  currentOffset = 0;
  const separators = total > 0 && data.length > 1 ? data.map((item, i) => {
    const value = Number(item.value) || 0;
    const length = (value / total) * 100;
    const start = currentOffset;
    currentOffset += length;

    return {
      key: `sep-${i}`,
      start: start
    };
  }) : [];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 md:p-8 h-full flex flex-col min-w-0">
      <h3 className="font-bold text-slate-800 text-lg mb-6 leading-tight truncate">
        {title}
      </h3>

      <div className="flex flex-1 items-center justify-start gap-4 md:gap-6 min-w-0 overflow-hidden">
        
        {/* Graphique SVG */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {total === 0 ? (
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="5"
              />
            ) : (
              <>
                {segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="5"
                    strokeDasharray={`${seg.length} ${100 - seg.length}`}
                    strokeDashoffset={100 - seg.start}
                    className="transition-all duration-700 ease-out"
                  />
                ))}
                {separators.map((sep) => (
                  <circle
                    key={sep.key}
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="white"
                    strokeWidth="5.5"
                    strokeDasharray="0.6 99.4"
                    strokeDashoffset={100 - sep.start}
                  />
                ))}
              </>
            )}
          </svg>
        </div>

        {/* Légende */}
        <div className="flex-1 min-w-0 space-y-3">
          {data.map((item) => (
            <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-2 group">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span 
                  className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {Number(item.value) || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}