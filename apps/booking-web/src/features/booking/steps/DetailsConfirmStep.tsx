import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { RecaptchaWidget } from '../../../components/RecaptchaWidget';
import { apiDelete, apiPatch, apiPost } from '../../../lib/api';
import { AUTH_EVENT_NAME, getToken } from '../../../lib/auth';
import { useBookingWizard } from '../state';
import type {
  BookingDocumentSummary,
  ConfirmBookingResponse,
  CreateBookingResponse,
} from '../types';

type SuccessState = {
  reference: string;
  invoice: BookingDocumentSummary;
  quote: BookingDocumentSummary;
  totalAmountPence: number;
};

const captchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const captchaRequired = Boolean(captchaSiteKey);

const detailsSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().min(6, 'Phone number is required'),
    notes: z.string().max(500, 'Notes must be 500 characters or fewer').optional(),
    captchaToken: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (captchaRequired && (!values.captchaToken || values.captchaToken.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please complete the reCAPTCHA before confirming.',
        path: ['captchaToken'],
      });
    }
  });

type DetailsFormValues = z.infer<typeof detailsSchema>;

const priceFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const formatPrice = (pricePence?: number) => {
  if (typeof pricePence !== 'number') return 'N/A';
  return priceFormatter.format(pricePence / 100);
};

export function DetailsConfirmStep() {
  const location = useLocation();
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete, reset } = useBookingWizard();
  const [token, setToken] = useState<string | null>(() => getToken());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthChange = () => setToken(getToken());
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
    };
  }, []);

  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    mode: 'onChange',
    defaultValues: {
      name: draft.customer?.name ?? '',
      email: draft.customer?.email ?? '',
      phone: draft.customer?.phone ?? '',
      notes: draft.customer?.notes ?? '',
      captchaToken: '',
    },
  });

  const captchaToken = form.watch('captchaToken');

  const bookingReady = useMemo(
    () =>
      Boolean(
        draft.serviceId &&
          draft.engineTierId &&
          typeof draft.pricePence === 'number' &&
          draft.vehicle &&
          draft.date &&
          draft.time &&
          draft.holdId,
      ),
    [draft.engineTierId, draft.holdId, draft.pricePence, draft.serviceId, draft.time, draft.date, draft.vehicle],
  );

  const handleBack = () => {
    navigate('../date-time');
  };

  const releaseHoldIfAny = async () => {
    if (draft.holdId) {
      try {
        await apiDelete(`/holds/${draft.holdId}`);
      } catch {
        /* ignore */
      }
      updateDraft({ holdId: undefined, holdExpiresAt: undefined });
    }
  };

  const handleStartAgain = async () => {
    await releaseHoldIfAny();
    reset();
    navigate('/online-booking');
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      setSubmitError('You need to log in to confirm a booking.');
      toast.error('Please log in to finish confirming your booking.');
      const redirectTarget = location.pathname + location.search;
      navigate('/login', { state: { from: redirectTarget || '/online-booking/details-confirm' } });
      return;
    }

    if (!bookingReady) {
      setSubmitError('Booking details are incomplete. Please check previous steps.');
      toast.error('Booking details look incomplete. Please review earlier steps.');
      return;
    }

    const loaderId = toast.loading('Confirming your booking…');

    try {
      setSubmitError(null);
      setIsSubmitting(true);

      const customerDetails = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        notes: values.notes?.trim() || undefined,
      };

      updateDraft({ customer: customerDetails });

      const booking = await apiPost<CreateBookingResponse>('/bookings', {
        serviceId: draft.serviceId,
        engineTierId: draft.engineTierId,
        pricePence: draft.pricePence,
        vehicle: draft.vehicle,
        date: draft.date!,
        time: draft.time!,
        holdId: draft.holdId,
        customer: customerDetails,
      });

      const bookingId = extractBookingId(booking);


      const confirmation = await apiPatch<ConfirmBookingResponse>(`/bookings/${bookingId}/confirm`, {
        captchaToken: values.captchaToken || 'dev-captcha-token',
      });

      // release hold after confirm (best-effort)
      await releaseHoldIfAny();

      const reference = confirmation.reference || String(bookingId);
      const successState: SuccessState = {
        reference,
        invoice: confirmation.documents.invoice,
        quote: confirmation.documents.quote,
        totalAmountPence: confirmation.booking.totalAmountPence,
      };

      markStepComplete('details-confirm');
      reset();
      form.reset({ name: '', email: '', phone: '', notes: '', captchaToken: '' });
      toast.dismiss(loaderId);
      toast.success('Booking confirmed. We have emailed your documents.');
      navigate('/online-booking/success', { state: successState });
    } catch (error) {
      toast.dismiss(loaderId);
      const message = (error as Error).message || 'Unable to confirm booking.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const disableSubmit = !token || !bookingReady || isSubmitting || (captchaRequired && !captchaToken);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-brand-black">5. Details &amp; Confirm</h2>
        <p className="text-slate-600">
          Provide your contact details and confirm your booking. We will send a confirmation email once completed.
        </p>
      </header>

      <section className="rounded border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-medium text-brand-black">Booking summary</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Service</dt>
            <dd>
              {draft.serviceName ?? 'N/A'}{' '}
              {draft.engineTierName || draft.engineTierCode ? (
                <span className="text-slate-500">
                  ({draft.engineTierName ?? 'Unknown'}
                  {draft.engineTierCode ? ` - ${draft.engineTierCode}` : ''})
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Vehicle</dt>
            <dd>
              {draft.vehicle?.vrm ?? 'N/A'}{' '}
              {draft.vehicle?.make ? <span className="text-slate-500">({draft.vehicle.make})</span> : null}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Preferred date</dt>
            <dd>{draft.date ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Preferred time</dt>
            <dd>{draft.time ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Estimated total</dt>
            <dd>{formatPrice(draft.pricePence)}</dd>
          </div>
        </dl>
      </section>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="details-name">
              Full name
            </label>
            <input
              id="details-name"
              type="text"
              autoComplete="name"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="details-email">
              Email address
            </label>
            <input
              id="details-email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="details-phone">
              Phone number
            </label>
            <input
              id="details-phone"
              type="tel"
              autoComplete="tel"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...form.register('phone')}
            />
            {form.formState.errors.phone ? (
              <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="details-notes">
              Additional notes (optional)
            </label>
            <textarea
              id="details-notes"
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...form.register('notes')}
            />
            {form.formState.errors.notes ? (
              <p className="text-xs text-red-600">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <RecaptchaWidget
            className="rounded border border-slate-200 bg-slate-50 p-3"
            fallbackLabel="I confirm I am not a robot."
            onChange={(tokenValue) => form.setValue('captchaToken', tokenValue ?? '', { shouldValidate: true })}
          />
          {form.formState.errors.captchaToken ? (
            <p className="text-xs text-red-600">{form.formState.errors.captchaToken.message}</p>
          ) : null}
        </div>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleStartAgain}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-400"
            >
              Start again
            </button>
          </div>

          <button
            type="submit"
            disabled={disableSubmit}
            className="rounded bg-brand-orange px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Confirming…' : 'Confirm booking'}
          </button>
        </div>
      </form>
    </div>
  );
}

function extractBookingId(resp: unknown): string {
  if (resp && typeof resp === 'object') {
    const r = resp as { bookingId?: unknown; id?: unknown };
    if (typeof r.bookingId === 'string' || typeof r.bookingId === 'number') {
      return String(r.bookingId);
    }
    if (typeof r.id === 'string' || typeof r.id === 'number') {
      return String(r.id);
    }
  }
  throw new Error('Booking id missing in response');
}


export default DetailsConfirmStep;
