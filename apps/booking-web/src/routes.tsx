import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import App from "./App";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AirConPage } from "./pages/AirConPage";
import { ContactPage } from "./pages/ContactPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPageDark";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import {
  BookingWizard,
  DateTimeStep,
  DetailsConfirmStep,
  PriceStep,
  ServicesStep,
} from "./features/booking";
import { SuccessPage } from "./features/booking/SuccessPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { AdminLayout } from "./features/admin/AdminLayout";
import { OverviewPage } from "./features/admin/pages/OverviewPage";
import { BookingsPage } from "./features/admin/pages/BookingsPage";
import { UsersPage } from "./features/admin/pages/UsersPage";
import { AdminUserDetailPage } from "./features/admin/pages/AdminUserDetailPage";
import { SettingsPage } from "./features/admin/pages/SettingsPage";
import { DevToolsPage } from "./features/admin/pages/DevToolsPage";
import { AdminBookingDetailPage } from "./features/admin/pages/AdminBookingDetailPage";
import { FinancialPage } from "./features/admin/pages/FinancialPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "services", element: <ServicesPage /> },
      {
        path: "online-booking",
        element: <BookingWizard />,
        children: [
          { index: true, element: <ServicesStep /> },
          { path: "pricing", element: <PriceStep /> },
          { path: "date-time", element: <DateTimeStep /> },
          { path: "details-confirm", element: <DetailsConfirmStep /> },
        ],
      },
      { path: "online-booking/success", element: <SuccessPage /> },
      { path: "air-con", element: <AirConPage /> },
      { path: "diagnostics", element: <DiagnosticsPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "account/bookings/:bookingId", element: <BookingDetailPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "cookie-policy", element: <CookiePolicyPage /> },
      // New admin routes with layout
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/overview" replace /> },
          { path: "overview", element: <OverviewPage /> },
          { path: "bookings", element: <BookingsPage /> },
          { path: "bookings/:bookingId", element: <AdminBookingDetailPage /> },
          { path: "financial", element: <FinancialPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "users/:userId", element: <AdminUserDetailPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      // Dev tools (ADMIN only, standalone)
      { path: "admin/dev", element: <DevToolsPage /> },
      // Legacy admin page (kept for backwards compatibility, redirects)
      { path: "admin-legacy", element: <AdminPage /> },
    ],
  },
];





