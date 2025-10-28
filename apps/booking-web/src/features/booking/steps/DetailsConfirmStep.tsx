import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { TurnstileWidget } from '../../../components/TurnstileWidget';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api';
import { AUTH_EVENT_NAME, clearAuthToken, getAuthToken, setAuthToken } from '../../../lib/auth';
import { useBookingWizard } from '../state';
import type {
  BookingDraft,
  BookingDocumentSummary,
  ConfirmBookingResponse,
  CreateBookingResponse,
} from '../types';

type AccountMode = 'login' | 'register';

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

type LoginResponse = {
  token: string;
  user: AccountUser;
};

type RegisterResponse = {
  user: AccountUser;
};

type ProfileResponse = {
  user: AccountUser;
};

type SuccessState = {
  reference: string;
  invoice: BookingDocumentSummary;
  quote: BookingDocumentSummary;
  totalAmountPence: number;
};

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

const accountSchema = z
  .object({
    mode: z.enum(['login', 'register']),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Enter a valid email address')
      .max(120, 'Email is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    captchaToken: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'register') {
      if (!values.captchaToken || values.captchaToken.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Complete the security check to create your account.',
          path: ['captchaToken'],
        });
      }
    }
  });

const profileSchema = z.object({
  title: z.enum(['MR', 'MRS', 'MISS', 'MS'], {
    errorMap: () => ({ message: 'Select a title' }),
  }),
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'Enter your first name'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(2, 'Enter your last name'),
  companyName: z
    .string()
    .max(120, 'Company name must be 120 characters or fewer')
    .optional(),
  mobileNumber: z
    .string({ required_error: 'Mobile number is required' })
    .min(6, 'Enter a valid mobile number'),
  landlineNumber: z.string().min(6, 'Enter a valid landline number').optional(),
  addressLine1: z
    .string({ required_error: 'Address line 1 is required' })
    .min(2, 'Enter address line 1'),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  city: z
    .string({ required_error: 'Town or city is required' })
    .min(2, 'Enter your town or city'),
  county: z
    .string({ required_error: 'County is required' })
    .min(2, 'Enter your county'),
  postcode: z
    .string({ required_error: 'Postcode is required' })
    .regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'),
  marketingOptIn: z.boolean(),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or fewer')
    .optional(),
  acceptedTerms: z
    .boolean()
    .refine((value) => value === true, { message: 'You must accept the terms to continue.' }),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') {
    return 'N/A';
  }
  return currencyFormatter.format(value / 100);
};

const computeHoldRemaining = (expiresAt?: string) => {
  if (!expiresAt) {
    return 0;
  }
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) {
    return 0;
  }
  return Math.max(0, expiry - Date.now());
};

const formatHoldCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

const normaliseTitle = (value: string | null | undefined): ProfileFormValues['title'] => {
  if (!value) {
    return 'MR';
  }
  const upper = value.toUpperCase();
  switch (upper) {
    case 'MR':
    case 'MRS':
    case 'MISS':
    case 'MS':
      return upper as ProfileFormValues['title'];
    default:
      return 'MR';
  }
};

const trimOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const uppercasePostcode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

