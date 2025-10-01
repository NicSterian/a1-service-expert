import type { RouteObject } from "react-router-dom";
import App from "./App";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AirConPage } from "./pages/AirConPage";
import { ContactPage } from "./pages/ContactPage";
import { DevPage } from "./pages/DevPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import {
  BookingWizard,
  DateTimeStep,
  DetailsConfirmStep,
  PriceStep,
  ServicesStep,
  VehicleStep,
} from "./features/booking";
import { SuccessPage } from "./features/booking/SuccessPage";

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
          { path: "vehicle", element: <VehicleStep /> },
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
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "dev", element: <DevPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
    ],
  },
];





