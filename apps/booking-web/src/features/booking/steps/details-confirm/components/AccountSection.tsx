import { LoadingIndicator } from '../../../../../components/LoadingIndicator';
import type { UseFormReturn } from 'react-hook-form';
import type { AccountFormValues, AccountUser } from '../details-confirm.schemas';

/** Renders account state: login/register or signed-in summary. */
export function AccountSection({
  currentUser,
  loadingProfile,
  onLoginClick,
  onLogoutClick,
  accountForm,
}: {
  currentUser: AccountUser | null;
  loadingProfile: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  accountForm: UseFormReturn<AccountFormValues>;
}) {
  return (
    <>
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">1. Account information</h2>
          {!currentUser ? (
            <p className="text-sm text-slate-300">Already have an account? <button type="button" onClick={onLoginClick} className="font-semibold text-brand-orange underline">Click here to login</button>.</p>
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
            <button type="button" onClick={onLogoutClick} className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:border-brand-orange hover:text-brand-orange">Sign out</button>
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
    </>
  );
}

export default AccountSection;
