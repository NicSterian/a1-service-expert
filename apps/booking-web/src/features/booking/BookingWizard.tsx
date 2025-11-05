import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookingWizardProvider, useBookingWizard } from './state';
import { CartSidebar } from '../../components/CartSidebar';
import { MobileCartDrawer } from '../../components/MobileCartDrawer';
import type { BookingStep } from './types';
import { AUTH_EVENT_NAME, getAuthToken } from '../../lib/auth';

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
  const { currentStep, completedSteps, clearCompletedStepsAfter } = useBookingWizard();
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  const handleNavigate = (target: (typeof steps)[number]) => {
    const stepIndex = steps.findIndex((step) => step.id === target.id);
    const isEnabled = stepIndex <= currentIndex || completedSteps.has(target.id);
    if (!isEnabled) return;

    // Clear completed steps after the target step
    clearCompletedStepsAfter(target.id);

    navigate(target.route === '.' ? '.' : target.route);
  };

  return (
    <nav className="hidden md:block" aria-label="Booking progress">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isEnabled = index <= currentIndex || isCompleted;
          const showSeparator = index < steps.length - 1;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate(step)}
                disabled={!isEnabled}
                className={`text-sm font-semibold transition-colors
                  ${isActive ? 'text-orange-500' : ''}
                  ${isCompleted && !isActive ? 'text-green-500' : ''}
                  ${!isActive && !isCompleted ? 'text-slate-400' : ''}
                  ${isEnabled ? 'hover:text-orange-400 cursor-pointer' : 'cursor-not-allowed'}
                `}
                aria-current={isActive ? 'step' : undefined}
              >
                {step.label}
              </button>
              {showSeparator && (
                <span className="text-slate-300" aria-hidden="true">→</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BookingWizardShell() {
  const locationStep = useCurrentStepFromLocation();
  const navigate = useNavigate();
  const { setCurrentStep, setLoginPanelOpen } = useBookingWizard();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    setCurrentStep(locationStep);
  }, [locationStep, setCurrentStep]);

  useEffect(() => {
    const handleAuthChange = () => setIsLoggedIn(Boolean(getAuthToken()));
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

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
      <header className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-inner">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-white">Online Booking</h1>
            <p className="mt-2 text-slate-300">Follow the steps below to reserve your service slot.</p>
          </div>
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogin}
              className="self-start rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-500 hover:bg-slate-700 hover:text-orange-400"
            >
              Login
            </button>
          ) : null}
        </div>
        <div className="mt-6">
          <Stepper />
        </div>
      </header>

      <section className="">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded border border-slate-200 bg-white p-6 shadow-sm">
            <Outlet />
          </div>
          <div className="hidden lg:block">
            {locationStep !== 'details-confirm' ? <CartSidebar /> : null}
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
