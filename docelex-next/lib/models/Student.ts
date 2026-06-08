import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IStudent extends MongooseDocument {
  // Section 1: Basic Details
  srNumber: string;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  motherName: string;
  gender: 'Male' | 'Female';
  dob: Date;
  admissionDate: Date;
  class: string;
  division?: string;
  caste: string;
  casteCategory: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  penNumber?: string;
  apaarId?: string;
  udiseNumber?: string;
  nameAsPerChildTracking?: string;
  nameAsPerUdisePlus?: string;

  // Section 2: Aadhaar Details
  aadhaarNumber: string;
  nameAsPerAadhaar: string;
  dobAsPerAadhaar: Date;

  // Section 3: Bank Details
  bankAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;

  // Section 4: Family Details
  motherAadhaar: string;
  fatherAadhaar: string;
  mobileNumber1: string;
  mobileNumber2?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    srNumber: {
      type: String,
      required: [true, 'SR Number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    grNumber: {
      type: String,
      required: [true, 'GR Number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    surname: {
      type: String,
      required: [true, 'Surname is required'],
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First Name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's Name is required"],
      trim: true,
    },
    grandFatherName: {
      type: String,
      required: [true, "Grandfather's Name is required"],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother's Name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female'],
        message: '{VALUE} is not a valid gender (Male/Female)',
      },
      required: [true, 'Gender is required'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of Birth is required'],
    },
    admissionDate: {
      type: Date,
      required: [true, 'Admission Date is required'],
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
      index: true,
    },
    division: {
      type: String,
      trim: true,
    },
    caste: {
      type: String,
      required: [true, 'Caste is required'],
      trim: true,
    },
    casteCategory: {
      type: String,
      enum: {
        values: ['General', 'OBC', 'SC', 'ST', 'EWS'],
        message: '{VALUE} is not a valid Caste Category',
      },
      required: [true, 'Caste Category is required'],
    },
    penNumber: {
      type: String,
      trim: true,
    },
    apaarId: {
      type: String,
      trim: true,
    },
    udiseNumber: {
      type: String,
      trim: true,
    },
    nameAsPerChildTracking: {
      type: String,
      trim: true,
    },
    nameAsPerUdisePlus: {
      type: String,
      trim: true,
    },

    // Section 2: Aadhaar Details
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar Number is required'],
      trim: true,
    },
    nameAsPerAadhaar: {
      type: String,
      required: [true, 'Name as per Aadhaar is required'],
      trim: true,
    },
    dobAsPerAadhaar: {
      type: Date,
      required: [true, 'Date of Birth as per Aadhaar is required'],
    },

    // Section 3: Bank Details
    bankAccountNumber: {
      type: String,
      required: [true, 'Bank Account Number is required'],
      trim: true,
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC Code is required'],
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account Holder Name is required'],
      trim: true,
    },

    // Section 4: Family Details
    motherAadhaar: {
      type: String,
      required: [true, "Mother's Aadhaar Number is required"],
      trim: true,
    },
    fatherAadhaar: {
      type: String,
      required: [true, "Father's Aadhaar Number is required"],
      trim: true,
    },
    mobileNumber1: {
      type: String,
      required: [true, 'Mobile Number 1 is required'],
      trim: true,
    },
    mobileNumber2: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize search speed via text indexing
StudentSchema.index({
  surname: 'text',
  firstName: 'text',
  fatherName: 'text',
  grNumber: 'text',
  srNumber: 'text',
  aadhaarNumber: 'text',
  mobileNumber1: 'text'
});

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
