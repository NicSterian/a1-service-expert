import { Link } from 'react-router-dom';

export function BookingsPage() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
      <h3 className="text-lg font-semibold text-white">Bookings</h3>
      <p className="mt-1 text-sm text-slate-400">Use the calendar and admin booking detail pages to manage bookings.</p>
      <div className="mt-4 flex gap-2 text-sm">
        <Link to="/admin/settings?tab=calendar" className="rounded border border-slate-600 px-3 py-1 hover:border-orange-500 hover:text-orange-300">Calendar Settings</Link>
      </div>
    </div>
  );
}

