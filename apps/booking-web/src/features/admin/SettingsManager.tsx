import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';

type SettingsResponse = {
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  vatNumber?: string | null;
  vatRatePercent: string | number | { toString(): string };
  timezone: string;
  defaultSlotsJson: string[];
  bankHolidayRegion: string;
  logoUrl?: string | null;
  holdMinutes: number;
  captchaEnabled: boolean;
  captchaRequireInDev: boolean;
  vrmLookupRateLimitPerMinute?: number | null;
  signupRateLimitPerHour?: number | null;
  bookingConfirmRateLimitPerDay?: number | null;
  dvlaApiKeyConfigured: boolean;
};

type SettingsState = Omit<SettingsResponse, 'vatRatePercent'> & {
  vatRatePercent: string;
};

type DvlaLookupResponse = {
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
};

function normalizeSettings(response: SettingsResponse): SettingsState {
  const vat = response.vatRatePercent;
  const vatString =
    typeof vat === 'number'
      ? vat.toString()
      : typeof vat === 'string'
        ? vat
        : 'toString' in vat
          ? vat.toString()
          : '';

  return {
    ...response,
    vatRatePercent: vatString,
    defaultSlotsJson: Array.isArray(response.defaultSlotsJson) ? response.defaultSlotsJson : [],
  };
}

function formatPricePence(value?: number | null) {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  return '£' + (value / 100).toFixed(2);
}

