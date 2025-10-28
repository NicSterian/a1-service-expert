import type { EngineTierCode, ServiceCode } from '@a1/shared/pricing';

export type BookingStep = 'services' | 'pricing' | 'date-time' | 'details-confirm';

export type CatalogServiceSummary = {
  id: number;
  code: ServiceCode;
  name: string;
  description: string | null;
  pricingMode?: 'TIERED' | 'FIXED';
  fixedPricePence?: number | null;
  footnotes?: string | null;
  lowestTierPricePence?: number | null;
};

export type CatalogEngineTierSummary = {
  id: number;
  code: EngineTierCode;
  name: string;
  sortOrder: number;
  maxCc: number | null;
};

export type CatalogPriceSummary = {
  serviceId: number;
  engineTierId: number;
  amountPence: number;
};

export type CatalogSummary = {
  services: CatalogServiceSummary[];
  engineTiers: CatalogEngineTierSummary[];
  prices: CatalogPriceSummary[];
};

export type BookingDraftCustomer = {
  title?: 'MR' | 'MRS' | 'MISS' | 'MS';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  mobileNumber?: string;
  landlineNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  county?: string;
  postcode?: string;
  marketingOptIn?: boolean;
  acceptedTerms?: boolean;
  notes?: string;
};

export type BookingDraftAccount = {
  mode?: 'login' | 'register';
  email?: string;
  password?: string;
};

export type BookingDraft = {
  serviceId?: number;
  serviceCode?: ServiceCode;
  serviceName?: string;
  serviceDescription?: string;
  engineTierId?: number;
  engineTierCode?: EngineTierCode;
  engineTierName?: string;
  pricePence?: number;
  vehicle?: {
    vrm?: string;
    make?: string;
    model?: string;
    manualEntry?: boolean;
    engineSizeCc?: number;
    recommendation?: {
      engineTierId?: number | null;
      engineTierCode?: EngineTierCode | null;
      engineTierName?: string | null;
      pricePence?: number | null;
    } | null;
  };
  date?: string;
  time?: string;
  customer?: BookingDraftCustomer;
  account?: BookingDraftAccount;
  holdId?: string;
  holdExpiresAt?: string;
  bookingNotes?: string;
};

export type BookingWizardContextValue = {
  draft: BookingDraft;
  currentStep: BookingStep;
  completedSteps: Set<BookingStep>;
  catalog: CatalogSummary | null;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  setCurrentStep: (step: BookingStep) => void;
  markStepComplete: (step: BookingStep) => void;
  setCatalog: (catalog: CatalogSummary | null) => void;
  reset: () => void;
  loginPanelOpen: boolean;
  setLoginPanelOpen: (open: boolean) => void;
};

export type CreateBookingResponse = {
  bookingId: number;
  id?: number;
  reference?: string;
};

export type BookingDocumentSummary = {
  id: number;
  type: 'QUOTE' | 'INVOICE';
  number: string;
  status: string;
  totalAmountPence: number;
  vatAmountPence: number;
  pdfUrl: string;
  validUntil: string | null;
};

export type ConfirmedBookingSummary = {
  id: number;
  status: string;
  slotDate: string;
  slotTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  engineTierName: string | null;
  totalAmountPence: number;
  vatAmountPence: number;
};

export type ConfirmBookingResponse = {
  reference: string;
  booking: ConfirmedBookingSummary;
  documents: {
    invoice: BookingDocumentSummary;
    quote: BookingDocumentSummary;
  };
};



