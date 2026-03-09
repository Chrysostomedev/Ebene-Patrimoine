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

export default function DonutChartCard({ title, data }: DonutChartCardProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 md:p-8 h-full flex flex-col min-w-0">
      <h3 className="font-bold text-slate-800 text-lg mb-6 leading-tight truncate">
        {title}
      </h3>

      {/* On réduit le gap et on s'assure que les éléments ne peuvent pas dépasser */}
      <div className="flex flex-1 items-center justify-start gap-4 md:gap-6 min-w-0 overflow-hidden">
        
        {/* Graphique : Taille fixe pour ne pas être écrasé par le texte */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {data.reduce(
              (acc, item, i) => {
                const length = (item.value / total) * 100;
                const start = acc.offset;
                acc.offset += length;
                acc.paths.push(
                  <circle
                    key={i}
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="5"
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={100 - start}
                    className="transition-all duration-700 ease-out"
                  />
                );
                return acc;
              },
              { offset: 0, paths: [] as JSX.Element[] }
            ).paths}
            
            {/* Séparateurs */}
            {data.length > 1 && data.reduce(
              (acc, item, i) => {
                const length = (item.value / total) * 100;
                const start = acc.offset;
                acc.offset += length;
                acc.paths.push(
                  <circle
                    key={`sep-${i}`}
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="white"
                    strokeWidth="5.5"
                    strokeDasharray={`0.6 ${99.4}`} 
                    strokeDashoffset={100 - start}
                  />
                );
                return acc;
              },
              { offset: 0, paths: [] as JSX.Element[] }
            ).paths}
          </svg>
        </div>

        {/* Légende : Gestion robuste du texte long */}
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
                  title={item.label} // Affiche le texte complet au survol de la souris
                >
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}