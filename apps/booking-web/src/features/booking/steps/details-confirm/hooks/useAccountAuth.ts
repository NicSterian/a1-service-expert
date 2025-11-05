import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiGet } from '../../../../../lib/api';
import { AUTH_EVENT_NAME, getAuthToken } from '../../../../../lib/auth';
import type { BookingDraft } from '../../../types';
import type { AccountUser, ProfileResponse } from '../details-confirm.schemas';
import type { UseFormReturn } from 'react-hook-form';
import type { AccountFormValues, ProfileFormValues } from '../details-confirm.schemas';
import { buildProfileDefaults } from '../details-confirm.utils';

export function useAccountAuth(
  draft: BookingDraft,
  accountForm: UseFormReturn<AccountFormValues>,
  profileForm: UseFormReturn<ProfileFormValues>,
) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => setToken(getAuthToken());
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    return () => window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
  }, []);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { token, setToken, currentUser, setCurrentUser, loadingProfile } as const;
}

export default useAccountAuth;
// Handles auth token changes and profile bootstrap for DetailsConfirm.
