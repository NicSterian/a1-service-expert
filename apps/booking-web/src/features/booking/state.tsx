import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { BookingDraft, BookingStep, BookingWizardContextValue, CatalogSummary } from './types';

const LOCAL_STORAGE_KEY = 'bookingDraft';

function loadDraft(): BookingDraft {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as BookingDraft;
    return parsed ?? {};
  } catch (error) {
    console.warn('Failed to parse booking draft from storage', error);
    return {};
  }
}

function persistDraft(draft: BookingDraft) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to persist booking draft', error);
  }
}

function clearDraft() {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear booking draft', error);
  }
}

const BookingWizardContext = createContext<BookingWizardContextValue | undefined>(undefined);

const initialStep: BookingStep = 'services';

export function BookingWizardProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(() => loadDraft());
  const [currentStep, setCurrentStep] = useState<BookingStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<BookingStep>>(new Set());
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);

  useEffect(() => {
    persistDraft(draft);
  }, [draft]);

  const value = useMemo<BookingWizardContextValue>(() => {
    const updateDraft = (patch: Partial<BookingDraft>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
    };

    const markStepComplete = (step: BookingStep) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
    };

    const reset = () => {
      setDraft({});
      setCurrentStep(initialStep);
      setCompletedSteps(new Set());
      clearDraft();
    };

    return {
      draft,
      currentStep,
      completedSteps: new Set(completedSteps),
      catalog,
      updateDraft,
      setCurrentStep,
      markStepComplete,
      setCatalog,
      reset,
    };
  }, [draft, currentStep, completedSteps, catalog]);

  return <BookingWizardContext.Provider value={value}>{children}</BookingWizardContext.Provider>;
}

export function useBookingWizard() {
  const context = useContext(BookingWizardContext);
  if (!context) {
    throw new Error('useBookingWizard must be used within BookingWizardProvider');
  }
  return context;
}
