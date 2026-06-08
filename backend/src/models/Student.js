const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    srNumber: {
      type: String,
      required: [true, 'SR Number is required'],
      unique: true,
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
      required: [true, 'Father Name is required'],
      trim: true,
    },
    grandFatherName: {
      type: String,
      required: [true, 'Grand Father Name is required'],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, 'Mother Name is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
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

    // Aadhaar Details
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar Number is required'],
      trim: true,
    },
    aadhaarName: {
      type: String,
      required: [true, 'Name as per Aadhaar is required'],
      trim: true,
    },
    aadhaarDob: {
      type: Date,
      required: [true, 'Date of Birth as per Aadhaar is required'],
    },

    // Bank Details
    bankAccountNumber: {
      type: String,
      required: [true, 'Bank Account Number is required'],
      trim: true,
    },
    bankIfscCode: {
      type: String,
      required: [true, 'IFSC Code is required'],
      trim: true,
    },
    bankAccountHolderName: {
      type: String,
      required: [true, 'Account Holder Name is required'],
      trim: true,
    },

    // Family Details
    motherAadhaarNumber: {
      type: String,
      required: [true, "Mother's Aadhaar Number is required"],
      trim: true,
    },
    fatherAadhaarNumber: {
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for backward compatibility with old code that uses student.name
StudentSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.surname}`;
});

// Set toJSON option to include virtuals
StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

// Search indexes
StudentSchema.index({ surname: 'text', firstName: 'text', grNumber: 'text', srNumber: 'text' });

module.exports = mongoose.model('Student', StudentSchema);
