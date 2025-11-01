import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiPut, apiPost } from '../../../lib/api';
import toast from 'react-hot-toast';

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

export function IntegrationsSettings() {
  const [loading, setLoading] = useState(true);
  const [dvlaConfigured, setDvlaConfigured] = useState(false);
  const [dvlaKeyInput, setDvlaKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Test lookup
  const [testReg, setTestReg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DvlaLookupResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ dvlaApiKeyConfigured: boolean }>('/admin/settings');
        if (cancelled) return;
        setDvlaConfigured(response.dvlaApiKeyConfigured);
      } catch (err) {
        console.error('Failed to load integrations settings:', err);
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

  const handleSaveDvlaKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!dvlaKeyInput.trim()) {
      toast.error('Please enter a DVLA API key');
      return;
    }

    try {
      setSavingKey(true);
      await apiPut('/admin/settings/dvla-key', { apiKey: dvlaKeyInput.trim() });
      setDvlaConfigured(true);
      setDvlaKeyInput('');
      toast.success('DVLA API key saved successfully');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save DVLA key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestLookup = async (e: FormEvent) => {
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

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-400">Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* DVLA Integration */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">DVLA Integration</h3>
        <p className="mt-1 text-sm text-slate-400">
          Configure DVLA vehicle lookup API for automatic vehicle details
        </p>

        <div className="mt-6 space-y-4">
          {/* Status */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">DVLA API Status</span>
              <span
                className={`text-sm font-medium ${
                  dvlaConfigured ? 'text-green-400' : 'text-slate-400'
                }`}
              >
                {dvlaConfigured ? '● Configured' : '○ Not Configured'}
              </span>
            </div>
          </div>

          {/* Key Input */}
          <form onSubmit={handleSaveDvlaKey} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400">
                DVLA API Key
              </label>
              <input
                type="password"
                value={dvlaKeyInput}
                onChange={(e) => setDvlaKeyInput(e.target.value)}
                placeholder={dvlaConfigured ? '••••••••••••••••' : 'Enter DVLA API key'}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
              <p className="mt-1 text-xs text-slate-500">
                {dvlaConfigured
                  ? 'Key is encrypted and stored securely. Enter a new key to update.'
                  : 'Get your API key from https://developer-portal.driver-vehicle-licensing.api.gov.uk/'}
              </p>
            </div>

            <button
              type="submit"
              disabled={savingKey}
              className="rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:opacity-50"
            >
              {savingKey ? 'Saving...' : dvlaConfigured ? 'Update Key' : 'Save Key'}
            </button>
          </form>

          {/* Test Lookup */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-white">Test DVLA Lookup</h4>
            <p className="mt-1 text-xs text-slate-400">
              Test your DVLA API key by looking up a vehicle registration
            </p>

            <form onSubmit={handleTestLookup} className="mt-3 flex gap-2">
              <input
                type="text"
                value={testReg}
                onChange={(e) => setTestReg(e.target.value.toUpperCase())}
                placeholder="e.g. AA19ABC"
                maxLength={8}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
              <button
                type="submit"
                disabled={testing || !dvlaConfigured}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-orange hover:text-white disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
            </form>

            {testResult && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm">
                {testResult.ok && testResult.data ? (
                  <div className="space-y-1 text-slate-300">
                    <p>
                      <span className="font-medium text-white">Make:</span>{' '}
                      {testResult.data.make || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium text-white">Model:</span>{' '}
                      {testResult.data.model || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium text-white">Engine Size:</span>{' '}
                      {testResult.data.engineSizeCc ? `${testResult.data.engineSizeCc}cc` : 'N/A'}
                    </p>
                    {testResult.data.recommendation && (
                      <p>
                        <span className="font-medium text-white">Recommended Tier:</span>{' '}
                        {testResult.data.recommendation.engineTierName || 'N/A'}
                        {testResult.data.recommendation.pricePence &&
                          ` (£${(testResult.data.recommendation.pricePence / 100).toFixed(2)})`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-red-300">
                    Lookup failed. {testResult.allowManual ? 'Manual entry allowed.' : 'Please check your API key.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Future integrations placeholder */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">Other Integrations</h3>
        <p className="mt-1 text-sm text-slate-400">Additional integrations coming soon...</p>
        <div className="mt-4 space-y-2">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
            Payment Gateway (Stripe/PayPal) - Coming soon
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
            SMS Notifications (Twilio) - Coming soon
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-400">
            Accounting Software (Xero/QuickBooks) - Coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
