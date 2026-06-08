import { z } from 'zod';

export const studentSchema = z.object({
  // Basic Details
  srNumber: z.string().min(1, 'SR Number is required'),
  grNumber: z.string().min(1, 'GR Number is required'),
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First Name is required'),
  fatherName: z.string().min(1, "Father's Name is required"),
  grandFatherName: z.string().min(1, "Grandfather's Name is required"),
  motherName: z.string().min(1, "Mother's Name is required"),
  gender: z.enum(['Male', 'Female'] as const),
  dob: z.string().min(1, 'Date of Birth is required'),
  admissionDate: z.string().min(1, 'Admission Date is required'),
  caste: z.string().min(1, 'Caste is required'),
  casteCategory: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS'] as const),
  penNumber: z.string().optional(),
  apaarId: z.string().optional(),
  udiseNumber: z.string().optional(),
  nameAsPerChildTracking: z.string().optional(),
  nameAsPerUdisePlus: z.string().optional(),

  // Aadhaar Details
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar Number must be exactly 12 digits'),
  aadhaarName: z.string().min(1, 'Aadhaar Name is required'),
  aadhaarDob: z.string().min(1, 'Aadhaar Date of Birth is required'),

  // Bank Details
  bankAccountNumber: z.string().min(1, 'Bank Account Number is required'),
  bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC code must be valid (e.g. SBIN0012345)'),
  bankAccountHolderName: z.string().min(1, 'Account Holder Name is required'),

  // Family Details
  motherAadhaarNumber: z.string().regex(/^\d{12}$/, "Mother's Aadhaar must be exactly 12 digits"),
  fatherAadhaarNumber: z.string().regex(/^\d{12}$/, "Father's Aadhaar must be exactly 12 digits"),
  mobileNumber1: z.string().regex(/^\d{10}$/, 'Mobile Number 1 must be exactly 10 digits'),
  mobileNumber2: z.string().regex(/^\d{10}$/, 'Mobile Number 2 must be exactly 10 digits').or(z.literal('')).optional(),
});

export type StudentSchemaInput = z.infer<typeof studentSchema>;
