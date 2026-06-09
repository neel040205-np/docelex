const mongoose = require('mongoose');
const axios = require('axios');

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
      trim: true,
    },
    mobileNumber2: {
      type: String,
      trim: true,
    },
    mobileNumber3: {
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

// Pre-validate hook to auto-assign the next serial number scoped to class & division if blank
StudentSchema.pre('validate', async function (next) {
  if (!this.srNumber || String(this.srNumber).trim() === '') {
    try {
      const StudentModel = this.constructor;
      const students = await StudentModel.find({ class: this.class, division: this.division }, { srNumber: 1 });
      let maxSr = 0;
      let prefix = '';
      
      students.forEach((s) => {
        if (s.srNumber) {
          const match = s.srNumber.match(/\d+/);
          if (match) {
            const val = parseInt(match[0], 10);
            if (val > maxSr) {
              maxSr = val;
              const index = s.srNumber.indexOf(match[0]);
              prefix = s.srNumber.substring(0, index);
            }
          }
        }
      });
      
      const count = students.length;
      const nextSr = Math.max(count + 1, maxSr + 1);
      this.srNumber = `${prefix}${nextSr}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Translation helper for Gujarati to English names
const translateGujaratiToEnglish = async (text) => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (!trimmed) return '';
  // If the text contains only ASCII/English characters, skip translation
  if (/^[\u0000-\u007F]*$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await axios.get(url, { timeout: 3000 });
    if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
      let translated = response.data[0][0][0].trim();
      // Apply custom overrides/transliterations
      translated = translated.replace(/neil/gi, (match) => {
        if (match === 'Neil') return 'Neel';
        if (match === 'neil') return 'neel';
        if (match === 'NEIL') return 'NEEL';
        return 'Neel';
      });
      translated = translated.replace(/alca/gi, (match) => {
        if (match === 'Alca') return 'Alka';
        if (match === 'alca') return 'alka';
        if (match === 'ALCA') return 'ALKA';
        return 'Alka';
      });
      return translated;
    }
  } catch (error) {
    console.error(`Error translating "${trimmed}" from Gujarati to English:`, error.message);
  }
  return trimmed;
};

// Pre-save hook to auto-populate the 'name' field and translate Gujarati names to English
StudentSchema.pre('save', async function (next) {
  try {
    // Translate name fields if entered in Gujarati
    if (this.surname) this.surname = await translateGujaratiToEnglish(this.surname);
    if (this.firstName) this.firstName = await translateGujaratiToEnglish(this.firstName);
    if (this.fatherName) this.fatherName = await translateGujaratiToEnglish(this.fatherName);
    if (this.grandFatherName) this.grandFatherName = await translateGujaratiToEnglish(this.grandFatherName);
    if (this.motherName) this.motherName = await translateGujaratiToEnglish(this.motherName);
    if (this.nameAsPerAadhaar) this.nameAsPerAadhaar = await translateGujaratiToEnglish(this.nameAsPerAadhaar);
    if (this.accountHolderName) this.accountHolderName = await translateGujaratiToEnglish(this.accountHolderName);

    this.name = `${this.surname || ''} ${this.firstName || ''} ${this.fatherName || ''}`.trim().replace(/\s+/g, ' ').toUpperCase();
  } catch (err) {
    console.error('Error during pre-save translations:', err);
  }
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
