import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { BookingDraft } from '../../../types';
import { accountSchema, profileSchema, type AccountFormValues, type ProfileFormValues } from '../details-confirm.schemas';
import { buildProfileDefaults, trimOrUndefined } from '../details-confirm.utils';

export function useProfileDraft(draft: BookingDraft, updateDraft: (patch: Partial<BookingDraft>) => void) {
  const accountForm = useForm<AccountFormValues>({ resolver: zodResolver(accountSchema), mode: 'onChange', shouldFocusError: false, defaultValues: { email: draft.account?.email ?? draft.customer?.email ?? '', password: draft.account?.password ?? '', confirmPassword: '' } });
  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), mode: 'onChange', shouldFocusError: false, defaultValues: buildProfileDefaults(draft, null) });

  const accountDraftRef = useRef<string>('');
  const profileDraftRef = useRef<string>('');

  const accountEmail = accountForm.watch('email');

  // Fallback validity derived from schema to avoid RHF isValid edge cases
  const [accountSchemaValid, setAccountSchemaValid] = useState(false);
  const [profileSchemaValid, setProfileSchemaValid] = useState(false);
  const [profileSchemaError, setProfileSchemaError] = useState<string | null>(null);

  useEffect(() => {
    const sub = accountForm.watch((_, { name }) => {
      try { setAccountSchemaValid(accountSchema.safeParse(accountForm.getValues()).success); } catch { setAccountSchemaValid(false); }
      if (name === 'password' || name === 'confirmPassword') { accountForm.trigger('confirmPassword'); }
    });
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

  // Sync to wizard draft
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

  const accountSectionValid = useMemo(() => accountForm.formState.isValid || accountSchemaValid, [accountForm.formState.isValid, accountSchemaValid]);
  const detailsSectionValid = useMemo(() => profileForm.formState.isValid || profileSchemaValid, [profileForm.formState.isValid, profileSchemaValid]);

  return { accountForm, profileForm, accountEmail, accountSchemaValid, profileSchemaValid, profileSchemaError, accountSectionValid, detailsSectionValid } as const;
}

export default useProfileDraft;
// Owns RHF forms, schema resolvers, and syncing to wizard draft.
