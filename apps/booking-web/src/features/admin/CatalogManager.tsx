import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';

interface Service {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
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

  const [serviceForm, setServiceForm] = useState({ code: '', name: '', description: '' });
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

  const handleCreateService = async (event: FormEvent) => {
    event.preventDefault();
    if (!serviceForm.code || !serviceForm.name) {
      setError('Service code and name are required.');
      return;
    }
    await apiPost('/admin/catalog/services', {
      code: serviceForm.code.trim(),
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || undefined,
    });
    setServiceForm({ code: '', name: '', description: '' });
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

  const deleteService = async (service: Service) => {
    if (!window.confirm(`Delete service "${service.name}"?`)) {
      return;
    }
    await apiDelete(`/admin/catalog/services/${service.id}`);
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

  const updatePrice = async (price: ServicePrice) => {
    const value = window.prompt(
      `Set price for ${price.service?.name ?? price.serviceId} / ${price.engineTier?.name ?? price.engineTierId}`,
      String(price.amountPence),
    );
    if (!value) {
      return;
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      window.alert('Invalid price.');
      return;
    }
    await apiPost('/admin/catalog/prices', {
      serviceId: price.serviceId,
      engineTierId: price.engineTierId,
      amountPence: amount,
    });
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-brand-black">Catalog</h2>
        <p className="text-sm text-slate-600">Manage services, tiers, and pricing.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading catalog...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-medium text-brand-black">Services</h3>
            <form onSubmit={handleCreateService} className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Code</label>
                <input
                  value={serviceForm.code}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Name</label>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500"
                >
                  Add service
                </button>
              </div>
            </form>

            <ul className="space-y-2 text-sm">
              {services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-3 rounded border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-brand-black">
                      {service.name}{' '}
                      <span className="text-xs text-slate-500">({service.code})</span>
                    </p>
                    {service.description ? <p className="text-xs text-slate-600">{service.description}</p> : null}
                    <p className="text-xs text-slate-500">Status: {service.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => renameService(service)}
                      className="rounded border border-slate-300 px-2 py-1 hover:border-brand-orange"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleService(service)}
                      className="rounded border border-slate-300 px-2 py-1 hover:border-brand-orange"
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteService(service)}
                      className="rounded border border-red-200 px-2 py-1 text-red-600 hover:border-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-medium text-brand-black">Engine tiers</h3>
              <form onSubmit={handleCreateTier} className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Name</label>
                  <input
                    value={tierForm.name}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Max CC</label>
                  <input
                    value={tierForm.maxCc}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, maxCc: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="leave blank"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Sort order</label>
                  <input
                    value={tierForm.sortOrder}
                    onChange={(event) => setTierForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
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
                  <li key={tier.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
                    <div>
                      <p className="font-semibold text-brand-black">{tier.name}</p>
                      <p className="text-xs text-slate-500">Sort order {tier.sortOrder} • Max CC {tier.maxCc ?? '—'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'name')}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:border-brand-orange"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'maxCc')}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:border-brand-orange"
                      >
                        Max CC
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTierField(tier, 'sortOrder')}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:border-brand-orange"
                      >
                        Order
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTier(tier)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-medium text-brand-black">Service prices</h3>
              <p className="text-xs text-slate-500">Click a price to update it (stored in pence).</p>
              <ul className="space-y-2 text-sm">
                {prices.map((price) => (
                  <li key={`${price.serviceId}-${price.engineTierId}`} className="flex items-center justify-between rounded border border-slate-200 p-3">
                    <div>
                      <p className="font-semibold text-brand-black">
                        {price.service?.name ?? `Service ${price.serviceId}`}{' '}
                        / {price.engineTier?.name ?? `Tier ${price.engineTierId}`}
                      </p>
                      <p className="text-xs text-slate-500">{formatPrice(price.amountPence)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrice(price)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:border-brand-orange"
                    >
                      Update price
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}