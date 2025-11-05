import { z } from 'zod';

export type AccountUser = {
  email: string;
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
};

export type LoginResponse = { token: string; user: AccountUser };
export type RegisterResponse = { user: AccountUser };
export type ProfileResponse = { user: AccountUser };

export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v);

export const accountSchema = z
  .object({
    email: z.string({ required_error: 'Email is required' }).email('Enter a valid email address').max(120),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  });

export const profileSchema = z.object({
  title: z.enum(['MR', 'MRS', 'MISS', 'MS'], { errorMap: () => ({ message: 'Select a title' }) }),
  firstName: z.string({ required_error: 'First name is required' }).min(2),
  lastName: z.string({ required_error: 'Last name is required' }).min(2),
  companyName: z.preprocess(emptyToUndefined, z.string().max(120).optional()).optional(),
  mobileNumber: z.string({ required_error: 'Mobile number is required' }).min(6),
  landlineNumber: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  addressLine1: z.string({ required_error: 'Address line 1 is required' }).min(2),
  addressLine2: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  addressLine3: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  city: z.string({ required_error: 'Town or city is required' }).min(2),
  county: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  postcode: z.string({ required_error: 'Postcode is required' }).regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'),
  marketingOptIn: z.boolean().optional(),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()).optional(),
  acceptedTerms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms to continue.' }),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
// Schemas and types for DetailsConfirm step. Behaviour and messages are locked.