const extractAppointmentDisplay = (date?: string, time?: string) => {
  if (!date || !time) {
    return null;
  }
  const iso = `${date}T${time}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return {
    dateLabel: format(parsed, 'EEEE d MMMM yyyy'),
    timeLabel: format(parsed, 'HH:mm'),
  };
};

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
  county: profile.county.trim(),
  postcode: uppercasePostcode(profile.postcode),
  marketingOptIn: profile.marketingOptIn ?? false,
  acceptedTerms: profile.acceptedTerms,
});

const buildProfileUpdatePayload = (profile: ProfileFormValues) => ({
  title: profile.title,
  firstName: profile.firstName.trim(),
  lastName: profile.lastName.trim(),
  companyName: trimOrUndefined(profile.companyName),
  mobileNumber: profile.mobileNumber.trim(),
  landlineNumber: trimOrUndefined(profile.landlineNumber),
  addressLine1: profile.addressLine1.trim(),
  addressLine2: trimOrUndefined(profile.addressLine2),
  addressLine3: trimOrUndefined(profile.addressLine3),
  city: profile.city.trim(),
  county: profile.county.trim(),
  postcode: uppercasePostcode(profile.postcode),
  marketingOptIn: profile.marketingOptIn ?? false,
  notes: trimOrUndefined(profile.notes),
});

export function DetailsConfirmStep() {
  const navigate = useNavigate();
  const {
    draft,
    updateDraft,
    markStepComplete,
    reset: resetWizard,
    loginPanelOpen,
    setLoginPanelOpen,
  } = useBookingWizard();

  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(null);
  const [accountMode, setAccountMode] = useState<AccountMode>(draft.account?.mode ?? 'register');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [holdRemainingMs, setHoldRemainingMs] = useState(() => computeHoldRemaining(draft.holdExpiresAt));
  const [confirmCaptchaToken, setConfirmCaptchaToken] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const accountSectionRef = useRef<HTMLDivElement | null>(null);
  const accountDraftRef = useRef<string>('');
  const profileDraftRef = useRef<string>('');

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: 'onChange',
    defaultValues: {
      mode: draft.account?.mode ?? 'register',
      email: draft.account?.email ?? draft.customer?.email ?? '',
      password: draft.account?.password ?? '',
      captchaToken: undefined,
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: buildProfileDefaults(draft, null),
  });

  const bookingReady = useMemo(
    () =>
      Boolean(
        draft.serviceId &&
          (draft.engineTierId || draft.engineTierCode) &&
          typeof draft.pricePence === 'number' &&
          draft.vehicle &&
          draft.date &&
          draft.time &&
          draft.holdId,
      ),
    [
      draft.serviceId,
      draft.engineTierId,
      draft.engineTierCode,
      draft.pricePence,
      draft.vehicle,
      draft.date,
      draft.time,
      draft.holdId,
    ],
  );

  const appointmentSummary = useMemo(
    () => extractAppointmentDisplay(draft.date, draft.time),
    [draft.date, draft.time],
  );

  const holdActive = holdRemainingMs > 0;

  const accountEmail = accountForm.watch('email');

  const disableConfirmButton =
    !bookingReady ||
    !holdActive ||
    !token ||
    !profileForm.formState.isValid ||
    !confirmCaptchaToken ||
    confirming ||
    accountBusy ||
    profileSyncing;

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getAuthToken());
    };
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!draft.holdExpiresAt) {
      setHoldRemainingMs(0);
      return;
    }

    const update = () => {
      setHoldRemainingMs(computeHoldRemaining(draft.holdExpiresAt));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [draft.holdExpiresAt]);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      accountForm.reset({
        mode: draft.account?.mode ?? 'register',
        email: draft.account?.email ?? draft.customer?.email ?? '',
        password: draft.account?.password ?? '',
        captchaToken: undefined,
      });
      profileForm.reset(buildProfileDefaults(draft, null));
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    setAccountError(null);

    apiGet<ProfileResponse>('/account/profile')
      .then((response) => {
        if (cancelled) {
          return;
        }
        setCurrentUser(response.user);
        profileForm.reset(buildProfileDefaults(draft, response.user));
        accountForm.reset({
          mode: 'login',
          email: response.user.email,
          password: '',
          captchaToken: undefined,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setCurrentUser(null);
        const message = (error as Error)?.message ?? 'Unable to load your profile.';
        setAccountError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, accountForm, profileForm, draft]);

  useEffect(() => {
    if (!loginPanelOpen) {
      return;
    }
    setAccountMode('login');
    setTimeout(() => {
      accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setLoginPanelOpen(false);
    }, 100);
  }, [loginPanelOpen, setLoginPanelOpen]);

  useEffect(() => {
    if (draft.account?.mode !== accountMode) {
      updateDraft({
        account: {
          ...(draft.account ?? {}),
          mode: accountMode,
        },
      });
    }
  }, [accountMode, draft.account, updateDraft]);

  useEffect(() => {
    accountForm.setValue('mode', accountMode, { shouldDirty: false, shouldValidate: true });
  }, [accountForm, accountMode]);

  useEffect(() => {
    const subscription = accountForm.watch((values) => {
      const sanitized = {
        mode: values.mode,
        email: values.email?.trim() ?? '',
        password: values.password ?? '',
      };
      const serialised = JSON.stringify(sanitized);
      if (accountDraftRef.current === serialised) {
        return;
      }
      accountDraftRef.current = serialised;

      const nextAccount = {
        mode: sanitized.mode,
        email: sanitized.email || undefined,
        password: sanitized.password || undefined,
      };

      const nextCustomer = {
        ...(draft.customer ?? {}),
        email: sanitized.email || undefined,
      };

      updateDraft({
        account: nextAccount,
        customer: nextCustomer,
      });
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
      if (profileDraftRef.current === serialised) {
        return;
      }
      profileDraftRef.current = serialised;

      updateDraft({
        customer: sanitisedCustomer,
        bookingNotes: trimOrUndefined(values.notes),
      });
    });
    return () => subscription.unsubscribe();
  }, [profileForm, accountEmail, draft.bookingNotes, draft.customer, updateDraft]);
  const releaseHoldIfAny = useCallback(async () => {
    if (!draft.holdId) {
      return;
    }
    try {
      await apiDelete(`/holds/${draft.holdId}`);
    } catch {
      /* ignore */
    }
    updateDraft({ holdId: undefined, holdExpiresAt: undefined });
  }, [draft.holdId, updateDraft]);

  const handleBack = () => {
    navigate('../date-time');
  };

  const handleStartAgain = async () => {
    await releaseHoldIfAny();
    resetWizard();
    navigate('/online-booking');
  };

  const handleLogout = () => {
    clearAuthToken();
    setAccountError(null);
    toast.success('You have signed out. Sign back in or create an account to continue.');
  };
  const handleAccountSubmit = accountForm.handleSubmit(async (values) => {
    setAccountError(null);

    if (values.mode === 'register') {
      const profileValid = await profileForm.trigger();
      if (!profileValid) {
        toast.error('Check your details before creating the account.');
        return;
      }
    }

    try {
      setAccountBusy(true);
      if (values.mode === 'login') {
        const response = await apiPost<LoginResponse>(
          '/auth/login',
          {
            email: values.email.trim(),
            password: values.password,
          },
          { skipAuth: true },
        );
        setAuthToken(response.token);
        setCurrentUser(response.user);
        accountForm.reset({
          mode: 'login',
          email: response.user.email,
          password: '',
          captchaToken: undefined,
        });
        toast.success('Welcome back!');
      } else {
        const profileValues = profileForm.getValues();
        const registerPayload = {
          email: values.email.trim(),
          password: values.password,
          captchaToken: values.captchaToken ?? 'dev-captcha-token',
          title: profileValues.title,
          firstName: profileValues.firstName.trim(),
          lastName: profileValues.lastName.trim(),
          companyName: trimOrUndefined(profileValues.companyName),
          mobileNumber: profileValues.mobileNumber.trim(),
          landlineNumber: trimOrUndefined(profileValues.landlineNumber),
          addressLine1: profileValues.addressLine1.trim(),
          addressLine2: trimOrUndefined(profileValues.addressLine2),
          addressLine3: trimOrUndefined(profileValues.addressLine3),
          city: profileValues.city.trim(),
          county: profileValues.county.trim(),
          postcode: uppercasePostcode(profileValues.postcode),
          marketingOptIn: profileValues.marketingOptIn ?? false,
          notes: trimOrUndefined(profileValues.notes),
        };

        await apiPost<RegisterResponse>('/auth/register', registerPayload, { skipAuth: true });
        const loginResponse = await apiPost<LoginResponse>(
          '/auth/login',
          { email: registerPayload.email, password: values.password },
          { skipAuth: true },
        );
        setAuthToken(loginResponse.token);
        setCurrentUser(loginResponse.user);
        accountForm.reset({
          mode: 'login',
          email: loginResponse.user.email,
          password: '',
          captchaToken: undefined,
        });
        toast.success('Account created and signed in.');
      }
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to process your request.';
      setAccountError(message);
      toast.error(message);
    } finally {
      setAccountBusy(false);
    }
  });
  const handleConfirm = profileForm.handleSubmit(async (values) => {
    setConfirmError(null);

    if (!bookingReady) {
      toast.error('Please finish the earlier steps before confirming.');
      return;
    }

    if (!holdActive) {
      toast.error('Your reserved slot has expired. Choose a new date and time.');
      return;
    }

    if (!token || !currentUser) {
      toast.error('Sign in or create an account to confirm your booking.');
      setAccountMode('login');
      accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!confirmCaptchaToken) {
      toast.error('Complete the security check before confirming.');
      return;
    }

    const email = accountEmail?.trim() || currentUser.email;
    if (!email) {
      toast.error('Enter your email address.');
      setAccountMode('register');
      return;
    }

    const customerPayload = buildCustomerPayload(values, email);
    const bookingNotes = trimOrUndefined(values.notes);

    const loader = toast.loading('Finalising your booking...');
    setConfirming(true);

    try {
      const baselineProfileValues = buildProfileDefaults({} as BookingDraft, currentUser);
      const hasProfileChanges =
        JSON.stringify(buildProfileUpdatePayload(values)) !==
        JSON.stringify(buildProfileUpdatePayload(baselineProfileValues));

      if (hasProfileChanges) {
        setProfileSyncing(true);
        await apiPatch<ProfileResponse>('/account/profile', buildProfileUpdatePayload(values));
        setProfileSyncing(false);
      }

      updateDraft({
        customer: {
          ...customerPayload,
          notes: bookingNotes,
        },
        bookingNotes,
      });

      const booking = await apiPost<CreateBookingResponse>('/bookings', {
        serviceId: draft.serviceId,
        engineTierId: draft.engineTierId,
        pricePence: draft.pricePence,
        vehicle: draft.vehicle,
        date: draft.date,
        time: draft.time,
        holdId: draft.holdId,
        customer: customerPayload,
        bookingNotes,
      });

      const bookingId = extractBookingId(booking);

      const confirmation = await apiPatch<ConfirmBookingResponse>(`/bookings/${bookingId}/confirm`, {
        captchaToken: confirmCaptchaToken || 'dev-captcha-token',
      });

      await releaseHoldIfAny();
      markStepComplete('details-confirm');
      resetWizard();

      const successState: SuccessState = {
        reference: confirmation.reference || String(bookingId),
        invoice: confirmation.documents.invoice,
        quote: confirmation.documents.quote,
        totalAmountPence: confirmation.documents.invoice.totalAmountPence,
      };

      toast.success('Booking confirmed. We have emailed your documents.');
      navigate('/online-booking/success', { state: successState, replace: true });
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to confirm your booking.';
      setConfirmError(message);
      toast.error(message);
    } finally {
      toast.dismiss(loader);
      setConfirming(false);
      setProfileSyncing(false);
    }
  });
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Confirm your booking</h1>
            <p className="text-sm text-slate-300">
              Review the summary below, make sure your details are correct, then complete the security check to finalise.
            </p>
          </div>
          <div className="rounded-full bg-slate-800 px-4 py-2 text-xs uppercase tracking-wide text-slate-200">
            Step 4 of 4
          </div>
        </header>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-2xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase text-slate-400">Service</p>
            <p className="text-lg font-semibold text-white">{draft.serviceName ?? 'Service not selected'}</p>
            <p className="mt-1 text-slate-300">{draft.serviceDescription ?? 'Select a service to see the summary here.'}</p>
          </div>
          <div className="rounded-2xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase text-slate-400">Vehicle</p>
            <p className="text-lg font-semibold text-white">
              {draft.vehicle?.make || draft.vehicle?.model
                ? `${draft.vehicle.make ?? ''} ${draft.vehicle.model ?? ''}`.trim()
                : 'Vehicle not captured'}
            </p>
            <p className="mt-1 text-slate-300">
              {draft.vehicle?.vrm ? `VRM: ${draft.vehicle.vrm}` : 'VRM will appear once entered.'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase text-slate-400">Appointment</p>
            {appointmentSummary ? (
              <>
                <p className="text-lg font-semibold text-white">{appointmentSummary.dateLabel}</p>
                <p className="mt-1 text-slate-300">{appointmentSummary.timeLabel}</p>
              </>
            ) : (
              <p className="text-slate-300">Choose a date and time to secure a slot.</p>
            )}
          </div>
          <div className="rounded-2xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase text-slate-400">Total</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(draft.pricePence)}</p>
            <p className="mt-1 text-slate-300">Engine tier: {draft.engineTierName ?? 'Not selected'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-300">
            {holdActive ? (
              <span>
                Your slot is reserved for the next{' '}
                <span className="font-semibold text-white">{formatHoldCountdown(holdRemainingMs)}</span>. Confirm before it expires.
              </span>
            ) : (
              <span className="font-semibold text-amber-200">
                This hold has expired. Pick a new date and time to continue.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleStartAgain}
            className="self-start rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800"
          >
            Start over
          </button>
        </div>
      </section>
      <section
        ref={accountSectionRef}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        id="booking-account-section"
      >
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-black">1. Account access</h2>
            <p className="text-sm text-slate-600">
              Sign in to your A1 Service Expert account or create one to keep your bookings and documents in sync.
            </p>
          </div>
          {!currentUser ? (
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setAccountMode('login')}
                className={`rounded-full px-3 py-1 transition ${
                  accountMode === 'login' ? 'bg-white text-brand-black shadow-sm' : 'hover:text-brand-black'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAccountMode('register')}
                className={`rounded-full px-3 py-1 transition ${
                  accountMode === 'register' ? 'bg-white text-brand-black shadow-sm' : 'hover:text-brand-black'
                }`}
              >
                Create account
              </button>
            </div>
          ) : null}
        </header>

        {loadingProfile ? (
          <div className="mt-4">
            <LoadingIndicator label="Loading your profile..." />
          </div>
        ) : currentUser ? (
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-brand-black">{currentUser.email}</p>
              <p>
                {currentUser.firstName && currentUser.lastName
                  ? `${currentUser.firstName} ${currentUser.lastName}`
                  : 'Your profile details will be used for this booking.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Use a different account
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleAccountSubmit} noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="account-email">
                  Email address
                </label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...accountForm.register('email')}
                />
                {accountForm.formState.errors.email ? (
                  <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="account-password">
                  Password
                </label>
                <input
                  id="account-password"
                  type="password"
                  autoComplete={accountMode === 'login' ? 'current-password' : 'new-password'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  {...accountForm.register('password')}
                />
                {accountForm.formState.errors.password ? (
                  <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.password.message}</p>
                ) : null}
              </div>
              {accountMode === 'register' ? (
                <div className="md:col-span-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <TurnstileWidget
                    className="flex justify-center"
                    onChange={(tokenValue) =>
                      accountForm.setValue('captchaToken', tokenValue ?? '', { shouldValidate: true })
                    }
                    fallbackLabel="I confirm I am not a robot."
                  />
                  {accountForm.formState.errors.captchaToken ? (
                    <p className="text-xs text-red-600">{accountForm.formState.errors.captchaToken.message}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    We use Cloudflare Turnstile to protect against spam registrations.
                  </p>
                </div>
              ) : null}
            </div>

            {accountError ? <p className="text-sm text-red-600">{accountError}</p> : null}

            <input type="hidden" {...accountForm.register('mode')} value={accountMode} />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={accountBusy}
                className="rounded bg-brand-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {accountMode === 'login'
                  ? accountBusy
                    ? 'Signing in...'
                    : 'Sign in and continue'
                  : accountBusy
                  ? 'Creating account...'
                  : 'Create account'}
              </button>
            </div>
          </form>
        )}
      </section>
      <form className="space-y-6" onSubmit={handleConfirm} noValidate>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-brand-black">2. Your details</h2>
          <p className="mt-1 text-sm text-slate-600">
            These details will appear on your booking confirmation and help us prepare for your visit.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-title">
                Title
              </label>
              <select
                id="profile-title"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('title')}
              >
                <option value="MR">Mr</option>
                <option value="MRS">Mrs</option>
                <option value="MISS">Miss</option>
                <option value="MS">Ms</option>
              </select>
              {profileForm.formState.errors.title ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-company">
                Company name (optional)
              </label>
              <input
                id="profile-company"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('companyName')}
              />
              {profileForm.formState.errors.companyName ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.companyName.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-first">
                First name
              </label>
              <input
                id="profile-first"
                type="text"
                autoComplete="given-name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('firstName')}
              />
              {profileForm.formState.errors.firstName ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.firstName.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-last">
                Last name
              </label>
              <input
                id="profile-last"
                type="text"
                autoComplete="family-name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('lastName')}
              />
              {profileForm.formState.errors.lastName ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.lastName.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-mobile">
                Mobile number
              </label>
              <input
                id="profile-mobile"
                type="tel"
                autoComplete="tel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('mobileNumber')}
              />
              {profileForm.formState.errors.mobileNumber ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.mobileNumber.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-landline">
                Landline number (optional)
              </label>
              <input
                id="profile-landline"
                type="tel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('landlineNumber')}
              />
              {profileForm.formState.errors.landlineNumber ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.landlineNumber.message}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-address1">
                Address line 1
              </label>
              <input
                id="profile-address1"
                type="text"
                autoComplete="address-line1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('addressLine1')}
              />
              {profileForm.formState.errors.addressLine1 ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.addressLine1.message}</p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-address2">
                Address line 2 (optional)
              </label>
              <input
                id="profile-address2"
                type="text"
                autoComplete="address-line2"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('addressLine2')}
              />
              {profileForm.formState.errors.addressLine2 ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.addressLine2.message}</p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-address3">
                Address line 3 (optional)
              </label>
              <input
                id="profile-address3"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('addressLine3')}
              />
              {profileForm.formState.errors.addressLine3 ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.addressLine3.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-city">
                Town or city
              </label>
              <input
                id="profile-city"
                type="text"
                autoComplete="address-level2"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('city')}
              />
              {profileForm.formState.errors.city ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.city.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-county">
                County
              </label>
              <input
                id="profile-county"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                {...profileForm.register('county')}
              />
              {profileForm.formState.errors.county ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.county.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-postcode">
                Postcode
              </label>
              <input
                id="profile-postcode"
                type="text"
                autoComplete="postal-code"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                {...profileForm.register('postcode')}
              />
              {profileForm.formState.errors.postcode ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.postcode.message}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-brand-black">3. Final checks</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  {...profileForm.register('marketingOptIn')}
                />
                <span>
                  Keep me updated with occasional offers and reminders. We respect your inbox and you can opt out at any time.
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  {...profileForm.register('acceptedTerms')}
                />
                <span>
                  I confirm that I have read and accept the{' '}
                  <a className="font-semibold text-brand-orange underline" href="/terms" target="_blank" rel="noreferrer">
                    terms and conditions
                  </a>{' '}
                  and{' '}
                  <a className="font-semibold text-brand-orange underline" href="/privacy" target="_blank" rel="noreferrer">
                    privacy policy
                  </a>
                  .
                </span>
              </label>
              {profileForm.formState.errors.acceptedTerms ? (
                <p className="mt-2 text-xs text-red-600">{profileForm.formState.errors.acceptedTerms.message}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="profile-notes">
                Notes for the technician (optional)
              </label>
              <textarea
                id="profile-notes"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Add any access instructions, vehicle notes, or reminders our team should know about."
                {...profileForm.register('notes')}
              />
              {profileForm.formState.errors.notes ? (
                <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.notes.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <TurnstileWidget
              className="flex justify-center"
              onChange={(tokenValue) => setConfirmCaptchaToken(tokenValue ?? '')}
              fallbackLabel="I confirm I am not a robot."
            />
            <p className="text-xs text-slate-500">
              Complete the security check, then confirm your booking. We'll send a confirmation email instantly.
            </p>
            {confirmError ? <p className="text-sm text-red-600">{confirmError}</p> : null}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStartAgain}
                className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Start again
              </button>
            </div>

            <button
              type="submit"
              disabled={disableConfirmButton}
              className="inline-flex items-center justify-center gap-2 rounded bg-brand-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {confirming ? 'Confirming...' : 'Confirm booking'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function extractBookingId(response: CreateBookingResponse | { bookingId?: unknown; id?: unknown }): string {
  if (response && typeof response === 'object') {
    if (typeof response.bookingId === 'number' || typeof response.bookingId === 'string') {
      return String(response.bookingId);
    }
    if (typeof response.id === 'number' || typeof response.id === 'string') {
      return String(response.id);
    }
  }
  throw new Error('Booking identifier missing in response');
}

export default DetailsConfirmStep;







