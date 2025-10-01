import type { EngineTierCode, ServiceCode } from '@shared/pricing';

export type BookingStep = 'services' | 'vehicle' | 'pricing' | 'date-time' | 'details-confirm';

export type CatalogServiceSummary = {
  id: number;
  code: ServiceCode;
  name: string;
  description: string | null;
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

export type BookingDraft = {
  serviceId?: number;
  serviceCode?: ServiceCode;
  serviceName?: string;
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
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  holdId?: string;
  holdExpiresAt?: string;
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



