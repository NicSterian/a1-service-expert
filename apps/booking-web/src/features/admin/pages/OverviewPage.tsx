import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../../lib/api';

interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  pendingBookings: number;
  totalUsers: number;
}

interface RecentBooking {
  id: number;
  customerName: string;
  slotDate: string;
  slotTime: string;
  status: string;
  vehicleRegistration: string;
}

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay(); // 0 Sun .. 6 Sat
        const diffToMonday = (day + 6) % 7; // 0 if Monday
        startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fetch counts via existing list endpoints
        const [todayResp, weekResp, monthResp, usersResp, recentResp] = await Promise.all([
          apiGet<{ total: number }>(`/admin/bookings?from=${fmt(today)}&to=${fmt(today)}&page=1&pageSize=1&sort=created&order=desc`),
          apiGet<{ total: number }>(`/admin/bookings?from=${fmt(startOfWeek)}&to=${fmt(endOfWeek)}&page=1&pageSize=1&sort=created&order=desc`),
          apiGet<{ total: number }>(`/admin/bookings?from=${fmt(startOfMonth)}&to=${fmt(endOfMonth)}&page=1&pageSize=1&sort=created&order=desc`),
          apiGet<{ total: number }>(`/admin/users?page=1&pageSize=1`),
          apiGet<{ bookings: any[] }>(`/admin/bookings?page=1&pageSize=5&sort=created&order=desc`),
        ]);

        const recent: RecentBooking[] = (recentResp.bookings || []).map((b: any) => ({
          id: b.id,
          customerName: b.customerName,
          slotDate: b.slotDate,
          slotTime: b.slotTime,
          status: b.status,
          vehicleRegistration: b.vehicleRegistration,
        }));

        if (cancelled) return;
        setStats({
          todayBookings: todayResp.total ?? 0,
          weekBookings: weekResp.total ?? 0,
          monthBookings: monthResp.total ?? 0,
          pendingBookings: 0,
          totalUsers: usersResp.total ?? 0,
        });
        setRecentBookings(recent);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load dashboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-white">Welcome to A1 Service Expert Admin</h2>
        <p className="mt-1 text-sm text-slate-300">Manage your bookings, users, and settings from here.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Today's Bookings</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats?.todayBookings ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">This Week</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats?.weekBookings ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">This Month</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats?.monthBookings ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-white">{stats?.totalUsers ?? 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/bookings"
            className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-medium text-slate-200 transition hover:border-brand-orange hover:bg-slate-750"
          >
            <div className="text-brand-orange">📅</div>
            <div className="mt-2">View All Bookings</div>
          </Link>
          <Link
            to="/admin/users"
            className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-medium text-slate-200 transition hover:border-brand-orange hover:bg-slate-750"
          >
            <div className="text-brand-orange">👥</div>
            <div className="mt-2">Manage Users</div>
          </Link>
          <Link
            to="/admin/settings?tab=catalog"
            className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-medium text-slate-200 transition hover:border-brand-orange hover:bg-slate-750"
          >
            <div className="text-brand-orange">🛠️</div>
            <div className="mt-2">Manage Catalog</div>
          </Link>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Bookings</h3>
          <Link
            to="/admin/bookings"
            className="text-xs font-medium text-brand-orange hover:text-orange-400"
          >
            View all →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No recent bookings to display.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <div>
                  <div className="text-sm font-medium text-white">{booking.customerName}</div>
                  <div className="text-xs text-slate-400">
                    {booking.vehicleRegistration} • {booking.slotDate} {booking.slotTime}
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-300">{booking.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Status - Placeholder for future */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">System Status</h3>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">API Server</span>
            <span className="text-green-400">● Online</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Database</span>
            <span className="text-green-400">● Connected</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Redis Cache</span>
            <span className="text-green-400">● Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
