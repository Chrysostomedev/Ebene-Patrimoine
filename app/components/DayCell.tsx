"use client";

// ============================================================
// components/DayCell.tsx
// Cellule d'un jour dans le CalendarGrid
// Reçoit les events réels depuis CalendarGrid
// ============================================================

interface CalendarEvent {
  id: number;
  label: string;
  time: string;
  color: string;
  status: string;
  planning: any; // Planning complet pour le panel
}

interface DayCellProps {
  day: number;
  currentMonth?: boolean;
  events: CalendarEvent[];
  onClick: (event: CalendarEvent) => void;
}

export function DayCell({ day, currentMonth = true, events, onClick }: DayCellProps) {
  const isToday = (() => {
    const d = new Date();
    // On ne peut pas vérifier l'année/mois ici sans les props, 
    // donc on laisse CalendarGrid gérer la surbrillance si besoin
    return false;
  })();

  return (
    <div
      className={`
        min-h-[110px] border-b border-r border-slate-100 p-2 flex flex-col gap-1
        ${!currentMonth ? "bg-slate-50/50" : "bg-white"}
      `}
    >
      {/* Numéro du jour */}
      <div className="flex items-center justify-end mb-1">
        <span
          className={`
            text-[13px] w-7 h-7 flex items-center justify-center rounded-full font-semibold
            ${!currentMonth ? "text-slate-300" : "text-slate-700"}
          `}
        >
          {day}
        </span>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {events.slice(0, 2).map((event, i) => (
          <button
            key={i}
            onClick={() => onClick(event)}
            className="w-full text-left group"
          >
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-[0.98]"
              style={{ backgroundColor: `${event.color}15`, borderLeft: `3px solid ${event.color}` }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-bold truncate leading-tight"
                  style={{ color: event.color }}
                >
                  {event.label}
                </p>
                {event.time && event.time !== "—" && (
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {event.time}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* Indicateur "+N" si plus de 2 events */}
        {events.length > 2 && (
          <button
            onClick={() => onClick(events[2])}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 text-left px-2 transition-colors"
          >
            +{events.length - 2} autre{events.length - 2 > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}