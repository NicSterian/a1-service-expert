import { Link } from 'react-router-dom';

export function OverviewPage() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
      <h3 className="text-lg font-semibold text-white">Overview</h3>
      <p className="mt-1 text-sm text-slate-400">Quick links</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link to="/admin/financial" className="rounded border border-slate-600 px-3 py-1 hover:border-orange-500 hover:text-orange-300">Financial</Link>
        <Link to="/admin/users" className="rounded border border-slate-600 px-3 py-1 hover:border-orange-500 hover:text-orange-300">Users</Link>
        <Link to="/admin/settings" className="rounded border border-slate-600 px-3 py-1 hover:border-orange-500 hover:text-orange-300">Settings</Link>
        <Link to="/admin/dev" className="rounded border border-slate-600 px-3 py-1 hover:border-orange-500 hover:text-orange-300">Developer Tools</Link>
      </div>
    </div>
  );
}

