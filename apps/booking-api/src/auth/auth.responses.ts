export type PublicUser = {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  mobileNumber: string | null;
  landlineNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  marketingOptIn: boolean;
  notes: string | null;
  profileUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterResponse = {
  user: PublicUser;
};

export type LoginResponse = {
  user: PublicUser;
  token: string;
};

export type VerifyResponse = {
  ok: true;
};

export type MeResponse = {
  user: PublicUser;
};
