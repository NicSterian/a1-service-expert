export function BookingSourceBadge({ source }: { source?: string | null }) {
  const label = (source || 'UNKNOWN').toUpperCase();
  const color =
    label === 'WEB'
      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
      : label === 'ADMIN'
      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
      : 'bg-slate-600/20 text-slate-300 border-slate-500/40';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${color}`}>
      {label}
    </span>
  );
}

