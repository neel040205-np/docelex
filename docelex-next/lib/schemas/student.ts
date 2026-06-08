import { z } from 'zod';

// Patterns for specific validations
const AADHAAR_REGEX = /^\d{12}$/;
const MOBILE_REGEX = /^\d{10}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

export const StudentFormSchema = z.object({
  // Section 1: Basic Details
  srNumber: z.string().min(1, 'SR Number is required').trim(),
  grNumber: z.string().min(1, 'GR Number is required').trim(),
  surname: z.string().min(1, 'Surname is required').trim(),
  firstName: z.string().min(1, 'First Name is required').trim(),
  fatherName: z.string().min(1, "Father's Name is required").trim(),
  grandFatherName: z.string().min(1, "Grandfather's Name is required").trim(),
  motherName: z.string().min(1, "Mother's Name is required").trim(),
  gender: z.enum(['Male', 'Female']),
  dob: z.string().min(1, 'Date of Birth is required'),
  admissionDate: z.string().min(1, 'Admission Date is required'),
  class: z.string().min(1, 'Class is required').trim(),
  division: z.string().optional().or(z.literal('')),
  caste: z.string().min(1, 'Caste is required').trim(),
  casteCategory: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS']),
  penNumber: z.string().optional().or(z.literal('')),
  apaarId: z.string().optional().or(z.literal('')),
  udiseNumber: z.string().optional().or(z.literal('')),
  nameAsPerChildTracking: z.string().optional().or(z.literal('')),
  nameAsPerUdisePlus: z.string().optional().or(z.literal('')),

  // Section 2: Aadhaar Details
  aadhaarNumber: z
    .string()
    .min(1, 'Aadhaar Number is required')
    .regex(AADHAAR_REGEX, 'Aadhaar Number must be exactly 12 digits')
    .trim(),
  nameAsPerAadhaar: z.string().min(1, 'Name as per Aadhaar is required').trim(),
  dobAsPerAadhaar: z.string().min(1, 'Date of Birth as per Aadhaar is required'),

  // Section 3: Bank Details
  bankAccountNumber: z.string().min(5, 'Bank Account Number must be at least 5 digits').trim(),
  ifscCode: z
    .string()
    .min(1, 'IFSC Code is required')
    .regex(IFSC_REGEX, 'Invalid IFSC Code format (e.g. SBIN0001234)')
    .toUpperCase()
    .trim(),
  accountHolderName: z.string().min(1, 'Account Holder Name is required').trim(),

  // Section 4: Family Details
  motherAadhaar: z
    .string()
    .min(1, "Mother's Aadhaar is required")
    .regex(AADHAAR_REGEX, "Mother's Aadhaar must be exactly 12 digits")
    .trim(),
  fatherAadhaar: z
    .string()
    .min(1, "Father's Aadhaar is required")
    .regex(AADHAAR_REGEX, "Father's Aadhaar must be exactly 12 digits")
    .trim(),
  mobileNumber1: z
    .string()
    .min(1, 'Mobile Number 1 is required')
    .regex(MOBILE_REGEX, 'Mobile Number must be exactly 10 digits')
    .trim(),
  mobileNumber2: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || MOBILE_REGEX.test(val), {
      message: 'Mobile Number must be exactly 10 digits',
    }),
});

export type StudentFormValues = z.infer<typeof StudentFormSchema>;
