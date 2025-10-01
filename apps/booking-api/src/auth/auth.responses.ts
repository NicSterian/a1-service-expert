export type PublicUser = {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
};

export type RegisterResponse = {
  user: PublicUser;
  verificationToken?: string;
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
