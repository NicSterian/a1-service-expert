import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { TurnstileWidget } from "../../../components/TurnstileWidget";
import { LoadingIndicator } from "../../../components/LoadingIndicator";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/api";
import { AUTH_EVENT_NAME, clearAuthToken, getAuthToken, setAuthToken } from "../../../lib/auth";
import { useBookingWizard } from "../state";
import type { BookingDraft, BookingDocumentSummary, ConfirmBookingResponse, CreateBookingResponse } from "../types";

type AccountUser = {
  email: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  mobileNumber: string | null;
  landlineNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  marketingOptIn: boolean;
  notes: string | null;
};

type LoginResponse = { token: string; user: AccountUser };
type RegisterResponse = { user: AccountUser };
type ProfileResponse = { user: AccountUser };

type SuccessState = {
  reference: string;
  invoice: BookingDocumentSummary;
  quote: BookingDocumentSummary;
  totalAmountPence: number;
};
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

const accountSchema = z
  .object({
    email: z.string({ required_error: 'Email is required' }).email('Enter a valid email address').max(120),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  });

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v);

const profileSchema = z.object({
  title: z.enum(['MR', 'MRS', 'MISS', 'MS'], { errorMap: () => ({ message: 'Select a title' }) }),
  firstName: z.string({ required_error: 'First name is required' }).min(2),
  lastName: z.string({ required_error: 'Last name is required' }).min(2),
  companyName: z.preprocess(emptyToUndefined, z.string().max(120).optional()).optional(),
  mobileNumber: z.string({ required_error: 'Mobile number is required' }).min(6),
  landlineNumber: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  addressLine1: z.string({ required_error: 'Address line 1 is required' }).min(2),
  addressLine2: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  addressLine3: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  city: z.string({ required_error: 'Town or city is required' }).min(2),
  county: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  postcode: z.string({ required_error: 'Postcode is required' }).regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'),
  marketingOptIn: z.boolean().optional(),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()).optional(),
  acceptedTerms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms to continue.' }),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const formatCurrency = (value?: number) => (typeof value !== 'number' ? 'N/A' : currencyFormatter.format(value / 100));

const computeHoldRemaining = (expiresAt?: string) => {
  if (!expiresAt) return 0;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, expiry - Date.now());
};

const formatHoldCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const normaliseTitle = (value: string | null | undefined): ProfileFormValues['title'] => {
  if (!value) return 'MR';
  const upper = value.toUpperCase();
  return ['MR', 'MRS', 'MISS', 'MS'].includes(upper) ? (upper as ProfileFormValues['title']) : 'MR';
};

const trimOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const uppercasePostcode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

