/**
 * DetailsConfirmStep (customer-facing)
 *
 * Responsibilities
 * - Compose the final booking step from extracted hooks + presentational sections.
 * - Keep behaviour, API calls, toasts, and UI identical to the original monolith.
 *
 * Notes
 * - Hooks (auth/profile/hold) encapsulate side-effects and draft syncing.
 * - Sections are pure UI; no business logic inside the presentational components.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// forms handled via hooks
import toast from "react-hot-toast";
// API helpers
import { apiPatch, apiPost } from "../../../lib/api";
import { clearAuthToken, setAuthToken } from "../../../lib/auth";
import { useBookingWizard } from "../state";
import type { BookingDocumentSummary, ConfirmBookingResponse, CreateBookingResponse } from "../types";
import { type RegisterResponse, type LoginResponse } from "./details-confirm/details-confirm.schemas";
import { buildCustomerPayload, extractAppointmentDisplay, extractBookingId, trimOrUndefined, uppercasePostcode } from "./details-confirm/details-confirm.utils";
// Presentational sections
import { SummarySection, AccountSection, DetailsSection, FinalChecks } from "./details-confirm/components";
// Hooks
import { useHoldManager, useProfileDraft, useAccountAuth } from "./details-confirm/hooks";
// Auth modals
import { LoginModal as ImportedLoginModal } from "./details-confirm/components/LoginModal";
import { ForgotPasswordModal as ImportedForgotPasswordModal } from "./details-confirm/components/ForgotPasswordModal";
type SuccessState = {
  reference: string;
  invoice: BookingDocumentSummary | null;
  quote: BookingDocumentSummary | null;
  totalAmountPence: number;
};

export function DetailsConfirmStep() {
  const navigate = useNavigate();
  const { draft, updateDraft, markStepComplete, reset: resetWizard, loginPanelOpen, setLoginPanelOpen } = useBookingWizard();
  // Local UI state for captcha, submit, and auth modals
  const [confirmCaptchaToken, setConfirmCaptchaToken] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const accountSectionRef = useRef<HTMLDivElement | null>(null);

  // forms + draft sync
  const { accountForm, profileForm, accountEmail, profileSchemaError, accountSectionValid, detailsSectionValid } = useProfileDraft(draft, updateDraft);

  // auth + profile bootstrap
  const { token, setToken, currentUser, setCurrentUser, loadingProfile } = useAccountAuth(draft, accountForm, profileForm);

  // hold manager
  const { holdRemainingMs, holdActive, releaseHoldIfAny } = useHoldManager(draft, updateDraft);

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

  // validity handled in useProfileDraft
  const accountSectionEffectiveValid = currentUser ? true : (accountSectionValid);
  const detailsSectionEffectiveValid = detailsSectionValid;

  const disableConfirmButton = !bookingReady || !holdActive || !accountSectionEffectiveValid || !detailsSectionEffectiveValid || !confirmCaptchaToken || confirming;

  const disabledReasons: string[] = [];
  if (!bookingReady) disabledReasons.push('booking not ready');
  if (!holdActive) disabledReasons.push('hold expired');
  if (!accountSectionEffectiveValid) disabledReasons.push('account invalid');
  if (!detailsSectionEffectiveValid) disabledReasons.push('details invalid');
  if (!confirmCaptchaToken) disabledReasons.push('security check missing');
  if (confirming) disabledReasons.push('confirming');
  const disabledTitle = disableConfirmButton && disabledReasons.length ? `Cannot confirm: ${disabledReasons.join('; ')}${!detailsSectionValid && profileSchemaError ? ` — ${profileSchemaError}` : ''}` : undefined;

  // auth change listener handled in useAccountAuth

  // hold timer handled in useHoldManager

  // profile bootstrap handled in useAccountAuth
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

  // draft syncing handled in useProfileDraft

  // hold release handled in useHoldManager

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
      const firstMsg = (firstError as { message?: string } | undefined)?.message || 'Please review your details.';
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
      const successState: SuccessState = {
        reference: confirmation.reference || String(bookingId),
        invoice: confirmation.documents.invoice,
        quote: confirmation.documents.quote,
        totalAmountPence: confirmation.booking.totalAmountPence
      };
      toast.success('Booking confirmed. Check your email for details.');
      navigate(`/account`, { replace: true, state: successState });
    } catch (error) {
      setConfirmError((error as Error)?.message ?? 'Unable to confirm your booking.');
      toast.error((error as Error)?.message ?? 'Unable to confirm your booking.');
    } finally {
      toast.dismiss(loader);
      setConfirming(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Summary: service/vehicle/appointment/total + hold banner */}
      <SummarySection draft={draft} appointment={appointmentSummary} holdActive={holdActive} holdRemainingMs={holdRemainingMs} onStartAgain={handleStartAgain} />

      {/* Account: login/register inline or signed-in summary */}
      <section ref={accountSectionRef} id="booking-account-section" className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-inner">
        <AccountSection currentUser={currentUser} loadingProfile={loadingProfile} onLoginClick={() => setLoginModalOpen(true)} onLogoutClick={handleLogout} accountForm={accountForm} />
      </section>

      {/* Details form + final checks (submit) */}
      <form className="space-y-6" onSubmit={handleConfirm} noValidate>
        <DetailsSection profileForm={profileForm} />

        <FinalChecks
          confirmError={confirmError}
          onBack={handleBack}
          onStartAgain={handleStartAgain}
          onCaptchaChange={(tokenValue) => setConfirmCaptchaToken(tokenValue ?? '')}
          disabled={disableConfirmButton}
          disabledTitle={disabledTitle}
          confirming={confirming}
        />
      </form>

      {/* Auth modals (login + forgot password) */}
      <ImportedLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLoggedIn={({ token: t, user }) => { setAuthToken(t); setToken(t); setCurrentUser(user); }} />
      <ImportedForgotPasswordModal open={forgotModalOpen} onClose={() => setForgotModalOpen(false)} />
    </div>
  );
}

export default DetailsConfirmStep;
/**
 * DetailsConfirmStep
 *
 * Purpose
 * - Final customer/account details + confirmation step in booking wizard.
 * - Validates profile, manages auth (login/register), holds, and submit.
 *
 * Refactor Plan
 * - Extract subhooks: useAccountAuth, useProfileDraft, useHoldManager.
 * - Extract small presentational components for sections (Account, Details,
 *   Summary, FinalChecks) to reduce this file’s size.
 */
