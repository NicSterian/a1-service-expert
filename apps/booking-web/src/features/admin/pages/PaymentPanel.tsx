import type { AdminBookingResponse, PaymentStatus } from './AdminBookingDetailPage';

export function PaymentPanel(props: {
  totalServices: string;
  invoiceTotal: string;
  invoiceVat: string;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (next: PaymentStatus) => void;
  options: { value: PaymentStatus; label: string }[];
  onSavePayment: () => void;
  onCreateInvoiceDraft: () => void;
  onCreateQuoteDraft: () => void;
  onIssueInvoice: () => void;
  onEmailInvoice: () => void;
  loading: boolean;
  hasInvoice: boolean;
  latestInvoice?: AdminBookingResponse['documents'][number];
}) {
  const {
    totalServices,
    invoiceTotal,
    invoiceVat,
    paymentStatus,
    setPaymentStatus,
    options,
    onSavePayment,
    onCreateInvoiceDraft,
    onCreateQuoteDraft,
    onIssueInvoice,
    onEmailInvoice,
    loading,
    hasInvoice,
    latestInvoice,
  } = props;

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB');
  };

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment</h3>
      <div className="mt-4 space-y-3">
        <div className="text-sm text-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Services total</div>
          <div className="text-lg font-semibold text-white">{totalServices}</div>
        </div>
        <div className="text-sm text-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Invoice total</div>
          <div className="text-lg font-semibold text-white">{invoiceTotal}</div>
          <div className="text-xs text-slate-400">VAT {invoiceVat}</div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment status</label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paymentStatus === null ? 'null' : paymentStatus}
              onChange={(event) => {
                const value = event.target.value;
                setPaymentStatus(value === 'null' ? null : (value as PaymentStatus));
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              {options.map((option) => (
                <option key={option.label} value={option.value ?? 'null'}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={onSavePayment}
              className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-700/40"
              type="button"
              disabled={loading}
            >
              Save
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCreateInvoiceDraft}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            type="button"
            disabled={loading}
          >
            Create invoice draft
          </button>
          <button
            onClick={onCreateQuoteDraft}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            type="button"
            disabled={loading}
          >
            Create quote draft
          </button>
          <button
            onClick={onIssueInvoice}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            type="button"
            disabled={loading}
          >
            Issue invoice
          </button>
          <button
            onClick={onEmailInvoice}
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            type="button"
            disabled={loading || !hasInvoice}
          >
            Email invoice
          </button>
        </div>
        {latestInvoice && (
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-3 text-xs text-slate-300">
            Latest invoice:
            <div className="mt-1 font-semibold text-white">{latestInvoice.number}</div>
            <div>Issued {formatDateTime(latestInvoice.issuedAt)}</div>
            <div>
              <a
                href={latestInvoice.pdfUrl ?? undefined}
                className="text-orange-300 underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                Download PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