const extractAppointmentDisplay = (date?: string, time?: string) => {
  if (!date || !time) return null;
  const iso = `${date}T${time}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return { dateLabel: format(parsed, 'EEEE d MMMM yyyy'), timeLabel: format(parsed, 'HH:mm') };
};

const buildProfileDefaults = (draft: BookingDraft, user: AccountUser | null): ProfileFormValues => ({
  title: normaliseTitle(draft.customer?.title ?? user?.title),
  firstName: draft.customer?.firstName ?? user?.firstName ?? '',
  lastName: draft.customer?.lastName ?? user?.lastName ?? '',
  companyName: draft.customer?.companyName ?? user?.companyName ?? undefined,
  mobileNumber: draft.customer?.mobileNumber ?? user?.mobileNumber ?? '',
  landlineNumber: draft.customer?.landlineNumber ?? user?.landlineNumber ?? undefined,
  addressLine1: draft.customer?.addressLine1 ?? user?.addressLine1 ?? '',
  addressLine2: draft.customer?.addressLine2 ?? user?.addressLine2 ?? undefined,
  addressLine3: draft.customer?.addressLine3 ?? user?.addressLine3 ?? undefined,
  city: draft.customer?.city ?? user?.city ?? '',
  county: draft.customer?.county ?? user?.county ?? '',
  postcode: draft.customer?.postcode ?? user?.postcode ?? '',
  marketingOptIn: draft.customer?.marketingOptIn ?? user?.marketingOptIn ?? false,
  notes: draft.customer?.notes ?? draft.bookingNotes ?? user?.notes ?? undefined,
  acceptedTerms: draft.customer?.acceptedTerms ?? false,
});

const buildCustomerPayload = (profile: ProfileFormValues, email: string) => ({
  title: profile.title,
  firstName: profile.firstName.trim(),
  lastName: profile.lastName.trim(),
  companyName: trimOrUndefined(profile.companyName),
  email: email.trim(),
  mobileNumber: profile.mobileNumber.trim(),
  landlineNumber: trimOrUndefined(profile.landlineNumber),
  addressLine1: profile.addressLine1.trim(),
  addressLine2: trimOrUndefined(profile.addressLine2),
  addressLine3: trimOrUndefined(profile.addressLine3),
  city: profile.city.trim(),
  county: trimOrUndefined(profile.county),
  postcode: uppercasePostcode(profile.postcode),
  marketingOptIn: profile.marketingOptIn ?? false,
  acceptedTerms: profile.acceptedTerms,
  name: `${profile.title ? `${profile.title} ` : ''}${profile.firstName.trim()} ${profile.lastName.trim()}`.replace(/\s+/g, ' ').trim(),
  phone: profile.mobileNumber.trim(),
  notes: trimOrUndefined(profile.notes),
});

function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:text-slate-700">×</button>
        {children}
      </div>
    </div>
  );
}

function LoginModal({ open, onClose, onLoggedIn }: { open: boolean; onClose: () => void; onLoggedIn: (payload: { token: string; user: AccountUser }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setBusy(true);
      const response = await apiPost<LoginResponse>('/auth/login', { email: email.trim(), password }, { skipAuth: true });
      onLoggedIn({ token: response.token, user: response.user });
      toast.success('Welcome back!');
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Login failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell open={open} onClose={onClose}>
      <h3 className="mb-3 text-lg font-semibold text-brand-black">Login to your account</h3>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email address *</label>
          <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password *</label>
          <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span />
          <button type="button" onClick={() => { onClose(); document.dispatchEvent(new CustomEvent('open-forgot-password')); }} className="text-blue-700 underline">Forgotten password?</button>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!canSubmit} className="rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Logging in...' : 'Login'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const canSubmit = email.trim().length > 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    toast.success("If the email exists, we'll send a reset link.");
    onClose();
  };
  return (
    <ModalShell open={open} onClose={onClose}>
      <h3 className="mb-3 text-lg font-semibold text-brand-black">Forgotten password</h3>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email address *</label>
          <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!canSubmit} className="rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Continue</button>
        </div>
      </form>
    </ModalShell>
  );
}
export function DetailsConfirmStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete, reset: resetWizard, loginPanelOpen, setLoginPanelOpen } = useBookingWizard();
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [holdRemainingMs, setHoldRemainingMs] = useState(() => computeHoldRemaining(draft.holdExpiresAt));
  const [confirmCaptchaToken, setConfirmCaptchaToken] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const accountSectionRef = useRef<HTMLDivElement | null>(null);
  const accountDraftRef = useRef<string>('');
  const profileDraftRef = useRef<string>('');

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: 'onChange',
    shouldFocusError: false,
    defaultValues: { email: draft.account?.email ?? draft.customer?.email ?? '', password: draft.account?.password ?? '', confirmPassword: '' },
  });
  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), mode: 'onChange', shouldFocusError: false, defaultValues: buildProfileDefaults(draft, null) });

  const bookingReady = useMemo(
    () => Boolean(
      draft.serviceId &&
      // engine tier not required for fixed-price services; rely on price presence
      typeof draft.pricePence === 'number' &&
      draft.vehicle &&
      draft.date &&
      draft.time &&
      draft.holdId
    ),
    [draft.serviceId, draft.pricePence, draft.vehicle, draft.date, draft.time, draft.holdId],
  );

  const appointmentSummary = useMemo(() => extractAppointmentDisplay(draft.date, draft.time), [draft.date, draft.time]);
  const holdActive = holdRemainingMs > 0;
  const accountEmail = accountForm.watch('email');

  // Fallback validity derived from schema to avoid RHF isValid edge cases
  const [accountSchemaValid, setAccountSchemaValid] = useState(false);
  const [profileSchemaValid, setProfileSchemaValid] = useState(false);
  const [profileSchemaError, setProfileSchemaError] = useState<string | null>(null);

  useEffect(() => {
    const sub = accountForm.watch((_, { name }) => {
      try {
        const res = accountSchema.safeParse(accountForm.getValues());
        setAccountSchemaValid(res.success);
      } catch {
        setAccountSchemaValid(false);
      }
      // Keep confirm password validation responsive when either field changes
      if (name === 'password' || name === 'confirmPassword') {
        accountForm.trigger('confirmPassword');
      }
    });
    // initialise once
    setAccountSchemaValid(accountSchema.safeParse(accountForm.getValues()).success);
    return () => sub.unsubscribe();
  }, [accountForm]);

  useEffect(() => {
    const sub = profileForm.watch(() => {
      try {
        const res = profileSchema.safeParse(profileForm.getValues());
        setProfileSchemaValid(res.success);
        setProfileSchemaError(res.success ? null : res.error.issues[0]?.message ?? 'Invalid details');
      } catch {
        setProfileSchemaValid(false);
        setProfileSchemaError('Invalid details');
      }
    });
    try {
      const res = profileSchema.safeParse(profileForm.getValues());
      setProfileSchemaValid(res.success);
      setProfileSchemaError(res.success ? null : res.error.issues[0]?.message ?? 'Invalid details');
    } catch {
      setProfileSchemaValid(false);
      setProfileSchemaError('Invalid details');
    }
    return () => sub.unsubscribe();
  }, [profileForm]);

  const accountSectionValid = currentUser ? true : (accountForm.formState.isValid || accountSchemaValid);
  const detailsSectionValid = profileForm.formState.isValid || profileSchemaValid;

  const disableConfirmButton = !bookingReady || !holdActive || !accountSectionValid || !detailsSectionValid || !confirmCaptchaToken || confirming;

  const disabledReasons: string[] = [];
  if (!bookingReady) disabledReasons.push('booking not ready');
  if (!holdActive) disabledReasons.push('hold expired');
  if (!accountSectionValid) disabledReasons.push('account invalid');
  if (!detailsSectionValid) disabledReasons.push('details invalid');
  if (!confirmCaptchaToken) disabledReasons.push('security check missing');
  if (confirming) disabledReasons.push('confirming');
  const disabledTitle = disableConfirmButton && disabledReasons.length ? `Cannot confirm: ${disabledReasons.join('; ')}${!detailsSectionValid && profileSchemaError ? ` — ${profileSchemaError}` : ''}` : undefined;

  useEffect(() => {
    const handleAuthChange = () => setToken(getAuthToken());
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    return () => window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
  }, []);

  useEffect(() => {
    if (!draft.holdExpiresAt) { setHoldRemainingMs(0); return; }
    const update = () => setHoldRemainingMs(computeHoldRemaining(draft.holdExpiresAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [draft.holdExpiresAt]);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      // Initialise forms from draft once for guests; don't keep resetting on draft changes
      accountForm.reset({ email: draft.account?.email ?? draft.customer?.email ?? '', password: draft.account?.password ?? '', confirmPassword: '' });
      profileForm.reset(buildProfileDefaults(draft, null));
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    apiGet<ProfileResponse>('/auth/me')
      .then((response) => {
        if (cancelled) return;
        setCurrentUser(response.user);
        profileForm.reset(buildProfileDefaults(draft, response.user));
        accountForm.reset({ email: response.user.email, password: '', confirmPassword: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setCurrentUser(null);
        const msg = String((error as Error)?.message ?? '');
        if (!/not found/i.test(msg) && !/cannot get/i.test(msg)) {
          toast.error(msg || 'Unable to load your profile.');
        }
      })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!loginPanelOpen) return;
    setTimeout(() => {
      accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setLoginPanelOpen(false);
      setLoginModalOpen(true);
    }, 100);
  }, [loginPanelOpen, setLoginPanelOpen]);

  useEffect(() => {
    const handler = () => setForgotModalOpen(true);
    document.addEventListener('open-forgot-password', handler as EventListener);
    return () => document.removeEventListener('open-forgot-password', handler as EventListener);
  }, []);

  useEffect(() => {
    const subscription = accountForm.watch((values) => {
      const sanitized = { email: values.email?.trim() ?? '', password: values.password ?? '' };
      const serialised = JSON.stringify(sanitized);
      if (accountDraftRef.current === serialised) return;
      accountDraftRef.current = serialised;
      const nextAccount = { email: sanitized.email || undefined, password: sanitized.password || undefined };
      const nextCustomer = { ...(draft.customer ?? {}), email: sanitized.email || undefined };
      updateDraft({ account: nextAccount, customer: nextCustomer });
    });
    return () => subscription.unsubscribe();
  }, [accountForm, draft.customer, updateDraft]);

  useEffect(() => {
    const subscription = profileForm.watch((values) => {
      const sanitisedCustomer = {
        title: values.title,
        firstName: values.firstName,
        lastName: values.lastName,
        companyName: trimOrUndefined(values.companyName),
        email: accountEmail?.trim() || undefined,
        mobileNumber: values.mobileNumber,
        landlineNumber: trimOrUndefined(values.landlineNumber),
        addressLine1: values.addressLine1,
        addressLine2: trimOrUndefined(values.addressLine2),
        addressLine3: trimOrUndefined(values.addressLine3),
        city: values.city,
        county: values.county,
        postcode: values.postcode,
        marketingOptIn: values.marketingOptIn,
        acceptedTerms: values.acceptedTerms,
        notes: trimOrUndefined(values.notes),
      };
      const serialised = JSON.stringify(sanitisedCustomer);
      if (profileDraftRef.current === serialised) return;
      profileDraftRef.current = serialised;
      updateDraft({ customer: sanitisedCustomer, bookingNotes: trimOrUndefined(values.notes) });
    });
    return () => subscription.unsubscribe();
  }, [profileForm, accountEmail, draft.bookingNotes, draft.customer, updateDraft]);

  const releaseHoldIfAny = useCallback(async () => {
    if (!draft.holdId) return;
    try { await apiDelete(`/holds/${draft.holdId}`); } catch {}
    updateDraft({ holdId: undefined, holdExpiresAt: undefined });
  }, [draft.holdId, updateDraft]);

  const handleBack = () => { navigate('../date-time'); };
  const handleStartAgain = async () => { await releaseHoldIfAny(); resetWizard(); navigate('/online-booking'); };
  const handleLogout = () => { clearAuthToken(); toast.success('You have signed out. Sign back in or create an account to continue.'); };
  const handleConfirm: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setConfirmError(null);
    if (!bookingReady) { toast.error('Please finish the earlier steps before confirming.'); return; }
    if (!holdActive) { toast.error('Your reserved slot has expired. Choose a new date and time.'); return; }
    if (!confirmCaptchaToken) { toast.error('Complete the security check before confirming.'); return; }

    const detailsOk = await profileForm.trigger(undefined, { shouldFocus: false });
    if (!detailsOk) {
      const firstError = Object.values(profileForm.formState.errors)[0];
      const firstMsg = (firstError as any)?.message || 'Please review your details.';
      toast.error(String(firstMsg));
      return;
    }
    const values = profileForm.getValues();

    if (!token || !currentUser) {
      const validAccount = await accountForm.trigger();
      if (!validAccount) {
        toast.error('Enter your email and matching passwords to create your account.');
        accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const accountValues = accountForm.getValues();
      const registerPayload = {
        email: accountValues.email.trim(),
        password: accountValues.password,
        captchaToken: confirmCaptchaToken || 'dev-captcha-token',
        title: values.title,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        companyName: trimOrUndefined(values.companyName),
        mobileNumber: values.mobileNumber.trim(),
        landlineNumber: trimOrUndefined(values.landlineNumber),
        addressLine1: values.addressLine1.trim(),
        addressLine2: trimOrUndefined(values.addressLine2),
        addressLine3: trimOrUndefined(values.addressLine3),
        city: values.city.trim(),
        county: trimOrUndefined(values.county),
        postcode: uppercasePostcode(values.postcode),
        marketingOptIn: values.marketingOptIn ?? false,
        notes: trimOrUndefined(values.notes),
      };
      try {
        await apiPost<RegisterResponse>('/auth/register', registerPayload, { skipAuth: true });
        const loginResponse = await apiPost<LoginResponse>('/auth/login', { email: registerPayload.email, password: accountValues.password }, { skipAuth: true });
        setAuthToken(loginResponse.token);
        setCurrentUser(loginResponse.user);
        setToken(loginResponse.token);
        accountForm.reset({ email: loginResponse.user.email, password: '', confirmPassword: '' });
        toast.success('Account created and signed in.');
      } catch (error) {
        setConfirmError((error as Error)?.message ?? 'Unable to create your account.');
        toast.error((error as Error)?.message ?? 'Unable to create your account.');
        return;
      }
    }

    const email = accountEmail?.trim() || currentUser?.email || '';
    const customerPayload = buildCustomerPayload(values, email);
    const bookingNotes = trimOrUndefined(values.notes);
    const loader = toast.loading('Finalising your booking...');
    setConfirming(true);
    try {
      // Skip account profile syncing here. The `/account/profile` PATCH endpoint is unavailable and booking payload already
      // carries the up-to-date customer information needed for fulfilment.
      updateDraft({ customer: { ...customerPayload, notes: bookingNotes }, bookingNotes });
      const booking = await apiPost<CreateBookingResponse>('/bookings', {
        serviceId: draft.serviceId, engineTierId: draft.engineTierId, pricePence: draft.pricePence, vehicle: draft.vehicle, date: draft.date, time: draft.time, holdId: draft.holdId, customer: customerPayload, bookingNotes,
      });
      const bookingId = extractBookingId(booking);
      const confirmation = await apiPatch<ConfirmBookingResponse>(`/bookings/${bookingId}/confirm`, { captchaToken: confirmCaptchaToken || 'dev-captcha-token' });
      await releaseHoldIfAny();
      markStepComplete('details-confirm');
      resetWizard();
      const successState: SuccessState = { reference: confirmation.reference || String(bookingId), invoice: confirmation.documents.invoice, quote: confirmation.documents.quote, totalAmountPence: confirmation.documents.invoice.totalAmountPence };
      toast.success('Booking confirmed. We have emailed your documents.');
      navigate(`/account`, { replace: true, state: successState });
    } catch (error) {
      setConfirmError((error as Error)?.message ?? 'Unable to confirm your booking.');
      toast.error((error as Error)?.message ?? 'Unable to confirm your booking.');
    } finally {
      toast.dismiss(loader);
      setConfirming(false);
    }
  };
  const appointment = appointmentSummary;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Confirm your booking</h1>
            <p className="text-sm text-slate-300">Review the summary below, make sure your details are correct, then complete the security check to finalise.</p>
          </div>
          <div className="rounded-full bg-slate-800 px-4 py-2 text-xs uppercase tracking-wide text-slate-200">Step 4 of 4</div>
        </header>
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-2xl bg-slate-800/60 p-4"><p className="text-xs uppercase text-slate-400">Service</p><p className="text-lg font-semibold text-white">{draft.serviceName ?? 'Service not selected'}</p><p className="mt-1 text-slate-300">{draft.serviceDescription ?? 'Select a service to see the summary here.'}</p></div>
          <div className="rounded-2xl bg-slate-800/60 p-4"><p className="text-xs uppercase text-slate-400">Vehicle</p><p className="text-lg font-semibold text-white">{draft.vehicle?.make || draft.vehicle?.model ? `${draft.vehicle.make ?? ''} ${draft.vehicle.model ?? ''}`.trim() : 'Vehicle not captured'}</p><p className="mt-1 text-slate-300">{draft.vehicle?.vrm ? `VRM: ${draft.vehicle.vrm}` : 'VRM will appear once entered.'}</p></div>
          <div className="rounded-2xl bg-slate-800/60 p-4"><p className="text-xs uppercase text-slate-400">Appointment</p>{appointment ? (<><p className="text-lg font-semibold text-white">{appointment.dateLabel}</p><p className="mt-1 text-slate-300">{appointment.timeLabel}</p></>) : (<p className="text-slate-300">Choose a date and time to secure a slot.</p>)}</div>
          <div className="rounded-2xl bg-slate-800/60 p-4"><p className="text-xs uppercase text-slate-400">Total</p><p className="text-lg font-semibold text-white">{formatCurrency(draft.pricePence)}</p><p className="mt-1 text-slate-300">Engine tier: {draft.engineTierName ?? 'Not selected'}</p></div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-300">{holdActive ? (<span>Your slot is reserved for the next <span className="font-semibold text-white">{formatHoldCountdown(holdRemainingMs)}</span>. Confirm before it expires.</span>) : (<span className="font-semibold text-amber-200">This hold has expired. Pick a new date and time to continue.</span>)}</div>
          <button type="button" onClick={handleStartAgain} className="self-start rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800">Start over</button>
        </div>
      </section>

      <section ref={accountSectionRef} id="booking-account-section" className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">1. Account information</h2>
            {!currentUser ? (
              <p className="text-sm text-slate-300">Already have an account? <button type="button" onClick={() => setLoginModalOpen(true)} className="font-semibold text-brand-orange underline">Click here to login</button>.</p>
            ) : null}
          </div>
          <div />
        </header>
        {loadingProfile ? (
          <div className="mt-4"><LoadingIndicator label="Loading your profile..." /></div>
        ) : currentUser ? (
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-100 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-white">Signed in</p>
              <p className="text-slate-200">{currentUser.email}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleLogout} className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:border-brand-orange hover:text-brand-orange">Sign out</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor="account-email">Email address</label>
                <input id="account-email" type="email" autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...accountForm.register('email')} />
                {accountForm.formState.errors.email ? (<p className="mt-1 text-xs text-red-300">{accountForm.formState.errors.email.message}</p>) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor="account-password">Password</label>
                <input id="account-password" type="password" autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...accountForm.register('password')} />
                {accountForm.formState.errors.password ? (<p className="mt-1 text-xs text-red-300">{accountForm.formState.errors.password.message}</p>) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor="account-password-confirm">Repeat password</label>
                <input id="account-password-confirm" type="password" autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...accountForm.register('confirmPassword')} />
                {accountForm.formState.errors.confirmPassword ? (<p className="mt-1 text-xs text-red-300">{accountForm.formState.errors.confirmPassword.message}</p>) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <form className="space-y-6" onSubmit={handleConfirm} noValidate>
        <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
          <h2 className="text-xl font-semibold text-white">2. Your details</h2>
          <p className="mt-1 text-sm text-slate-300">These details will appear on your booking confirmation and help us prepare for your visit.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-200" htmlFor="profile-title">Title</label>
              <select id="profile-title" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('title')}>
                <option value="MR">Mr</option>
                <option value="MRS">Mrs</option>
                <option value="MISS">Miss</option>
                <option value="MS">Ms</option>
              </select>
              {profileForm.formState.errors.title ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.title.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200" htmlFor="profile-company">Company name (optional)</label>
              <input id="profile-company" type="text" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('companyName')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">First name</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('firstName')} />
              {profileForm.formState.errors.firstName ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.firstName.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Last name</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('lastName')} />
              {profileForm.formState.errors.lastName ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.lastName.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Mobile number</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('mobileNumber')} />
              {profileForm.formState.errors.mobileNumber ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.mobileNumber.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Landline number (optional)</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('landlineNumber')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Address line 1</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('addressLine1')} />
              {profileForm.formState.errors.addressLine1 ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.addressLine1.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Address line 2 (optional)</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('addressLine2')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Address line 3 (optional)</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('addressLine3')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Town / city</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('city')} />
              {profileForm.formState.errors.city ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.city.message as string}</p>) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">County (optional)</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('county')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200">Postcode</label>
              <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" {...profileForm.register('postcode')} />
              {profileForm.formState.errors.postcode ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.postcode.message as string}</p>) : null}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" rows={4} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-orange-500" placeholder="Anything we should know before your visit?" {...profileForm.register('notes')} />
              {profileForm.formState.errors.notes ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.notes.message}</p>) : null}
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand-orange focus:ring-orange-500" {...profileForm.register('marketingOptIn')} />
                <span>Send me reminders and occasional offers (optional)</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-start gap-2 text-sm text-slate-200">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand-orange focus:ring-orange-500" {...profileForm.register('acceptedTerms')} />
                <span>I agree to the <a href="/terms" className="text-brand-orange underline">terms</a> and <a href="/privacy" className="text-brand-orange underline">privacy policy</a>.</span>
              </label>
              {profileForm.formState.errors.acceptedTerms ? (<p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.acceptedTerms.message}</p>) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
          <h2 className="text-xl font-semibold text-white">3. Final checks</h2>
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
            <TurnstileWidget className="flex justify-center" onChange={(tokenValue) => setConfirmCaptchaToken(tokenValue ?? '')} fallbackLabel="I confirm I am not a robot." />
            <p className="text-xs text-slate-300">Complete the security check, then confirm. We'll email your confirmation and documents instantly.</p>
            {confirmError ? <p className="text-sm text-red-300">{confirmError}</p> : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:bg-orange-500 hover:text-black">← Back</button>
              <button type="button" onClick={handleStartAgain} className="rounded-full border border-slate-600 bg-slate-900 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-800 hover:text-orange-400">Start again</button>
            </div>
            <button type="submit" disabled={disableConfirmButton} title={disabledTitle} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-black transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70">{confirming ? 'Confirming...' : 'Confirm'}</button>
          </div>
        </section>
      </form>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLoggedIn={({ token: t, user }) => { setAuthToken(t); setToken(t); setCurrentUser(user); }} />
      <ForgotPasswordModal open={forgotModalOpen} onClose={() => setForgotModalOpen(false)} />
    </div>
  );
}

function extractBookingId(response: CreateBookingResponse | { bookingId?: unknown; id?: unknown }): string {
  if (response && typeof response === 'object') {
    if (typeof response.bookingId === 'number' || typeof response.bookingId === 'string') return String(response.bookingId);
    if (typeof response.id === 'number' || typeof response.id === 'string') return String(response.id);
  }
  throw new Error('Booking identifier missing in response');
}

export default DetailsConfirmStep;
