import { Link, useLocation } from 'react-router-dom';
import { BookingDocumentSummary } from './types';

type SuccessState = {
  reference?: string;
  invoice?: BookingDocumentSummary;
  quote?: BookingDocumentSummary;
  totalAmountPence?: number;
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const formatAmount = (value?: number) => {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  return currencyFormatter.format(value / 100);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const isPendingUrl = (url: string) => url.startsWith('pending://');

const DocumentCard = ({
  document,
  label,
}: {
  document: BookingDocumentSummary;
  label: string;
}) => {
  const validUntil = formatDate(document.validUntil);
  const downloadReady = document.pdfUrl && !isPendingUrl(document.pdfUrl);

  return (
    <div className="rounded border border-slate-200 bg-white p-4 text-left text-sm text-slate-700">
      <p className="font-semibold text-brand-black">{label}</p>
      <p className="mt-1">
        Number: <span className="font-semibold">{document.number}</span>
      </p>
      <p>Status: {document.status}</p>
      <p>Total: {formatAmount(document.totalAmountPence)}</p>
      <p>VAT: {formatAmount(document.vatAmountPence)}</p>
      {validUntil ? <p>Valid until: {validUntil}</p> : null}
      {downloadReady ? (
        <p className="mt-2">
          <a
            href={document.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-orange underline"
          >
            Download as PDF
          </a>
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">PDF will be available shortly.</p>
      )}
    </div>
  );
};

export function SuccessPage() {
  const location = useLocation();
  const state = (location.state as SuccessState | undefined) ?? {};
  const { reference, invoice, quote, totalAmountPence } = state;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-brand-black">Booking confirmed</h1>
        <p className="text-slate-600">
          Thank you for booking with A1 Service Expert. We have emailed your confirmation and will be in touch if anything changes.
        </p>
      </div>

      <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">
        <p className="font-medium">Your reference</p>
        <p className="text-lg font-semibold">
          {reference ? reference : 'We were unable to retrieve a reference number, but your booking is saved.'}
        </p>
        {typeof totalAmountPence === 'number' ? (
          <p className="mt-2 text-sm text-emerald-700">Total: {formatAmount(totalAmountPence)}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {invoice ? <DocumentCard document={invoice} label="Invoice" /> : null}
        {quote ? <DocumentCard document={quote} label="Quote" /> : null}
      </div>

      <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
        <p>If you need to make changes, please call or email us and have your reference ready.</p>
        <div className="flex gap-3">
          <Link
            to="/"
            className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
          >
            Return home
          </Link>
          <Link
            to="/account"
            className="rounded bg-brand-orange px-4 py-2 text-white hover:bg-orange-500"
          >
            Manage bookings
          </Link>
        </div>
      </div>
    </div>
  );
}


