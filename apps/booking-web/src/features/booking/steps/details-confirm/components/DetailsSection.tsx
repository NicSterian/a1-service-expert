import type { UseFormReturn } from 'react-hook-form';
import type { ProfileFormValues } from '../details-confirm.schemas';

/** Renders the customer details form. Pure presentational. */
export function DetailsSection({ profileForm }: { profileForm: UseFormReturn<ProfileFormValues> }) {
  return (
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
  );
}

export default DetailsSection;
