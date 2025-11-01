import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../lib/api';

interface ManualBookingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Service {
  id: number;
  code: string;
  name: string;
  pricingMode: 'FIXED' | 'TIERED';
  fixedPricePence: number | null;
  isActive: boolean;
}

interface EngineTier {
  id: number;
  name: string;
  maxCc: number | null;
  sortOrder: number;
}

interface ServicePrice {
  id: number;
  serviceId: number;
  engineTierId: number | null;
  amountPence: number;
}

export function ManualBookingForm({ onClose, onSuccess }: ManualBookingFormProps) {
  // Common services (no MOT / Tyres)
  const commonServices = [
    'Full Service',
    'Interim Service',
    'Oil & Filter Change',
    'Diagnostics',
    'Brake Pads (Front)',
    'Brake Pads (Rear)',
    'Brake Discs + Pads (Front)',
    'Brake Discs + Pads (Rear)',
    'Brake Fluid Change',
    'Air-Con Re-gas',
    'Battery Replacement',
    'Coolant Flush',
    'Spark Plugs Replacement',
    'Timing Belt/Chain Service',
    'Suspension Check/Repair',
  ];
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPostcode, setCustomerPostcode] = useState('');

  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleEngineSizeCc, setVehicleEngineSizeCc] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [priceOverride, setPriceOverride] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(true); // default custom pricing for manual bookings

  // Service selection mode
  const [serviceMode, setServiceMode] = useState<'CATALOG' | 'NEW'>('CATALOG');
  const [newServiceName, setNewServiceName] = useState('');
  const [newPricingMode, setNewPricingMode] = useState<'FIXED' | 'TIERED'>('FIXED');
  const [newFixedPrice, setNewFixedPrice] = useState('');

  const [schedulingMode, setSchedulingMode] = useState<'SLOT' | 'CUSTOM'>('CUSTOM');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');

  const [internalNotes, setInternalNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PAID' | 'PARTIAL'>('UNPAID');

  // Data loading
  const [services, setServices] = useState<Service[]>([]);
  const [tiers, setTiers] = useState<EngineTier[]>([]);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesResponse, tiersResponse, pricesResponse] = await Promise.all([
          apiGet<Service[]>('/catalog/services'),
          apiGet<EngineTier[]>('/admin/engine-tiers'),
          apiGet<ServicePrice[]>('/catalog/prices'),
        ]);
        setServices(servicesResponse.filter((s) => s.isActive));
        setTiers(tiersResponse);
        setPrices(pricesResponse);
      } catch (err) {
        setError((err as Error).message ?? 'Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const calculatedPrice = (): number | null => {
    // Highest priority: explicit custom price override
    if (useCustomPrice && priceOverride) {
      const val = parseFloat(priceOverride);
      if (Number.isFinite(val) && val >= 0) return Math.round(val * 100);
      return null;
    }

    // New (inline) service with fixed price
    if (serviceMode === 'NEW' && newPricingMode === 'FIXED' && newFixedPrice) {
      const val = parseFloat(newFixedPrice);
      if (Number.isFinite(val) && val >= 0) return Math.round(val * 100);
      return null;
    }

    // Catalog services
    if (!selectedService) return null;
    if (selectedService.pricingMode === 'FIXED') {
      return selectedService.fixedPricePence;
    }
    if (selectedTierId) {
      const price = prices.find((p) => p.serviceId === selectedServiceId && p.engineTierId === selectedTierId);
      return price?.amountPence ?? null;
    }
    return null;
  };

  const ensureServiceId = async (): Promise<number | null> => {
    if (serviceMode === 'CATALOG' && selectedServiceId) return selectedServiceId;

    // Create a new catalog service quickly and return its id
    const name = newServiceName.trim();
    if (!name) {
      setError('Please provide a name for the new service');
      return null;
    }
    const codeBase = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const code = `MANUAL-${Date.now()}-${codeBase}`.slice(0, 64);
    const payload: any = {
      code,
      name,
      pricingMode: newPricingMode,
      isActive: true,
    };
    if (newPricingMode === 'FIXED' && newFixedPrice) {
      payload.fixedPricePence = Math.round(parseFloat(newFixedPrice) * 100);
    }

    try {
      const created = await apiPost<{ id: number }>(
        '/admin/catalog/services',
        payload,
      );
      setSelectedServiceId(created.id);
      return created.id;
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create service');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Customer phone is required');
      return;
    }
    if (!vehicleRegistration.trim()) {
      setError('Vehicle registration is required');
      return;
    }
    // If creating a new service inline, create it now
    let serviceIdToUse = selectedServiceId;
    if (serviceMode === 'NEW' || !serviceIdToUse) {
      const createdId = await ensureServiceId();
      if (!createdId) return; // error already set
      serviceIdToUse = createdId;
    }
    if (selectedService?.pricingMode === 'TIERED' && !selectedTierId && !useCustomPrice) {
      setError('Please select an engine tier or use custom price');
      return;
    }
    if (!slotDate || !slotTime) {
      setError('Please select a date and time');
      return;
    }

    const pricePence = calculatedPrice();
    if (pricePence === null) {
      setError('Could not calculate price');
      return;
    }

    try {
      setSubmitting(true);
      await apiPost('/admin/bookings/manual', {
        customer: {
          name: customerName.trim(),
          email: customerEmail.trim() || undefined,
          phone: customerPhone.trim(),
          addressLine1: customerAddress.trim() || undefined,
          city: customerCity.trim() || undefined,
          postcode: customerPostcode.trim() || undefined,
        },
        vehicle: {
          registration: vehicleRegistration.trim().toUpperCase(),
          make: vehicleMake.trim() || undefined,
          model: vehicleModel.trim() || undefined,
          engineSizeCc: vehicleEngineSizeCc ? parseInt(vehicleEngineSizeCc, 10) : undefined,
        },
        services: [
          {
            serviceId: serviceIdToUse!,
            engineTierId: selectedTierId || undefined,
            priceOverridePence:
              useCustomPrice && priceOverride
                ? Math.round(parseFloat(priceOverride) * 100)
                : serviceMode === 'NEW' && newPricingMode === 'FIXED' && newFixedPrice
                ? Math.round(parseFloat(newFixedPrice) * 100)
                : undefined,
          },
        ],
        scheduling: {
          mode: schedulingMode,
          slotDate: schedulingMode === 'SLOT' ? slotDate : undefined,
          slotTime: schedulingMode === 'SLOT' ? slotTime : undefined,
          customDate: schedulingMode === 'CUSTOM' ? `${slotDate}T${slotTime}:00` : undefined,
        },
        internalNotes: internalNotes.trim() || undefined,
        paymentStatus,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex justify-center overflow-y-auto bg-black/70 px-4 py-10">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-8">
          <p className="text-center text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 px-4 py-10">
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-bold text-white">Create Manual Booking</h2>
          <button
            onClick={onClose}
            className="text-slate-400 transition hover:text-white"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative space-y-8 pb-28">
          {/* Customer Section */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Customer Details</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="07700 900000"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Address</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">City</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="London"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Postcode</label>
                  <input
                    type="text"
                    value={customerPostcode}
                    onChange={(e) => setCustomerPostcode(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle Section */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Vehicle Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Registration <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={vehicleRegistration}
                  onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-mono text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="AB12 CDE"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Engine Size (cc)</label>
                <input
                  type="number"
                  value={vehicleEngineSizeCc}
                  onChange={(e) => setVehicleEngineSizeCc(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="1600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Make</label>
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Ford"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Model</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Focus"
                />
              </div>
            </div>
          </section>

          {/* Service Section */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Service & Pricing</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Service <span className="text-red-400">*</span>
                </label>
                <select
                  value={serviceMode === 'NEW' ? 'NEW' : selectedServiceId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedTierId(null);
                    setPriceOverride('');
                    if (value === 'NEW') {
                      setServiceMode('NEW');
                      setSelectedServiceId(null);
                      setUseCustomPrice(true);
                      return;
                    }
                    if (value.startsWith('COMMON:')) {
                      setServiceMode('NEW');
                      setSelectedServiceId(null);
                      setNewServiceName(value.slice('COMMON:'.length));
                      setUseCustomPrice(true);
                      return;
                    }
                    const id = value ? parseInt(value, 10) : null;
                    setSelectedServiceId(id);
                    setServiceMode('CATALOG');
                    const svc = services.find((s) => s.id === id!);
                    setUseCustomPrice(!svc ? true : false);
                  }}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                >
                  <option value="">Select a service...</option>
                  <option value="NEW">➕ Create New Service…</option>
                  <optgroup label="Common Services">
                    {commonServices.map((name) => (
                      <option key={name} value={`COMMON:${name}`}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Online Services (Catalog)">
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.pricingMode})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {serviceMode === 'NEW' && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-300">Service Name</label>
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="e.g., Full Service"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">Pricing Mode</label>
                      <select
                        value={newPricingMode}
                        onChange={(e) => setNewPricingMode(e.target.value as 'FIXED' | 'TIERED')}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      >
                        <option value="FIXED">Fixed</option>
                        <option value="TIERED">Tiered</option>
                      </select>
                    </div>
                    {newPricingMode === 'FIXED' && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-300">Default Fixed Price (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newFixedPrice}
                          onChange={(e) => setNewFixedPrice(e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          placeholder="e.g., 79.95"
                        />
                      </div>
                    )}
                    <div className="md:col-span-2 text-xs text-slate-400">
                      A new service will be created in the catalog and selected for this booking.
                    </div>
                  </div>
                </div>
              )}

              {serviceMode === 'CATALOG' && selectedService?.pricingMode === 'TIERED' && !useCustomPrice && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Engine Tier <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedTierId ?? ''}
                    onChange={(e) => setSelectedTierId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    required={!useCustomPrice}
                  >
                    <option value="">Select engine tier...</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} {tier.maxCc ? `(up to ${tier.maxCc}cc)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomPrice"
                  checked={useCustomPrice}
                  onChange={(e) => {
                    setUseCustomPrice(e.target.checked);
                    if (!e.target.checked) setPriceOverride('');
                  }}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                />
                <label htmlFor="useCustomPrice" className="text-sm text-slate-300">
                  Use custom price
                </label>
              </div>

              {useCustomPrice && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Custom Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="79.95"
                  />
                </div>
              )}

              {calculatedPrice() !== null && (
                <div className="rounded-lg border border-orange-500/30 bg-slate-800 p-4">
                  <p className="text-sm text-orange-200">
                    Price: <span className="text-lg font-bold text-orange-400">£{(calculatedPrice()! / 100).toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Scheduling Section */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Scheduling</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedulingMode"
                    value="SLOT"
                    checked={schedulingMode === 'SLOT'}
                    onChange={() => setSchedulingMode('SLOT')}
                    className="h-4 w-4 border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="text-sm text-slate-300">Use available slots</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedulingMode"
                    value="CUSTOM"
                    checked={schedulingMode === 'CUSTOM'}
                    onChange={() => setSchedulingMode('CUSTOM')}
                    className="h-4 w-4 border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="text-sm text-slate-300">Custom date/time</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Additional Info */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-white">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Internal Notes (Staff Only)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  rows={3}
                  placeholder="Any additional notes for staff..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'UNPAID' | 'PAID' | 'PARTIAL')}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="sticky bottom-0 z-20 mt-6 border-t border-slate-700 bg-slate-900 pb-3 pt-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-600 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
