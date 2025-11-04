import { Outlet, NavLink } from 'react-router-dom';

export function AdminLayout() {
  const link = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1 text-sm ${isActive ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Admin</h2>
        <nav className="flex gap-2">{link('/admin/overview', 'Overview')}{link('/admin/bookings', 'Bookings')}{link('/admin/financial', 'Financial')}{link('/admin/users', 'Users')}{link('/admin/settings', 'Settings')}</nav>
      </div>
      <Outlet />
    </div>
  );
}

