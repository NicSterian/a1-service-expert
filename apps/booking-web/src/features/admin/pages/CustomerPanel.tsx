import type { AdminBookingResponse } from './AdminBookingDetailPage';
 

export type CustomerDraft = {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  landline: string;
  company: string;
  title: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  county: string;
  postcode: string;
};

export function CustomerPanel(props: {
  booking: AdminBookingResponse;
  editing: boolean;
  draft: CustomerDraft;
  setDraft: (next: CustomerDraft) => void;
  onToggleEdit: () => void;
  onSave: () => void;
}) {
  const { booking, editing, draft, setDraft, onToggleEdit, onSave } = props;
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h3>
        <button
          onClick={onToggleEdit}
          className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
          type="button"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Mobile" value={draft.mobile} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Landline" value={draft.landline} onChange={(e) => setDraft({ ...draft, landline: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="First name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Last name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 1" value={draft.addressLine1} onChange={(e) => setDraft({ ...draft, addressLine1: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 2" value={draft.addressLine2} onChange={(e) => setDraft({ ...draft, addressLine2: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Address line 3" value={draft.addressLine3} onChange={(e) => setDraft({ ...draft, addressLine3: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="County" value={draft.county} onChange={(e) => setDraft({ ...draft, county: e.target.value })} />
          <input className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white" placeholder="Postcode" value={draft.postcode} onChange={(e) => setDraft({ ...draft, postcode: e.target.value })} />
          <div className="sm:col-span-2">
            <button onClick={onSave} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400">Save</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <div>
            <span className="font-semibold text-white">{booking.customer.name}</span>
            <span className="text-slate-400"> · {booking.customer.email}</span>
          </div>
          <div className="text-slate-400">
            {booking.customer.phone && <span className="mr-4">Phone: {booking.customer.phone}</span>}
            {booking.customer.mobile && <span className="mr-4">Mobile: {booking.customer.mobile}</span>}
            {booking.customer.company && <span>Company: {booking.customer.company}</span>}
          </div>
          <div className="text-xs text-slate-400">
            {[booking.customer.addressLine1, booking.customer.addressLine2, booking.customer.addressLine3, booking.customer.city, booking.customer.county, booking.customer.postcode]
              .filter(Boolean)
              .join(', ')}
          </div>
          {booking.customer.profile && (
            <div className="text-xs text-slate-400">
              Linked account #{booking.customer.profile.id} ({booking.customer.profile.email})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
