import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import { ServiceForm } from './components/ServiceForm';
import toast from 'react-hot-toast';

interface Service {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  pricingMode?: 'TIERED' | 'FIXED';
  fixedPricePence?: number | null;
  showInWizard?: boolean;
  showInPricingTable?: boolean;
  sortOrder?: number;
}

interface EngineTier {
  id: number;
  name: string;
  maxCc?: number | null;
  sortOrder: number;
}

interface ServicePrice {
  id: number;
  serviceId: number;
  engineTierId: number;
  amountPence: number;
  service?: { name: string };
  engineTier?: { name: string };
}

type NewServicePayload = {
  code: string;
  name: string;
  description?: string;
  pricingMode: 'TIERED' | 'FIXED';
  fixedPricePence?: number;
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const formatPrice = (amountPence: number) => currencyFormatter.format(amountPence / 100);

export function CatalogManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [tiers, setTiers] = useState<EngineTier[]>([]);
  const [prices, setPrices] = useState<ServicePrice[]>([]);

  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    description: '',
    pricingMode: 'TIERED' as 'TIERED' | 'FIXED',
    fixedPrice: '',
  });
  const [tierForm, setTierForm] = useState({ name: '', maxCc: '', sortOrder: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [svc, et, pr] = await Promise.all([
          apiGet<Service[]>('/admin/catalog/services'),
          apiGet<EngineTier[]>('/admin/catalog/engine-tiers'),
          apiGet<ServicePrice[]>('/admin/catalog/prices'),
        ]);
        if (cancelled) {
          return;
        }
        setServices(svc);
        setTiers(et);
        setPrices(pr);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load catalog.');
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

  const refresh = async () => {
    const [svc, et, pr] = await Promise.all([
      apiGet<Service[]>('/admin/catalog/services'),
      apiGet<EngineTier[]>('/admin/catalog/engine-tiers'),
      apiGet<ServicePrice[]>('/admin/catalog/prices'),
    ]);
    setServices(svc);
    setTiers(et);
    setPrices(pr);
  };

  // Helper kept for reference but unused
  

  const handleCreateService = async (event: FormEvent) => {
    event.preventDefault();
    if (!serviceForm.code || !serviceForm.name) {
      setError('Service code and name are required.');
      return;
    }
    const payload: NewServicePayload = {
      code: serviceForm.code.trim(),
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || undefined,
      pricingMode: serviceForm.pricingMode,
    };
    if (serviceForm.pricingMode === 'FIXED') {
      const cleaned = serviceForm.fixedPrice.replace(/[^0-9.]/g, '');
      const amount = cleaned ? Math.round(Number(cleaned) * 100) : 0;
      payload.fixedPricePence = amount;
    }
    await apiPost('/admin/catalog/services', payload);
    setServiceForm({ code: '', name: '', description: '', pricingMode: 'TIERED', fixedPrice: '' });
    await refresh();
  };

  const toggleService = async (service: Service) => {
    await apiPatch(`/admin/catalog/services/${service.id}`, { isActive: !service.isActive });
    await refresh();
  };

  const renameService = async (service: Service) => {
    const name = window.prompt('Enter new service name', service.name);
    if (!name) {
      return;
    }
    await apiPatch(`/admin/catalog/services/${service.id}`, { name: name.trim() });
    await refresh();
  };

  const editServiceDescription = async (service: Service) => {
    const current = service.description ?? '';
    const desc = window.prompt('Edit service description', current);
    if (desc === null) return;
    await apiPatch(`/admin/catalog/services/${service.id}`, { description: desc.trim() || null });
    await refresh();
  };

  const toggleShowInWizard = async (service: Service) => {
    await apiPatch(`/admin/catalog/services/${service.id}`, { showInWizard: !service.showInWizard });
    await refresh();
  };

  const toggleShowInTable = async (service: Service) => {
    await apiPatch(`/admin/catalog/services/${service.id}`, { showInPricingTable: !service.showInPricingTable });
    await refresh();
  };

  const moveService = async (service: Service, dir: -1 | 1) => {
    // Sort services by sortOrder to find adjacent service
    const sorted = [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentIndex = sorted.findIndex((s) => s.id === service.id);

    if (currentIndex === -1) return;

    const targetIndex = currentIndex + dir;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetService = sorted[targetIndex];
    const currentOrder = service.sortOrder ?? 0;
    const targetOrder = targetService.sortOrder ?? 0;

    // Swap the sortOrder values
    await Promise.all([
      apiPatch(`/admin/catalog/services/${service.id}`, { sortOrder: targetOrder }),
      apiPatch(`/admin/catalog/services/${targetService.id}`, { sortOrder: currentOrder }),
    ]);
    await refresh();
  };

  const deleteService = async (service: Service) => {
    if (!window.confirm(`Delete service "${service.name}"?`)) {
      return;
    }
    await apiDelete(`/admin/catalog/services/${service.id}`);
    await refresh();
  };

  const removeDuplicates = async () => {
    // Find duplicates by exact name match
    const nameMap = new Map<string, Service[]>();
    services.forEach((service) => {
      const existing = nameMap.get(service.name) || [];
      existing.push(service);
      nameMap.set(service.name, existing);
    });

    const duplicates: Service[] = [];
    nameMap.forEach((items) => {
      if (items.length > 1) {
        // Keep the first one (lowest ID), mark rest as duplicates
        const sorted = items.sort((a, b) => a.id - b.id);
        duplicates.push(...sorted.slice(1));
      }
    });

    if (duplicates.length === 0) {
      toast.success('No duplicate services found');
      return;
    }

    const names = duplicates.map((s) => s.name).join(', ');
    if (!window.confirm(`Found ${duplicates.length} duplicate service(s): ${names}\n\nDelete duplicates?`)) {
      return;
    }

    await Promise.all(duplicates.map((s) => apiDelete(`/admin/catalog/services/${s.id}`)));
    await refresh();
    toast.success(`Removed ${duplicates.length} duplicate service(s)`);
  };

  const setServicePricingMode = async (service: Service) => {
    const next = window.prompt('Set pricing mode: TIERED or FIXED', service.pricingMode ?? 'TIERED');
    if (!next) return;
    const mode = next.toUpperCase() === 'FIXED' ? 'FIXED' : 'TIERED';
    await apiPatch(`/admin/catalog/services/${service.id}`, { pricingMode: mode });
    await refresh();
  };

  const setServiceFixedPrice = async (service: Service) => {
    const initial = typeof service.fixedPricePence === 'number' ? String(service.fixedPricePence / 100) : '';
    const value = window.prompt(`Set fixed price (GBP) for ${service.name}`, initial);
    if (value === null) return;
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return;
    const pounds = Number(cleaned);
    if (!Number.isFinite(pounds) || pounds < 0) {
      toast.error('Invalid price');
      return;
    }
    await apiPatch(`/admin/catalog/services/${service.id}`, { fixedPricePence: Math.round(pounds * 100) });
    await refresh();
  };

  const priceFor = (serviceId: number, engineTierId: number) => {
    const p = prices.find((x) => x.serviceId === serviceId && x.engineTierId === engineTierId);
    return p?.amountPence ?? null;
  };

  const setTierPrice = async (service: Service, tier: EngineTier) => {
    const current = priceFor(service.id, tier.id);
    const value = window.prompt(`Set price for ${service.name} / ${tier.name} (pence)`, String(current ?? 0));
    if (value === null) return;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Invalid price');
      return;
    }
    await apiPut('/admin/catalog/prices', { serviceId: service.id, engineTierId: tier.id, amountPence: amount });
    await refresh();
  };

  const handleCreateTier = async (event: FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/catalog/engine-tiers', {
      name: tierForm.name.trim(),
      sortOrder: Number(tierForm.sortOrder),
      maxCc: tierForm.maxCc ? Number(tierForm.maxCc) : null,
    });
    setTierForm({ name: '', maxCc: '', sortOrder: '' });
    await refresh();
  };

  const updateTierField = async (tier: EngineTier, field: 'name' | 'sortOrder' | 'maxCc') => {
    const current = field === 'name' ? tier.name : field === 'sortOrder' ? String(tier.sortOrder) : String(tier.maxCc ?? '');
    const input = window.prompt(`Update ${field}`, current ?? '');
    if (input === null) {
      return;
    }
    const payload: Record<string, unknown> = {};
    if (field === 'name') {
      payload.name = input.trim();
    } else if (field === 'sortOrder') {
      payload.sortOrder = Number(input);
    } else {
      payload.maxCc = input.trim() ? Number(input) : null;
    }
    await apiPatch(`/admin/catalog/engine-tiers/${tier.id}`, payload);
    await refresh();
  };

  const deleteTier = async (tier: EngineTier) => {
    if (!window.confirm(`Delete tier "${tier.name}"?`)) {
      return;
    }
    await apiDelete(`/admin/catalog/engine-tiers/${tier.id}`);
    await refresh();
  };

  // Helper kept for reference but unused
  

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Catalog</h2>
        <p className="text-sm text-slate-400">Manage services, tiers, and pricing.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading catalog...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
            <h3 className="text-lg font-medium text-white">Services</h3>
            <ServiceForm value={serviceForm} onChange={(patch) => setServiceForm((prev) => ({ ...prev, ...patch }))} onSubmit={handleCreateService} />
            <div>
              <button
                type="button"
                onClick={removeDuplicates}
                className="rounded-full border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-orange-500"
              >
                Remove duplicates
              </button>
            </div>

            <ul className="space-y-2 text-sm">
              {services.map((service) => (
                <li key={service.id} className="space-y-3 rounded border border-slate-700 bg-slate-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{service.name}</p>
                      {service.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">{service.description}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-500">Code: <span className="font-mono">{service.code}</span></p>
                      <p className="text-xs text-slate-400">Status: {service.isActive ? 'Active' : 'Inactive'}</p>
                      <p className="text-xs text-slate-400">Pricing: {service.pricingMode ?? 'TIERED'}{service.pricingMode === 'FIXED' ? ` @ ${formatPrice(service.fixedPricePence ?? 0)}` : ''}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <button type="button" onClick={() => toggleShowInWizard(service)} className={`rounded border px-2 py-1 ${service.showInWizard ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300'} hover:border-orange-500`}>
                          {service.showInWizard ? 'In Wizard' : 'Add to Wizard'}
                        </button>
                        <button type="button" onClick={() => toggleShowInTable(service)} className={`rounded border px-2 py-1 ${service.showInPricingTable ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300'} hover:border-orange-500`}>
                          {service.showInPricingTable ? 'In Pricing Table' : 'Add to Pricing Table'}
                        </button>
                        <span className="text-slate-500">Order: {service.sortOrder ?? 0}</span>
                        <button type="button" onClick={() => moveService(service, -1)} className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-orange-500">Up</button>
                        <button type="button" onClick={() => moveService(service, 1)} className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-orange-500">Down</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => renameService(service)}
                      className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => editServiceDescription(service)}
                      className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                    >
                      Edit description
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleService(service)}
                      className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setServicePricingMode(service)}
                      className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                    >
                      Set pricing mode
                    </button>
                    {service.pricingMode === 'FIXED' && (
                      <button
                        type="button"
                        onClick={() => setServiceFixedPrice(service)}
                        className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                      >
                        Set fixed price
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteService(service)}
                      className="rounded border border-red-500/30 px-2 py-1 text-red-300 hover:border-red-400"
                    >
                      Delete
                    </button>
                    </div>
                  </div>

                  {service.pricingMode !== 'FIXED' && (
                    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tier prices</p>
                      <div className="flex flex-wrap gap-2">
                        {tiers.map((tier) => {
                          const p = priceFor(service.id, tier.id);
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setTierPrice(service, tier)}
                              className="inline-flex max-w-full items-center gap-1 truncate rounded border border-slate-700 bg-slate-800 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-orange-500"
                              title={`${tier.name} ${typeof p === 'number' ? formatPrice(p) : '-'}`}
                            >
                              <span className="text-slate-400 truncate">{tier.name}</span>
                              <span className="font-semibold text-white truncate">{typeof p === 'number' ? formatPrice(p) : '-'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
              <h3 className="text-lg font-medium text-white">Engine tiers</h3>
              <form onSubmit={handleCreateTier} className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Name</label>
                  <input
                    value={tierForm.name}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Max CC</label>
                  <input
                    value={tierForm.maxCc}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, maxCc: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    placeholder="leave blank"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Sort order</label>
                  <input
                    value={tierForm.sortOrder}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500"
                  >
                    Add tier
                  </button>
                </div>
              </form>

              <ul className="space-y-2 text-sm">
                {tiers.map((tier) => (
                  <li key={tier.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 p-3">
                    <div>
                      <p className="font-semibold text-white">{tier.name}</p>
                      <p className="text-xs text-slate-400">Sort order {tier.sortOrder} · Max CC {tier.maxCc ?? '—'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'name')}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-white hover:border-orange-500"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'maxCc')}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-white hover:border-orange-500"
                      >
                        Max CC
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'sortOrder')}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-white hover:border-orange-500"
                      >
                        Order
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTier(tier)}
                        className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:border-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Service prices list removed in favour of per-service tier editors above */}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * CatalogManager (Admin)
 *
 * Purpose
 * - Manage services, engine tiers, and tiered prices.
 *
 * Refactor Plan
 * - Split forms into ServiceForm, TierForm, PriceGrid components.
 * - Encapsulate API calls behind a small catalog client module.
 */
