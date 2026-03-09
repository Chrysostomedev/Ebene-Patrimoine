"use client";

interface ReportCardProps {
  period: string;
  headline: string;
  insight: string;
  impact: "positive" | "neutral" | "negative";
}

const impactStyles = {
  positive: {
    bg: "bg-gray-900",
    text: "text-white",
    label: "Impact positif",
  },
  neutral: {
    bg: "bg-gray-100",
    text: "text-gray-900",
    label: "Impact neutre",
  },
  negative: {
    bg: "bg-gray-200",
    text: "text-gray-900",
    label: "Impact négatif",
  },
};

export default function ReportCard({
  period,
  headline,
  insight,
  impact,
}: ReportCardProps) {
  const style = impactStyles[impact];

  return (
    <div
      className=" rounded-3xl p-8 bg-white rounded-3xl border border-gray-200 shadow-sm"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest opacity-70">
      2 heures         
      </span>
          <span className="text-xs font-medium opacity-80">
          </span>
        </div>

        <h3 className="text-2xl font-semibold leading-snug">
          {headline}
        </h3>

        <p className="text-sm leading-relaxed opacity-90 max-w-2xl">
          {insight}
        </p>
      </div>
    </div>
  );
}
