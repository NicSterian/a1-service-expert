import type { RouteObject } from "react-router-dom";
import App from "./App";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AirConPage } from "./pages/AirConPage";
import { ContactPage } from "./pages/ContactPage";
import { DevPage } from "./pages/DevPage";
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
      { path: "dev", element: <DevPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "cookie-policy", element: <CookiePolicyPage /> },
    ],
  },
];