export function SettingsManager() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [dvlaKeyInput, setDvlaKeyInput] = useState('');
  const [savingDvlaKey, setSavingDvlaKey] = useState(false);
  const [dvlaKeyMessage, setDvlaKeyMessage] = useState<string | null>(null);
  const [dvlaKeyError, setDvlaKeyError] = useState<string | null>(null);

  const [dvlaTestReg, setDvlaTestReg] = useState('');
  const [testingDvla, setTestingDvla] = useState(false);
  const [dvlaTestResult, setDvlaTestResult] = useState<DvlaLookupResponse | null>(null);
  const [dvlaTestMessage, setDvlaTestMessage] = useState<string | null>(null);
  const [dvlaTestError, setDvlaTestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<SettingsResponse>('/admin/settings');
        if (!cancelled) {
          setSettings(normalizeSettings(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleGeneralSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) {
      return;
    }

    const vatNumber = Number(settings.vatRatePercent);
    if (Number.isNaN(vatNumber)) {
      setError('VAT rate must be a number.');
      setMessage(null);
      return;
    }

    try {
      setSavingGeneral(true);
      setMessage(null);
      setError(null);
        const payload = {
          companyName: settings.companyName,
          companyAddress: settings.companyAddress,
          companyPhone: settings.companyPhone,
          vatNumber: settings.vatNumber,
          vatRatePercent: vatNumber,
          timezone: settings.timezone,
          defaultSlots: settings.defaultSlotsJson,
          bankHolidayRegion: settings.bankHolidayRegion,
          logoUrl: settings.logoUrl,
          holdMinutes: settings.holdMinutes,
          captchaEnabled: settings.captchaEnabled,
          captchaRequireInDev: settings.captchaRequireInDev,
          vrmLookupRateLimitPerMinute: settings.vrmLookupRateLimitPerMinute,
          signupRateLimitPerHour: settings.signupRateLimitPerHour,
          bookingConfirmRateLimitPerDay: settings.bookingConfirmRateLimitPerDay,
        };
      const updated = await apiPatch<SettingsResponse>('/admin/settings', payload);
      setSettings(normalizeSettings(updated));
      setMessage('Settings saved.');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save settings.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleDvlaSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) {
      return;
    }

    const trimmed = dvlaKeyInput.trim();

    try {
      setSavingDvlaKey(true);
      setDvlaKeyMessage(null);
      setDvlaKeyError(null);
      const updated = await apiPut<SettingsResponse>('/admin/settings/dvla', {
        dvlaApiKeyPlain: trimmed ? trimmed : null,
      });
      setSettings((prev) => {
        if (prev) {
          return { ...prev, dvlaApiKeyConfigured: updated.dvlaApiKeyConfigured };
        }
        return normalizeSettings(updated);
      });
      setDvlaKeyMessage(trimmed ? 'DVLA API key saved.' : 'DVLA API key cleared.');
      setDvlaKeyInput('');
    } catch (err) {
      setDvlaKeyError((err as Error).message ?? 'Failed to update DVLA key.');
    } finally {
      setSavingDvlaKey(false);
    }
  };

  const handleDvlaTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const registration = dvlaTestReg.trim().toUpperCase();
    if (!registration) {
      setDvlaTestError('Enter a registration to test.');
      setDvlaTestMessage(null);
      setDvlaTestResult(null);
      return;
    }

    try {
      setTestingDvla(true);
      setDvlaTestError(null);
      setDvlaTestMessage(null);
      setDvlaTestResult(null);
      const response = await apiPost<DvlaLookupResponse>('/admin/settings/test-dvla', { reg: registration });
      setDvlaTestResult(response);
      if (response.ok && response.data) {
        setDvlaTestMessage('DVLA lookup succeeded.');
      } else if (!response.ok && response.allowManual) {
        setDvlaTestMessage('DVLA lookup failed. Manual entry will be required.');
      } else {
        setDvlaTestMessage('DVLA lookup failed.');
      }
    } catch (err) {
      setDvlaTestError((err as Error).message ?? 'Unable to test DVLA lookup.');
    } finally {
      setTestingDvla(false);
    }
  };

  const dvlaStatusLabel = useMemo(() => {
    if (!settings) {
      return 'Unknown';
    }
    return settings.dvlaApiKeyConfigured ? 'Configured' : 'Not configured';
  }, [settings]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Settings</h2>
        <p className="text-sm text-slate-500">Loading settings...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-black">Settings</h2>
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-black">Settings</h2>
        <p className="text-sm text-slate-600">Update company information, slots, rate limits, and DVLA integration.</p>
      </div>

      <form
        onSubmit={handleGeneralSubmit}
        className="grid gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Company name</label>
          <input
            value={settings.companyName ?? ''}
            onChange={(event) => update('companyName', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Company phone</label>
          <input
            value={settings.companyPhone ?? ''}
            onChange={(event) => update('companyPhone', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">VAT number</label>
          <input
            value={settings.vatNumber ?? ''}
            onChange={(event) => update('vatNumber', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">VAT rate (%)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={settings.vatRatePercent}
            onChange={(event) => update('vatRatePercent', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Timezone</label>
          <input
            value={settings.timezone}
            onChange={(event) => update('timezone', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Default slots (comma separated)</label>
          <input
            value={settings.defaultSlotsJson.join(',')}
            onChange={(event) =>
              update(
                'defaultSlotsJson',
                event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Hold minutes</label>
          <input
            type="number"
            value={settings.holdMinutes}
            onChange={(event) => update('holdMinutes', Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Bank holiday region</label>
          <input
            value={settings.bankHolidayRegion}
            onChange={(event) => update('bankHolidayRegion', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Logo URL</label>
          <input
            value={settings.logoUrl ?? ''}
            onChange={(event) => update('logoUrl', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">VRM rate limit/min</label>
          <input
            type="number"
            value={settings.vrmLookupRateLimitPerMinute ?? ''}
            onChange={(event) =>
              update('vrmLookupRateLimitPerMinute', event.target.value ? Number(event.target.value) : null)
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Signup rate limit/hour</label>
          <input
            type="number"
            value={settings.signupRateLimitPerHour ?? ''}
            onChange={(event) =>
              update('signupRateLimitPerHour', event.target.value ? Number(event.target.value) : null)
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Confirm rate limit/day</label>
          <input
            type="number"
            value={settings.bookingConfirmRateLimitPerDay ?? ''}
            onChange={(event) =>
              update('bookingConfirmRateLimitPerDay', event.target.value ? Number(event.target.value) : null)
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Turnstile enabled</label>
          <select
            value={settings.captchaEnabled ? 'true' : 'false'}
            onChange={(event) => update('captchaEnabled', event.target.value === 'true')}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-slate-400">Require Turnstile in dev</label>
          <select
            value={settings.captchaRequireInDev ? 'true' : 'false'}
            onChange={(event) => update('captchaRequireInDev', event.target.value === 'true')}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">Force Turnstile locally to validate the configuration.</p>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-400">Company address</label>
          <textarea
            value={settings.companyAddress ?? ''}
            onChange={(event) => update('companyAddress', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            rows={2}
          />
        </div>
        <div className="sm:col-span-3 flex items-start gap-3">
          <button
            type="submit"
            className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500 disabled:opacity-60"
            disabled={savingGeneral}
          >
            {savingGeneral ? 'Saving...' : 'Save settings'}
          </button>
          <div className="space-y-1 text-xs">
            {message ? <p className="text-slate-300">{message}</p> : null}
            {error ? <p className="text-red-600">{error}</p> : null}
          </div>
        </div>
      </form>

      <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">DVLA Integration</h3>
            <p className="text-xs text-slate-300">
              API key is stored encrypted. Paste a new key to rotate it, or submit an empty field to clear it.
            </p>
          </div>
          <span className={`text-xs font-medium ${settings.dvlaApiKeyConfigured ? 'text-emerald-300' : 'text-slate-400'}`}>
            Status: {dvlaStatusLabel}
          </span>
        </div>

        <form onSubmit={handleDvlaSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400">DVLA API key</label>
            <input
              type="password"
              value={dvlaKeyInput}
              onChange={(event) => setDvlaKeyInput(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
              placeholder="Paste key"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-400">Submit blank to remove the stored key.</p>
          </div>

          <div className="flex flex-wrap items-start gap-3 text-xs">
            <button
              type="submit"
              className="rounded-full bg-brand-orange px-3 py-2 font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-orange-400 disabled:opacity-60"
              disabled={savingDvlaKey}
            >
              {savingDvlaKey ? 'Saving...' : 'Save DVLA key'}
            </button>
            <div className="space-y-1">
              {dvlaKeyMessage ? <p className="text-slate-300">{dvlaKeyMessage}</p> : null}
              {dvlaKeyError ? <p className="text-red-400">{dvlaKeyError}</p> : null}
            </div>
          </div>
        </form>

        <form className="rounded-2xl border border-slate-700 bg-slate-900 p-3" onSubmit={handleDvlaTest}>
          <h4 className="text-sm font-semibold text-white">Test lookup</h4>
          <p className="mt-1 text-xs text-slate-300">
            Run a dry DVLA lookup without caching or storing vehicle data.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400">Registration</label>
              <input
                value={dvlaTestReg}
                onChange={(event) => setDvlaTestReg(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm uppercase text-slate-200"
                placeholder="AA11AAA"
              />
            </div>
            <div className="flex flex-wrap items-start gap-3 text-xs">
              <button
                type="submit"
                className="rounded-full border border-brand-orange px-3 py-2 text-brand-orange hover:-translate-y-0.5 hover:bg-orange-50 disabled:opacity-60"
                disabled={testingDvla}
              >
                {testingDvla ? 'Testing...' : 'Test lookup'}
              </button>
              <div className="space-y-1">
                {dvlaTestMessage ? <p className="text-slate-300">{dvlaTestMessage}</p> : null}
                {dvlaTestError ? <p className="text-red-400">{dvlaTestError}</p> : null}
              </div>
            </div>
            {dvlaTestResult?.data ? (
              <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-400">Make</dt>
                  <dd>{dvlaTestResult.data.make ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Model</dt>
                  <dd>{dvlaTestResult.data.model ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Engine size (cc)</dt>
                  <dd>{dvlaTestResult.data.engineSizeCc ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Recommended tier</dt>
                  <dd>
                    {dvlaTestResult.data.recommendation?.engineTierName ??
                      (dvlaTestResult.data.recommendation?.engineTierId
                        ? `ID ${dvlaTestResult.data.recommendation.engineTierId}`
                        : 'Not available')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Estimated price</dt>
                  <dd>{formatPricePence(dvlaTestResult.data.recommendation?.pricePence)}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}




