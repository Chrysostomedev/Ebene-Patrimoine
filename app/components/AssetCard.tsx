"use client";

interface AssetCardProps {
  title: string;
  subtitle?: string;
  value: string;
  description: string;
   status?: "Zoo" | "Attention" | "C'est gaté";
}

const statusStyles = {
  healthy: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export default function AssetCard({
  title,
  subtitle,
  value,
  status,
  description,
}: AssetCardProps) {
  return (
    <div className="relative bg-white rounded-3xl border border-gray-200 shadow-sm p-8 overflow-hidden">
      {/* Decorative line */}
      <div className="absolute top-0 left-0 h-full w-1 bg-gray-900" />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold tracking-tight text-gray-900">
            {value}
          </span>

         {status && (
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      statusStyles[status] ?? "bg-gray-100 text-gray-700"
    }`}
  >
    {status.toUpperCase()}
  </span>
)}

        </div>

        <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
    </div>
  );
}
