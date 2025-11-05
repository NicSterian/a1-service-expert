export interface BookingConfirmationEmail {
  bookingId?: number;
  reference?: string;
  slotDate: Date;
  slotTime: string;
  service: {
    name: string;
    engineTier?: string | null;
  };
  totals: {
    pricePence: number;
  };
  vehicle: {
    registration: string;
    make?: string | null;
    model?: string | null;
    engineSizeCc?: number | null;
  };
  customer: {
    email: string;
    name: string;
    title?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    phone?: string | null;
    mobile?: string | null;
    landline?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressLine3?: string | null;
    city?: string | null;
    county?: string | null;
    postcode?: string | null;
    notes?: string | null;
  };
  documents?: {
    invoiceNumber?: string | null;
    invoiceUrl?: string | null;
    quoteNumber?: string | null;
    quoteUrl?: string | null;
  };
  adminRecipients?: string[];
}

