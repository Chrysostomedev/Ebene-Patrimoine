"use client";

interface CalendarEvent {
  id: number;
  label: string;
  time: string;
  color: string;
  status: string;
  planning: any;
}

interface DayCellProps {
  day: number;
  currentMonth?: boolean;
  events: CalendarEvent[];
  date?: Date;
  canAddEvent?: boolean;
  onClick: (event: CalendarEvent) => void;
  onAddClick?: (date: Date) => void;
  onDrop?: (planningId: number) => void;
  /** Appelé quand on clique sur "+N autres" — reçoit tous les events du jour */
  onShowMore?: (events: CalendarEvent[], date: Date) => void;
  onCellClick?: (date: Date) => void;
}

import { Plus } from "lucide-react";

export function DayCell({
  day, currentMonth = true, events, onClick, onAddClick, onDrop, date,
  canAddEvent = false, onShowMore, onCellClick,
}: DayCellProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = date && date < today;
  const isToday = Boolean(date && currentMonth && date.toDateString() === new Date().toDateString());
  const hasEvents = events.length > 0;

  // Bouton + uniquement sur cellules VIDES du mois courant ET non passées
  const showAddButton = currentMonth && canAddEvent && onAddClick && date && !hasEvents && !isPast;

  return (
    <div
      onDragOver={(e) => {
        if (currentMonth) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
      }}
      onDrop={(e) => {
        if (currentMonth) {
          e.preventDefault();
          const planningId = e.dataTransfer.getData("planningId");
          if (planningId && onDrop) onDrop(Number(planningId));
        }
      }}
      onClick={(e) => {
        // Uniquement si on clique sur le fond de la cellule, pas sur un event
        if (e.target === e.currentTarget && onCellClick && date && currentMonth) {
          onCellClick(date);
        }
      }}
      className={`
        relative min-h-[110px] border-b border-r p-2 flex flex-col gap-1 group/cell overflow-hidden
        ${!currentMonth ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-100"}
        ${currentMonth ? "hover:bg-slate-50/30 transition-colors" : ""}
        ${isToday && hasEvents ? "ring-2 ring-blue-500 ring-inset bg-blue-50/20" : ""}
        ${isToday && !hasEvents ? "ring-1 ring-blue-300 ring-inset bg-blue-50/10" : ""}
      `}
    >
      {/* Bouton + uniquement sur cellules vides */}
      {showAddButton && (
        <button
          onClick={() => onAddClick!(date!)}
          className="absolute inset-0 m-auto w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/cell:opacity-100 hover:bg-slate-200 hover:text-slate-600 transition-all z-0 scale-90 hover:scale-100"
          title="Ajouter un planning"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Numéro du jour */}
      <div className="flex items-center justify-end mb-1 relative z-10">
        <span className={`text-[13px] w-7 h-7 flex items-center justify-center rounded-full font-semibold ${!currentMonth ? "text-slate-300" : "text-slate-700"}`}>
          {day}
        </span>
      </div>

      {/* Events — max 2 affichés */}
      <div className="flex flex-col gap-1 overflow-hidden relative z-10">
        {events.slice(0, 2).map((event, i) => (
          <button
            key={i}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("planningId", String(event.id));
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onClick(event)}
            className="w-full text-left group cursor-grab active:cursor-grabbing"
          >
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:bg-white/50 ring-1 ring-transparent hover:ring-slate-200"
              style={{ backgroundColor: `${event.color}15`, borderLeft: `3px solid ${event.color}` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate leading-tight" style={{ color: event.color }}>
                  {event.label}
                </p>
                {event.time && event.time !== "-" && (
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{event.time}</p>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* "+N autres" → ouvre liste si onShowMore fourni, sinon ouvre le 3ème */}
        {events.length > 2 && (
          <button
            onClick={() => {
              if (onShowMore && date) {
                onShowMore(events, date);
              } else {
                onClick(events[2]);
              }
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 text-left px-2 transition-colors"
          >
            +{events.length - 2} autre{events.length - 2 > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
