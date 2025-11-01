import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../../lib/api';
import { getToken } from '../../../lib/auth';

interface CurrentUser {
  id: number;
  email: string;
  role: string;
}

interface HealthData {
  status: string;
  version: string;
  database: boolean;
  redis: boolean;
}

export function DevToolsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { state: { from: '/admin/dev' } });
      return;
    }

    let cancelled = false;
    const checkAccess = async () => {
      try {
        const response = await apiGet<{ user: CurrentUser }>('/auth/me');
        if (cancelled) return;
        setUser(response.user);

        // Only ADMIN can access dev tools
        if (response.user.role !== 'ADMIN') {
          navigate('/admin');
          return;
        }

        // Load health data
        try {
          const healthData = await apiGet<HealthData>('/admin/dev/health');
          if (!cancelled) {
            setHealth(healthData);
          }
        } catch (err) {
          console.error('Failed to load health data:', err);
        }
      } catch (err) {
        if (!cancelled) {
          navigate('/login', { state: { from: '/admin/dev' } });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-400">Checking access...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-lg">
          <h1 className="text-2xl font-semibold text-white">Developer Tools</h1>
          <p className="mt-1 text-sm text-slate-300">
            Admin-only utilities for testing and debugging
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Logged in as {user.email} ({user.role})
          </p>
        </div>

        {/* Health Check */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">System Health</h2>
          {health ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">API Status</span>
                <span className="font-medium text-green-400">{health.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">API Version</span>
                <span className="font-medium text-slate-300">{health.version}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Database</span>
                <span className={`font-medium ${health.database ? 'text-green-400' : 'text-red-400'}`}>
                  {health.database ? '● Connected' : '○ Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Redis Cache</span>
                <span className={`font-medium ${health.redis ? 'text-green-400' : 'text-red-400'}`}>
                  {health.redis ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Health data unavailable</p>
          )}
        </div>

        {/* Coming Soon Sections */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white">Availability Probe</h3>
            <p className="mt-2 text-sm text-slate-400">
              Test availability for specific dates, services, and durations
            </p>
            <p className="mt-4 text-xs text-slate-500">Coming in Phase 10...</p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white">Holds Manager</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create and release test holds for development
            </p>
            <p className="mt-4 text-xs text-slate-500">Coming in Phase 10...</p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white">DVLA Test Lookup</h3>
            <p className="mt-2 text-sm text-slate-400">
              Test DVLA vehicle lookup without affecting production
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Currently in Settings → Integrations. Will be moved here in Phase 10.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white">Service Pings</h3>
            <p className="mt-2 text-sm text-slate-400">
              Test connectivity to Redis, storage, and email services
            </p>
            <p className="mt-4 text-xs text-slate-500">Coming in Phase 10...</p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            className="text-sm text-slate-500 transition hover:text-brand-orange"
          >
            ← Back to Settings
          </button>
        </div>
      </div>
    </div>
  );
}
