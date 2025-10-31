import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import toast from 'react-hot-toast';

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

  const applyFixedMenuPrices = async () => {
    try {
      const svcByCode = new Map<string, number>();
      services.forEach((s) => svcByCode.set(s.code, s.id));
      const tierByName = new Map<string, number>();
      tiers.forEach((t) => tierByName.set(t.name, t.id));

      const table: Array<{ code: string; tier: string; pence: number }> = [
        { code: 'SERVICE_1', tier: 'Small', pence: 7995 },
        { code: 'SERVICE_1', tier: 'Medium', pence: 8995 },
        { code: 'SERVICE_1', tier: 'Large', pence: 9995 },
        { code: 'SERVICE_1', tier: 'Ex-Large', pence: 10995 },
        { code: 'SERVICE_2', tier: 'Small', pence: 11995 },
        { code: 'SERVICE_2', tier: 'Medium', pence: 12995 },
        { code: 'SERVICE_2', tier: 'Large', pence: 13995 },
        { code: 'SERVICE_2', tier: 'Ex-Large', pence: 15995 },
        { code: 'SERVICE_3', tier: 'Small', pence: 17995 },
        { code: 'SERVICE_3', tier: 'Medium', pence: 17995 },
        { code: 'SERVICE_3', tier: 'Large', pence: 19995 },
        { code: 'SERVICE_3', tier: 'Ex-Large', pence: 21995 },
      ];

      const ops = table.map((row) => {
        const sid = svcByCode.get(row.code);
        const tid = tierByName.get(row.tier);
        if (!sid || !tid) return null;
        return apiPut('/admin/catalog/prices', { serviceId: sid, engineTierId: tid, amountPence: row.pence });
      }).filter(Boolean) as Array<Promise<unknown>>;

      await Promise.all(ops);
      await refresh();
      toast.success('Fixed menu prices applied');
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Failed to apply prices');
    }
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
          <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
            <h3 className="text-lg font-medium text-white">Services</h3>
            <form onSubmit={handleCreateService} className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Code</label>
                <input
                  value={serviceForm.code}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">Name</label>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-brand-orange px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Add service
                </button>
              </div>
            </form>

            <ul className="space-y-2 text-sm">
              {services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-3 rounded border border-slate-700 bg-slate-800 p-3">
                  <div>
                    <p className="font-semibold text-white">
                      {service.name}{' '}
                      <span className="text-xs text-slate-400">({service.code})</span>
                    </p>
                    {service.description ? <p className="text-xs text-slate-300">{service.description}</p> : null}
                    <p className="text-xs text-slate-400">Status: {service.isActive ? 'Active' : 'Inactive'}</p>
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
                      onClick={() => toggleService(service)}
                      className="rounded border border-slate-700 px-2 py-1 text-white hover:border-orange-500"
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteService(service)}
                      className="rounded border border-red-500/30 px-2 py-1 text-red-300 hover:border-red-400"
                    >
                      Delete
                    </button>
                  </div>
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

            <div className="space-y-3 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-inner">
              <h3 className="text-lg font-medium text-white">Service prices</h3>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Click a price to update it (stored in pence).</p>
                <button type="button" onClick={applyFixedMenuPrices} className="rounded bg-brand-orange px-2 py-1 text-xs text-white hover:bg-orange-500">Apply fixed menu prices</button>
              </div>
              <ul className="space-y-2 text-sm">
                {prices.map((price) => (
                  <li key={`${price.serviceId}-${price.engineTierId}`} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 p-3">
                    <div>
                      <p className="font-semibold text-white">
                        {price.service?.name ?? `Service ${price.serviceId}`}{' '}
                        / {price.engineTier?.name ?? `Tier ${price.engineTierId}`}
                      </p>
                      <p className="text-xs text-slate-400">{formatPrice(price.amountPence)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrice(price)}
                      className="rounded border border-slate-700 px-2 py-1 text-xs text-white hover:border-orange-500"
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

