import { AdminBookingsList } from './AdminBookingsList';

export function UpcomingBookings() {
  return <AdminBookingsList mode="UPCOMING" />;
}

export function DeletedBookings() {
  return <AdminBookingsList mode="DELETED" />;
}

export { AdminBookingsList };
