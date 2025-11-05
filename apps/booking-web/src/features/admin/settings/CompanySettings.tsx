import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../../lib/api';
import toast from 'react-hot-toast';

interface CompanyDataResponse {
  companyName: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  vatNumber: string | null;
  vatRatePercent: string;
  timezone: string;
  logoUrl: string | null;
  bankHolidayRegion: string;
}

interface CompanyData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  vatNumber: string;
  vatRatePercent: string;
  timezone: string;
  logoUrl: string;
  bankHolidayRegion: string;
}

export function CompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanyData>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    vatNumber: '',
    vatRatePercent: '20',
    timezone: 'Europe/London',
    logoUrl: '',
    bankHolidayRegion: 'england-and-wales',
  });

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiGet<CompanyDataResponse>('/admin/settings/company');
        if (cancelled) return;
        setData({
          companyName: response.companyName ?? '',
          companyAddress: response.companyAddress ?? '',
          companyPhone: response.companyPhone ?? '',
          vatNumber: response.vatNumber ?? '',
          vatRatePercent: response.vatRatePercent ?? '20',
          timezone: response.timezone ?? 'Europe/London',
          logoUrl: response.logoUrl ?? '',
          bankHolidayRegion: response.bankHolidayRegion ?? 'england-and-wales',
        });
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load company settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiPut('/admin/settings/company', data);
      toast.success('Company settings saved successfully');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-400">Loading company settings...</div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h3 className="text-lg font-semibold text-white">Company Information</h3>
      <p className="mt-1 text-sm text-slate-400">Update your company details and branding</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400">Company Name</label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => setData((prev) => ({ ...prev, companyName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400">Company Phone</label>
            <input
              type="text"
              value={data.companyPhone}
              onChange={(e) => setData((prev) => ({ ...prev, companyPhone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Company Address</label>
          <textarea
            value={data.companyAddress}
            onChange={(e) => setData((prev) => ({ ...prev, companyAddress: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400">VAT Number</label>
            <input
              type="text"
              value={data.vatNumber}
              onChange={(e) => setData((prev) => ({ ...prev, vatNumber: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400">VAT Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={data.vatRatePercent}
              onChange={(e) => setData((prev) => ({ ...prev, vatRatePercent: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Logo URL</label>
          <input
            type="text"
            value={data.logoUrl}
            onChange={(e) => setData((prev) => ({ ...prev, logoUrl: e.target.value }))}
            placeholder="https://example.com/logo.png"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400">Timezone</label>
            <select
              value={data.timezone}
              onChange={(e) => setData((prev) => ({ ...prev, timezone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            >
              <option value="Europe/London">Europe/London</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400">Bank Holiday Region</label>
            <select
              value={data.bankHolidayRegion}
              onChange={(e) => setData((prev) => ({ ...prev, bankHolidayRegion: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            >
              <option value="england-and-wales">England and Wales</option>
              <option value="scotland">Scotland</option>
              <option value="northern-ireland">Northern Ireland</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
