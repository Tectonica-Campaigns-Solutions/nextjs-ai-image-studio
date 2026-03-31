interface StatCardProps {
  label: string;
  value: string | number;
  meta: string;
  metaClassName: string;
}

export function StatCard({ label, value, meta, metaClassName }: StatCardProps) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className={`text-xs font-medium flex items-center ${metaClassName}`}>
          {meta}
        </span>
      </div>
    </div>
  );
}
