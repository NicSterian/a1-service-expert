import type { AdminBookingResponse } from './AdminBookingDetailPage';

export function DocumentsPanel(props: { booking: AdminBookingResponse }) {
  const { booking } = props;
  const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  const formatDate = (value: string | null) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB');
  };
  const formatDateTime = (value: string | null) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-GB');
  };

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
      <div className="mt-4 space-y-3">
        {booking.documents.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">No documents issued.</div>
        ) : (
          booking.documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-semibold text-white">{document.number}</div>
                <div className="text-xs text-slate-400">
                  {document.type} · {document.status} · {formatDateTime(document.createdAt)}
                </div>
                <div className="text-xs text-slate-400">
                  Total {currency.format(document.totalAmountPence / 100)} (VAT {currency.format(document.vatAmountPence / 100)})
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-300">
                {document.pdfUrl ? (
                  <a href={document.pdfUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                    Download PDF
                  </a>
                ) : (
                  <span className="text-slate-500">PDF pending</span>
                )}
                {document.dueAt && <span className="text-slate-400">Due {formatDate(document.dueAt)}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

