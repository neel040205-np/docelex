const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    // Section 1: Basic Details
    srNumber: {
      type: String,
      required: [true, 'SR Number is required'],
      trim: true,
    },
    grNumber: {
      type: String,
      required: [true, 'GR Number is required'],
      unique: true,
      trim: true,
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
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother's Name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
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
    caste: {
      type: String,
      required: [true, 'Caste is required'],
      trim: true,
    },
    casteCategory: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'EWS'],
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
      required: [true, 'Student Bank Account Number is required'],
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
    motherAadhaarNumber: {
      type: String,
      trim: true,
    },
    fatherAadhaarNumber: {
      type: String,
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

    // Legacy and UI compatibility fields
    name: {
      type: String,
      trim: true,
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },

    // Audit tracking fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-populate the 'name' field for search capability
StudentSchema.pre('save', function (next) {
  this.name = `${this.surname} ${this.firstName} ${this.fatherName}`.trim();
  next();
});

// Compound unique index to ensure srNumber is unique within each class and division
StudentSchema.index({ class: 1, division: 1, srNumber: 1 }, { unique: true });

// Composite indices for performant search & filters
StudentSchema.index({
  name: 'text',
  grNumber: 'text',
  srNumber: 'text',
  aadhaarNumber: 'text',
  mobileNumber1: 'text',
});

module.exports = mongoose.model('Student', StudentSchema);
