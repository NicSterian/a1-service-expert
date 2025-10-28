import type { EngineTierCode, ServiceCode } from '@a1/shared/pricing';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  BookingDraft,
  BookingDraftAccount,
  BookingDraftCustomer,
  BookingStep,
  BookingWizardContextValue,
  CatalogSummary,
} from './types';

const LOCAL_STORAGE_KEY = 'bookingDraft';
const STORAGE_VERSION = 2;
const EMPTY_DRAFT: BookingDraft = {};

type StoredDraftContainer = {
  version: number;
  data: unknown;
};

const BookingWizardContext = createContext<BookingWizardContextValue | undefined>(undefined);
const initialStep: BookingStep = 'services';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const booleanOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const normaliseVehicle = (value: unknown): BookingDraft['vehicle'] | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const result: NonNullable<BookingDraft['vehicle']> = {};

  const vrm = stringOrUndefined(value.vrm);
  if (vrm) result.vrm = vrm;

  const make = stringOrUndefined(value.make);
  if (make) result.make = make;

  const model = stringOrUndefined(value.model);
  if (model) result.model = model;

  const engineSizeCc = numberOrUndefined(value.engineSizeCc);
  if (engineSizeCc !== undefined) result.engineSizeCc = engineSizeCc;

  const manualEntry = booleanOrUndefined(value.manualEntry);
  if (manualEntry !== undefined) result.manualEntry = manualEntry;

  if ('recommendation' in value) {
    const recommendationValue = (value as Record<string, unknown>).recommendation;
    if (recommendationValue === null) {
      result.recommendation = null;
    } else if (isRecord(recommendationValue)) {
      const recommendationTierCode = stringOrUndefined(recommendationValue.engineTierCode);
      result.recommendation = {
        engineTierId: numberOrUndefined(recommendationValue.engineTierId),
        engineTierCode: recommendationTierCode ? (recommendationTierCode as EngineTierCode) : null,
        engineTierName: stringOrUndefined(recommendationValue.engineTierName),
        pricePence: numberOrUndefined(recommendationValue.pricePence),
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const normaliseCustomer = (value: unknown): BookingDraftCustomer | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const customer: BookingDraftCustomer = {};

  const title = stringOrUndefined(record.title);
  if (title && ['MR', 'MRS', 'MISS', 'MS'].includes(title.toUpperCase())) {
    customer.title = title.toUpperCase() as BookingDraftCustomer['title'];
  }

  const firstName = stringOrUndefined(record.firstName);
  if (firstName) customer.firstName = firstName;

  const lastName = stringOrUndefined(record.lastName);
  if (lastName) customer.lastName = lastName;

  const legacyName = stringOrUndefined(record.name);
  if ((!customer.firstName || !customer.lastName) && legacyName) {
    const parts = legacyName.trim().split(/\s+/);
    if (!customer.firstName) {
      customer.firstName = parts[0];
    }
    if (!customer.lastName) {
      customer.lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    }
  }

  const companyName = stringOrUndefined(record.companyName);
  if (companyName) customer.companyName = companyName;

  const email = stringOrUndefined(record.email);
  if (email) customer.email = email;

  const mobileNumber = stringOrUndefined(record.mobileNumber ?? record.phone);
  if (mobileNumber) customer.mobileNumber = mobileNumber;

  const landlineNumber = stringOrUndefined(record.landlineNumber);
  if (landlineNumber) customer.landlineNumber = landlineNumber;

  const addressLine1 = stringOrUndefined(record.addressLine1);
  if (addressLine1) customer.addressLine1 = addressLine1;

  const addressLine2 = stringOrUndefined(record.addressLine2);
  if (addressLine2) customer.addressLine2 = addressLine2;

  const addressLine3 = stringOrUndefined(record.addressLine3);
  if (addressLine3) customer.addressLine3 = addressLine3;

  const city = stringOrUndefined(record.city);
  if (city) customer.city = city;

  const county = stringOrUndefined(record.county);
  if (county) customer.county = county;

  const postcode = stringOrUndefined(record.postcode);
  if (postcode) customer.postcode = postcode;

  const marketingOptIn = booleanOrUndefined(record.marketingOptIn);
  if (marketingOptIn !== undefined) customer.marketingOptIn = marketingOptIn;

  const acceptedTerms = booleanOrUndefined(record.acceptedTerms);
  if (acceptedTerms !== undefined) customer.acceptedTerms = acceptedTerms;

  const notes = stringOrUndefined(record.notes);
  if (notes) customer.notes = notes;

  if (!customer.firstName && customer.lastName) {
    customer.firstName = customer.lastName;
  } else if (!customer.lastName && customer.firstName) {
    customer.lastName = customer.firstName;
  }

  return Object.keys(customer).length > 0 ? customer : undefined;
};

const normaliseAccount = (value: unknown): BookingDraftAccount | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const account: BookingDraftAccount = {};

  if (record.mode === 'login' || record.mode === 'register') {
    account.mode = record.mode;
  }

  const email = stringOrUndefined(record.email);
  if (email) account.email = email;

  const password = stringOrUndefined(record.password);
  if (password) account.password = password;

  return Object.keys(account).length > 0 ? account : undefined;
};

const normaliseDraftRecord = (value: unknown): BookingDraft => {
  if (!isRecord(value)) {
    return { ...EMPTY_DRAFT };
  }

  const record = value as Record<string, unknown>;
  const draft: BookingDraft = {};

  const serviceId = numberOrUndefined(record.serviceId);
  if (serviceId !== undefined) draft.serviceId = serviceId;

  const serviceCode = stringOrUndefined(record.serviceCode);
  if (serviceCode) draft.serviceCode = serviceCode as ServiceCode;

  const serviceName = stringOrUndefined(record.serviceName);
  if (serviceName) draft.serviceName = serviceName;

  const serviceDescription = stringOrUndefined(record.serviceDescription);
  if (serviceDescription) draft.serviceDescription = serviceDescription;

  const engineTierId = numberOrUndefined(record.engineTierId);
  if (engineTierId !== undefined) draft.engineTierId = engineTierId;

  const engineTierCode = stringOrUndefined(record.engineTierCode);
  if (engineTierCode) draft.engineTierCode = engineTierCode as EngineTierCode;

  const engineTierName = stringOrUndefined(record.engineTierName);
  if (engineTierName) draft.engineTierName = engineTierName;

  const pricePence = numberOrUndefined(record.pricePence);
  if (pricePence !== undefined) draft.pricePence = pricePence;

  const vehicle = normaliseVehicle(record.vehicle);
  if (vehicle) draft.vehicle = vehicle;

  const date = stringOrUndefined(record.date);
  if (date) draft.date = date;

  const time = stringOrUndefined(record.time);
  if (time) draft.time = time;

  const customer = normaliseCustomer(record.customer);
  if (customer) draft.customer = customer;

  const account = normaliseAccount(record.account);
  if (account) draft.account = account;

  const holdId = stringOrUndefined(record.holdId);
  if (holdId) draft.holdId = holdId;

  const holdExpiresAt = stringOrUndefined(record.holdExpiresAt);
  if (holdExpiresAt) draft.holdExpiresAt = holdExpiresAt;

  const bookingNotes = stringOrUndefined(record.bookingNotes);
  if (bookingNotes) draft.bookingNotes = bookingNotes;

  if (!draft.bookingNotes && customer?.notes) {
    draft.bookingNotes = customer.notes;
  }

  return draft;
};

const extractStoredDraft = (raw: unknown): BookingDraft => {
  if (isRecord(raw) && typeof raw.version === 'number' && 'data' in raw) {
    const container = raw as StoredDraftContainer;
    if (container.version === STORAGE_VERSION) {
      return normaliseDraftRecord(container.data);
    }
    return normaliseDraftRecord(container.data);
  }

  return normaliseDraftRecord(raw);
};

const loadDraft = (): BookingDraft => {
  if (typeof window === 'undefined') {
    return { ...EMPTY_DRAFT };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_DRAFT };
    }
    const parsed = JSON.parse(raw) as unknown;
    return extractStoredDraft(parsed);
  } catch (error) {
    console.warn('Failed to parse booking draft from storage', error);
    return { ...EMPTY_DRAFT };
  }
};

const persistDraft = (draft: BookingDraft) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const payload: StoredDraftContainer = {
      version: STORAGE_VERSION,
      data: draft,
    };
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist booking draft', error);
  }
};

const clearDraft = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear booking draft', error);
  }
};

export function BookingWizardProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(() => loadDraft());
  const [currentStep, setCurrentStep] = useState<BookingStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<BookingStep>>(new Set());
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [loginPanelOpen, setLoginPanelOpen] = useState(false);

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
      setDraft({ ...EMPTY_DRAFT });
      setCurrentStep(initialStep);
      setCompletedSteps(new Set());
      setLoginPanelOpen(false);
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
      loginPanelOpen,
      setLoginPanelOpen,
    };
  }, [draft, currentStep, completedSteps, catalog, loginPanelOpen]);

  return <BookingWizardContext.Provider value={value}>{children}</BookingWizardContext.Provider>;
}

export function useBookingWizard() {
  const context = useContext(BookingWizardContext);
  if (!context) {
    throw new Error('useBookingWizard must be used within BookingWizardProvider');
  }
  return context;
}


