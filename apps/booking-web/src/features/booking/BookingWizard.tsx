import { ReactNode, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookingWizardProvider, useBookingWizard } from './state';
import { CartSidebar } from '../../components/CartSidebar';
import { MobileCartDrawer } from '../../components/MobileCartDrawer';
import type { BookingStep } from './types';

const steps: Array<{ id: BookingStep; label: string; description: string; route: string }> = [
  { id: 'services', label: 'Services', description: 'Choose your service package', route: '.' },
  { id: 'pricing', label: 'Booking summary', description: 'Review vehicle & price', route: 'pricing' },
  { id: 'date-time', label: 'Date & Time', description: 'Select an appointment slot', route: 'date-time' },
  { id: 'details-confirm', label: 'Confirm booking', description: 'Create your account & finalise', route: 'details-confirm' },
];

function useCurrentStepFromLocation(): BookingStep {
  const location = useLocation();
  const segments = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const onlineBookingIndex = segments.indexOf('online-booking');
  const slug = onlineBookingIndex >= 0 ? segments[onlineBookingIndex + 1] ?? '' : '';

  switch (slug) {
    case 'pricing':
      return 'pricing';
    case 'date-time':
      return 'date-time';
    case 'details-confirm':
      return 'details-confirm';
    default:
      return 'services';
  }
}

function Stepper() {
  const navigate = useNavigate();
  const { currentStep, completedSteps } = useBookingWizard();
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  const handleNavigate = (target: (typeof steps)[number]) => {
    const stepIndex = steps.findIndex((step) => step.id === target.id);
    const isEnabled = stepIndex <= currentIndex || completedSteps.has(target.id);
    if (!isEnabled) return;
    navigate(target.route === '.' ? '.' : target.route);
  };

  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.has(step.id);
        const isEnabled = index <= currentIndex + 1 || isCompleted;

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => handleNavigate(step)}
              disabled={!isEnabled}
              className={`group flex w-full flex-col rounded border px-4 py-3 text-left transition
                ${isActive ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 bg-white text-slate-700'}
                ${!isEnabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-orange hover:text-brand-orange'}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold">
                  {isCompleted && !isActive ? 'Done' : index + 1}
                </span>
                {step.label}
              </span>
              <span className="mt-1 text-xs text-slate-500 group-hover:text-current">{step.description}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function BookingWizardShell() {
  const locationStep = useCurrentStepFromLocation();
  const navigate = useNavigate();
  const { setCurrentStep, setLoginPanelOpen } = useBookingWizard();

  useEffect(() => {
    setCurrentStep(locationStep);
  }, [locationStep, setCurrentStep]);

  const handleLogin = () => {
    setLoginPanelOpen(true);
    if (locationStep !== 'details-confirm') {
      navigate('details-confirm');
      return;
    }
    if (typeof document !== 'undefined') {
      document.getElementById('booking-account-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h1 className="text-3xl font-semibold text-brand-black">Online Booking</h1>
            <p className="text-slate-600">Follow the steps below to reserve your service slot.</p>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            className="self-start rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Login
          </button>
        </div>
        <Stepper />
      </header>

      <section className="">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded border border-slate-200 bg-white p-6 shadow-sm">
            <Outlet />
          </div>
          <div className="hidden lg:block">
            <CartSidebar />
          </div>
        </div>
        <MobileCartDrawer />
      </section>
    </div>
  );
}

export function BookingWizard({ children }: { children?: ReactNode }) {
  return (
    <BookingWizardProvider>
      <BookingWizardShell />
      {children}
    </BookingWizardProvider>
  );
}

export default BookingWizard;
