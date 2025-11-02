import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import toast from 'react-hot-toast';

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

interface DvlaLookupResponse {
  ok: boolean;
  allowManual: boolean;
  data?: {
    make?: string | null;
    model?: string | null;
    engineSizeCc?: number | null;
    recommendation?: {
      engineTierId: number;
      engineTierName?: string | null;
      pricePence?: number | null;
    } | null;
  } | null;
}

export function DevToolsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);

  // Availability Probe
  const [probeDate, setProbeDate] = useState('');
  const [probeResult, setProbeResult] = useState<any>(null);
  const [probing, setProbing] = useState(false);

  // Holds Manager
  const [holdDate, setHoldDate] = useState('');
  const [holdTime, setHoldTime] = useState('');
  const [holdResult, setHoldResult] = useState<any>(null);

  // DVLA Test
  const [testReg, setTestReg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DvlaLookupResponse | null>(null);

  // Redis Ping
  const [redisPing, setRedisPing] = useState<boolean | null>(null);

  // Migration Status
  const [migrations, setMigrations] = useState<any[] | null>(null);

  // Email Test
  const [emailTo, setEmailTo] = useState('');
  const [emailResult, setEmailResult] = useState<any>(null);

  // Storage Test
  const [storageResult, setStorageResult] = useState<any>(null);

  // Feature Flags
  const [flags, setFlags] = useState<any>(null);

  // Audit Log
  const [auditLogs, setAuditLogs] = useState<any[] | null>(null);

  // System Settings
  const [timezone, setTimezone] = useState('Europe/London');
  const [bankHolidayRegion, setBankHolidayRegion] = useState('england-and-wales');
  const [savingSystemSettings, setSavingSystemSettings] = useState(false);

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
            setRedisPing(healthData.redis);
          }
        } catch (err) {
          console.error('Failed to load health data:', err);
        }

        // Load system settings
        try {
          const settings = await apiGet<any>('/admin/settings');
          if (!cancelled) {
            setTimezone(settings.timezone || 'Europe/London');
            setBankHolidayRegion(settings.bankHolidayRegion || 'england-and-wales');
          }
        } catch (err) {
          console.error('Failed to load system settings:', err);
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

  const handleProbeAvailability = async (e: FormEvent) => {
    e.preventDefault();
    if (!probeDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      setProbing(true);
      const result = await apiPost('/admin/dev/availability-probe', { date: probeDate });
      setProbeResult(result);
      toast.success('Availability probe complete');
    } catch (err) {
      toast.error((err as Error).message ?? 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  const handleCreateHold = async (e: FormEvent) => {
    e.preventDefault();
    if (!holdDate || !holdTime) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const result = await apiPost('/admin/dev/holds/create', {
        slotDate: holdDate,
        slotTime: holdTime,
        durationMins: 60,
      });
      setHoldResult(result);
      toast.success('Test hold created');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create hold');
    }
  };

  const handleReleaseHold = async () => {
    if (!holdResult?.hold?.id) return;
    try {
      await apiPost('/admin/dev/holds/release', { holdId: holdResult.hold.id });
      toast.success('Hold released');
      setHoldResult(null);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to release hold');
    }
  };

  const handleTestDvla = async (e: FormEvent) => {
    e.preventDefault();
    if (!testReg.trim()) {
      toast.error('Please enter a registration number');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const response = await apiPost<DvlaLookupResponse>('/admin/dvla/test-lookup', {
        registration: testReg.trim().toUpperCase(),
      });
      setTestResult(response);
      if (response.ok) {
        toast.success('DVLA lookup successful');
      } else {
        toast.error('DVLA lookup failed - check API key');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to test DVLA lookup');
    } finally {
      setTesting(false);
    }
  };

  const loadMigrations = async () => {
    try {
      const result = await apiGet<any>('/admin/dev/migrations');
      if (result.success) {
        setMigrations(result.migrations);
        toast.success('Loaded migration status');
      } else {
        toast.error(result.error ?? 'Failed to load migrations');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load migrations');
    }
  };

  const handleTestEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      const result = await apiPost('/admin/dev/email/test', { to: emailTo.trim() });
      setEmailResult(result);
      toast.success('Email test complete');
    } catch (err) {
      toast.error((err as Error).message ?? 'Email test failed');
    }
  };

  const handleTestStorage = async () => {
    try {
      const result = await apiPost<any>('/admin/dev/storage/test', {});
      setStorageResult(result);
      if (result.success) {
        toast.success('Storage test passed');
      } else {
        toast.error(result.error ?? 'Storage test failed');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Storage test failed');
    }
  };

  const loadFeatureFlags = async () => {
    try {
      const result = await apiGet('/admin/dev/feature-flags');
      setFlags(result);
      toast.success('Loaded feature flags');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load feature flags');
    }
  };

  const loadAuditLog = async () => {
    try {
      const result = await apiGet<any>('/admin/dev/audit-log');
      if (result.success) {
        setAuditLogs(result.logs);
        toast.success(`Loaded ${result.logs.length} audit entries`);
      } else {
        toast.error('Failed to load audit log');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load audit log');
    }
  };

  const saveSystemSettings = async () => {
    try {
      setSavingSystemSettings(true);
      await apiPatch('/admin/settings', {
        timezone,
        bankHolidayRegion,
      });
      toast.success('System settings saved');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save system settings');
    } finally {
      setSavingSystemSettings(false);
    }
  };

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

        {/* Health Check & Version */}
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
                <span className={`font-medium ${redisPing ? 'text-green-400' : 'text-red-400'}`}>
                  {redisPing ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Health data unavailable</p>
          )}
        </div>

        {/* Availability Probe */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Availability Probe</h3>
          <p className="mt-1 text-sm text-slate-400">
            Test availability for specific dates with raw JSON output
          </p>
          <form onSubmit={handleProbeAvailability} className="mt-4 flex gap-2">
            <input
              type="date"
              value={probeDate}
              onChange={(e) => setProbeDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="submit"
              disabled={probing}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
            >
              {probing ? 'Probing...' : 'Probe'}
            </button>
          </form>
          {probeResult && (
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-300">
              {JSON.stringify(probeResult, null, 2)}
            </pre>
          )}
        </div>

        {/* Holds Manager */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Holds Manager</h3>
          <p className="mt-1 text-sm text-slate-400">Create and release test holds</p>
          <form onSubmit={handleCreateHold} className="mt-4 flex gap-2">
            <input
              type="date"
              value={holdDate}
              onChange={(e) => setHoldDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            <input
              type="time"
              value={holdTime}
              onChange={(e) => setHoldTime(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            >
              Create Hold
            </button>
          </form>
          {holdResult && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <p className="text-sm text-green-400">Hold created (ID: {holdResult.hold.id})</p>
              <button
                type="button"
                onClick={handleReleaseHold}
                className="mt-2 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-orange-500"
              >
                Release Hold
              </button>
            </div>
          )}
        </div>

        {/* DVLA Test Lookup */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">DVLA Test Lookup</h3>
          <p className="mt-1 text-sm text-slate-400">Test DVLA vehicle lookup API</p>
          <form onSubmit={handleTestDvla} className="mt-4 flex gap-2">
            <input
              type="text"
              value={testReg}
              onChange={(e) => setTestReg(e.target.value.toUpperCase())}
              placeholder="e.g. AA19ABC"
              maxLength={8}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={testing}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test'}
            </button>
          </form>
          {testResult && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm">
              {testResult.ok && testResult.data ? (
                <div className="space-y-1 text-slate-300">
                  <p>
                    <span className="font-medium text-white">Make:</span> {testResult.data.make || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium text-white">Model:</span> {testResult.data.model || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium text-white">Engine Size:</span>{' '}
                    {testResult.data.engineSizeCc ? `${testResult.data.engineSizeCc}cc` : 'N/A'}
                  </p>
                  {testResult.data.recommendation && (
                    <p>
                      <span className="font-medium text-white">Recommended Tier:</span>{' '}
                      {testResult.data.recommendation.engineTierName || 'N/A'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-red-300">Lookup failed</p>
              )}
            </div>
          )}
        </div>

        {/* Migration Status */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Prisma Migration Status</h3>
          <p className="mt-1 text-sm text-slate-400">Check database migration status</p>
          <button
            type="button"
            onClick={loadMigrations}
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            Load Migrations
          </button>
          {migrations && (
            <div className="mt-3 space-y-1">
              {migrations.map((m: any, i: number) => (
                <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300">
                  {m.migration_name} - {new Date(m.finished_at).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Test */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Email Test (Microsoft 365 SMTP)</h3>
          <p className="mt-1 text-sm text-slate-400">Send a test email</p>
          <form onSubmit={handleTestEmail} className="mt-4 flex gap-2">
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            >
              Send Test
            </button>
          </form>
          {emailResult && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
              {emailResult.success ? (
                <p className="text-green-400">{emailResult.message}</p>
              ) : (
                <p className="text-red-400">{emailResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Storage Test */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Storage Test</h3>
          <p className="mt-1 text-sm text-slate-400">Test file upload and read functionality</p>
          <button
            type="button"
            onClick={handleTestStorage}
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            Run Storage Test
          </button>
          {storageResult && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
              {storageResult.success ? (
                <p className="text-green-400">{storageResult.message}</p>
              ) : (
                <p className="text-red-400">{storageResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Feature Flags */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Feature Flags</h3>
          <p className="mt-1 text-sm text-slate-400">Maintenance mode and checkout visibility</p>
          <button
            type="button"
            onClick={loadFeatureFlags}
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            Load Flags
          </button>
          {flags && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-300">Maintenance Mode</span>
                <span className={flags.maintenanceMode ? 'text-orange-400' : 'text-green-400'}>
                  {flags.maintenanceMode ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-300">Hide Checkout</span>
                <span className={flags.hideCheckout ? 'text-orange-400' : 'text-green-400'}>
                  {flags.hideCheckout ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Tail */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Audit Log Tail</h3>
          <p className="mt-1 text-sm text-slate-400">Last 100 admin actions</p>
          <button
            type="button"
            onClick={loadAuditLog}
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            Load Audit Log
          </button>
          {auditLogs && (
            <div className="mt-3 max-h-96 space-y-1 overflow-auto">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{log.action}</span>
                    <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-slate-400">
                    {log.entity} #{log.entityId} by {log.user?.email || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Settings */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">System Settings</h3>
          <p className="mt-1 text-sm text-slate-400">Timezone and bank holiday configuration</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              >
                <option value="Europe/London">Europe/London</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400">Bank Holiday Region</label>
              <select
                value={bankHolidayRegion}
                onChange={(e) => setBankHolidayRegion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              >
                <option value="england-and-wales">England and Wales</option>
                <option value="scotland">Scotland</option>
                <option value="northern-ireland">Northern Ireland</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={saveSystemSettings}
            disabled={savingSystemSettings}
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
          >
            {savingSystemSettings ? 'Saving...' : 'Save System Settings'}
          </button>
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
