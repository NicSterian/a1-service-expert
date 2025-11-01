import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UpcomingBookings, DeletedBookings } from '../bookings/UpcomingBookings';
import { PastBookings } from '../bookings/PastBookings';
import { CalendarView } from '../bookings/CalendarView';
import { ManualBookingForm } from '../bookings/ManualBookingForm';

export function BookingsPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'upcoming';
  const [showManualForm, setShowManualForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleManualBookingSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Bookings</h2>
          <p className="text-sm text-slate-400">Manage all customer bookings</p>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className="rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-orange-400"
        >
          + Create Manual Booking
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          <Link
            to="/admin/bookings?tab=upcoming"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'upcoming'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'upcoming' ? 'page' : undefined}
          >
            Upcoming
          </Link>
          <Link
            to="/admin/bookings?tab=past"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'past'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'past' ? 'page' : undefined}
          >
            Past
          </Link>
          <Link
            to="/admin/bookings?tab=calendar"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'calendar'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
          >
            Calendar
          </Link>
          <Link
            to="/admin/bookings?tab=deleted"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'deleted'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'deleted' ? 'page' : undefined}
          >
            Deleted
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'upcoming' && <UpcomingBookings key={`upcoming-${refreshKey}`} />}
        {activeTab === 'past' && <PastBookings key={`past-${refreshKey}`} />}
        {activeTab === 'calendar' && <CalendarView key={`calendar-${refreshKey}`} />}
        {activeTab === 'deleted' && <DeletedBookings key={`deleted-${refreshKey}`} />}
      </div>

      {/* Manual Booking Form Modal */}
      {showManualForm && (
        <ManualBookingForm
          onClose={() => setShowManualForm(false)}
          onSuccess={handleManualBookingSuccess}
        />
      )}
    </div>
  );
}
