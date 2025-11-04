import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';
import toast from 'react-hot-toast';

type Doc = {
  id: number;
  number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | string;
  payload: any;
  dueAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string | null;
};

export function InvoiceEditor({ id }: { id: number }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currency = useMemo(() => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }), []);

  const [customer, setCustomer] = useState({ name: '', email: '', addressLine1: '', addressLine2: '', city: '', postcode: '' });
  const [lines, setLines] = useState<Array<{ description: string; quantity: string; unitPricePence: string; vatRatePercent?: string }>>([
    { description: '', quantity: '1', unitPricePence: '0' },
  ]);
  const [items, setItems] = useState<Array<{ code?: string; description: string; defaultQty?: number; unitPricePence: number; vatPercent?: number }>>([]);
  const [dueAt, setDueAt] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [markAsPaidOnIssue, setMarkAsPaidOnIssue] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string>('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const d = await apiGet<Doc>(`/admin/documents/${id}`);
        if (cancelled) return;
        setDoc(d);
        const p = (d.payload as any) || {};
        setCustomer({
          name: p.customer?.name || '',
          email: p.customer?.email || '',
          addressLine1: p.customer?.addressLine1 || '',
          addressLine2: p.customer?.addressLine2 || '',
          city: p.customer?.city || '',
          postcode: p.customer?.postcode || '',
        });
        const ls: any[] = Array.isArray(p.lines) ? p.lines : [];
        setLines(
          ls.length > 0
            ? ls.map((l) => ({ description: l.description || '', quantity: String(l.quantity ?? '1'), unitPricePence: String(l.unitPricePence ?? '0'), vatRatePercent: l.vatRatePercent != null ? String(l.vatRatePercent) : undefined }))
            : [{ description: '', quantity: '1', unitPricePence: '0' }],
        );
        setDueAt(d.dueAt ? d.dueAt.slice(0, 10) : '');
        setPaymentNotes(p.paymentNotes || '');
      } catch (err) {
        toast.error((err as Error).message ?? 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    };
    load();
    // Load reusable items
    apiGet<any>('/admin/settings').then((s) => {
      const arr = (s.invoiceItemsJson as any[]) || [];
      setItems(arr);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: '1', unitPricePence: '0' }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      const payload = {
        customer,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity || '0'), unitPricePence: Number(l.unitPricePence || '0'), vatRatePercent: l.vatRatePercent != null ? Number(l.vatRatePercent) : undefined })),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        paymentNotes: paymentNotes || null,
      };
      const updated = await apiPatch<Doc>(`/admin/documents/${doc.id}`, payload);
      setDoc(updated);
      toast.success('Draft saved');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const issue = async () => {
    if (!doc) return;
    if (!customer.name || customer.name.trim() === '') {
      toast.error('Customer name is required to issue invoice');
      return;
    }
    try {
      await save();
      let issued = await apiPost<Doc>(`/admin/documents/${doc.id}/issue`, {});

      // If mark as paid is checked, immediately mark it as paid (receipt)
      if (markAsPaidOnIssue) {
        issued = await apiPatch<Doc>(`/admin/documents/${doc.id}`, {
          status: 'PAID',
          paidAt: new Date().toISOString(),
          paymentMethod,
        });
        toast.success(`Invoice issued and marked as paid (${paymentMethod}) - Receipt generated`);
      } else {
        toast.success('Invoice issued');
      }

      setDoc(issued);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to issue invoice');
    }
  };

  const openEmailModal = () => {
    if (!doc) return;
    const payload = doc.payload as any;
    setEmailTo(payload?.customer?.email || '');
    setUseCustomEmail(false);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!doc) return;
    const to = useCustomEmail ? emailTo : (doc.payload as any)?.customer?.email || '';
    if (!to || !to.trim()) {
      toast.error('Email address is required');
      return;
    }
    try {
      await apiPost(`/admin/documents/${doc.id}/send`, useCustomEmail ? { to } : {});
      toast.success(`Email sent to ${to}`);
      setShowEmailModal(false);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send email');
    }
  };

  const markAsPaid = async () => {
    if (!doc) return;
    try {
      const updated = await apiPatch<Doc>(`/admin/documents/${doc.id}`, {
        status: 'PAID',
        paidAt: new Date().toISOString(),
        paymentMethod,
      });
      setDoc(updated);
      toast.success(`Invoice marked as paid (${paymentMethod})`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to mark as paid');
    }
  };

  const liveTotalPence = useMemo(() => {
    try {
      return lines.reduce((sum, l) => {
        const qty = Number(l.quantity || '0');
        const unit = Number(l.unitPricePence || '0');
        const net = Math.round(qty * unit);
        const vatRate = l.vatRatePercent != null && l.vatRatePercent !== '' ? Number(l.vatRatePercent) : 0;
        const vat = Math.round(net * (vatRate / 100));
        return sum + net + vat;
      }, 0);
    } catch {
      return 0;
    }
  }, [lines]);

  const preview = async () => {
    if (!doc) return;
    try {
      const updated = await apiPost<Doc>(`/admin/documents/${doc.id}/regenerate`, {});
      setDoc(updated);
      if (updated.pdfUrl) {
        window.open(updated.pdfUrl, '_blank');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to generate preview');
    }
  };

  const cancel = () => {
    navigate('/admin/financial');
  };

  const deleteDraft = async () => {
    if (!doc) return;
    const ok = window.confirm('Delete this draft invoice? This action cannot be undone.');
    if (!ok) return;
    try {
      await apiPost(`/admin/documents/${doc.id}/delete`, {});
      toast.success('Draft deleted');
      navigate('/admin/financial');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete draft');
    }
  };

  if (loading || !doc) {
    return <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">Loading…</div>;
  }

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Invoice Draft</h3>
        <div className="flex gap-2">
          <button onClick={cancel} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">Save</button>
          <button onClick={issue} disabled={saving} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">Issue</button>
          {doc.status !== 'DRAFT' && (
            <button onClick={openEmailModal} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-orange-300 hover:border-orange-500">Email</button>
          )}
          {doc.status === 'DRAFT' && (
            <>
              <button
                onClick={async () => {
                  await save();
                  await preview();
                }}
                className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300"
              >
                Preview
              </button>
              <button onClick={deleteDraft} className="rounded-full border border-red-500 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10">Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Address line 1" value={customer.addressLine1} onChange={(e) => setCustomer({ ...customer, addressLine1: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Address line 2" value={customer.addressLine2} onChange={(e) => setCustomer({ ...customer, addressLine2: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="City" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
              <input className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Postcode" value={customer.postcode} onChange={(e) => setCustomer({ ...customer, postcode: e.target.value })} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line Items</h4>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!Number.isNaN(idx) && idx >= 0 && items[idx]) {
                        const it = items[idx];
                        setLines((prev) => [
                          ...prev,
                          { description: it.description, quantity: String(it.defaultQty ?? 1), unitPricePence: String(it.unitPricePence), vatRatePercent: it.vatPercent != null ? String(it.vatPercent) : undefined },
                        ]);
                        e.currentTarget.selectedIndex = 0;
                      }
                    }}
                    className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-white"
                    defaultValue=""
                  >
                    <option value="">+ Add from items…</option>
                    {items.map((it, idx) => (
                      <option key={idx} value={idx}>{it.code ? `${it.code} – ` : ''}{it.description}</option>
                    ))}
                  </select>
                )}
                <button onClick={addLine} className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-orange-500 hover:text-orange-300">+ Add Line</button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <input className="md:col-span-6 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Description" value={l.description} onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                  <input className="md:col-span-2 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Qty" value={l.quantity} onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                  <input className="md:col-span-2 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Unit (pence)" value={l.unitPricePence} onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, unitPricePence: e.target.value } : x)))} />
                  <input className="md:col-span-2 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="VAT %" value={l.vatRatePercent ?? ''} onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, vatRatePercent: e.target.value } : x)))} />
                  <div className="md:col-span-12 flex justify-end">
                    <button onClick={() => removeLine(idx)} className="rounded-full border border-red-500 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
            <div className="grid grid-cols-1 gap-3">
              {doc.status === 'DRAFT' && (
                <>
                  <label className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-900 px-3 py-2">
                    <input type="checkbox" checked={markAsPaidOnIssue} onChange={(e) => setMarkAsPaidOnIssue(e.target.checked)} />
                    <span className="text-sm">Mark as Paid (Receipt)</span>
                  </label>

                  {markAsPaidOnIssue && (
                    <>
                      <label className="text-xs text-slate-400">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </>
                  )}
                </>
              )}

              <label className="text-xs text-slate-400">{markAsPaidOnIssue ? 'Payment Date (optional)' : 'Due date'}</label>
              <input type="date" className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />

              <label className="mt-2 text-xs text-slate-400">Payment notes</label>
              <textarea rows={4} className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Totals</h4>
            <div className="mt-2 text-sm text-white">
              <div>Live total (approx): {currency.format(liveTotalPence / 100)}</div>
              <div className="text-slate-400">Saved total: {currency.format((doc.totalAmountPence || 0) / 100)}</div>
            </div>
          </div>

          {/* Payment Status */}
          {doc.status === 'PAID' && doc.paidAt && (
            <div className="rounded-xl border border-green-700 bg-green-900/20 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-green-400">Payment Status</h4>
              <div className="mt-2 text-sm text-green-200">
                <div>Status: <span className="font-semibold">PAID</span></div>
                <div>Paid on: {new Date(doc.paidAt).toLocaleDateString('en-GB')}</div>
                {doc.paymentMethod && <div>Method: {doc.paymentMethod}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowEmailModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Send {doc.status === 'PAID' ? 'Receipt' : 'Invoice'} Email</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!useCustomEmail}
                    onChange={() => {
                      setUseCustomEmail(false);
                      setEmailTo((doc.payload as any)?.customer?.email || '');
                    }}
                  />
                  <span className="text-sm text-slate-200">Send to customer email</span>
                </label>
                {!useCustomEmail && (
                  <div className="ml-6 text-sm text-slate-400">
                    {(doc.payload as any)?.customer?.email || 'No customer email set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={useCustomEmail}
                    onChange={() => {
                      setUseCustomEmail(true);
                      setEmailTo('');
                    }}
                  />
                  <span className="text-sm text-slate-200">Send to custom email</span>
                </label>
                {useCustomEmail && (
                  <input
                    type="email"
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    placeholder="Enter email address"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmail}
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
