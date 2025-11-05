import type { AdminBookingResponse, BookingStatus } from './AdminBookingDetailPage';

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'HELD', label: 'Held' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusPanel(props: {
  booking: AdminBookingResponse;
  statusToUpdate: BookingStatus | null;
  setStatusToUpdate: (next: BookingStatus) => void;
  onUpdateStatus: () => void;
  loading: boolean;
}) {
  const { booking, statusToUpdate, setStatusToUpdate, onUpdateStatus, loading } = props;

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Status</h3>
        <span className="text-xs text-slate-400">Updated {formatDateTime(booking.updatedAt)}</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusToUpdate ?? booking.status}
            onChange={(event) => setStatusToUpdate(event.target.value as BookingStatus)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={onUpdateStatus}
            className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
            type="button"
            disabled={loading}
          >
            Update Status
          </button>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-xs text-slate-300">
          <div className="font-semibold uppercase tracking-wide text-slate-400">History</div>
          <ul className="mt-2 space-y-2">
            {booking.statusHistory.map((entry) => (
              <li key={`${entry.status}-${entry.changedAt}`}>
                <span className="font-semibold text-white">{entry.status}</span>
                <span className="text-slate-400"> - {formatDateTime(entry.changedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

