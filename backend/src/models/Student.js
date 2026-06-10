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

// Helper to apply custom transliteration overrides
const applyCustomReplacements = (translated) => {
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
};

// Gujarati Unicode → Latin transliteration map (local fallback, no API needed)
const GUJARATI_MAP = {
  // Vowels
  '\u0A85': 'a', '\u0A86': 'aa', '\u0A87': 'i', '\u0A88': 'ee', '\u0A89': 'u', '\u0A8A': 'oo',
  '\u0A8B': 'ru', '\u0A8F': 'e', '\u0A90': 'ai', '\u0A93': 'o', '\u0A94': 'au',
  // Vowel signs (matras)
  '\u0ABE': 'aa', '\u0ABF': 'i', '\u0AC0': 'ee', '\u0AC1': 'u', '\u0AC2': 'oo',
  '\u0AC3': 'ru', '\u0AC7': 'e', '\u0AC8': 'ai', '\u0ACB': 'o', '\u0ACC': 'au',
  // Consonants
  '\u0A95': 'ka', '\u0A96': 'kha', '\u0A97': 'ga', '\u0A98': 'gha', '\u0A99': 'nga',
  '\u0A9A': 'cha', '\u0A9B': 'chha', '\u0A9C': 'ja', '\u0A9D': 'jha', '\u0A9E': 'nya',
  '\u0A9F': 'ta', '\u0AA0': 'tha', '\u0AA1': 'da', '\u0AA2': 'dha', '\u0AA3': 'na',
  '\u0AA4': 'ta', '\u0AA5': 'tha', '\u0AA6': 'da', '\u0AA7': 'dha', '\u0AA8': 'na',
  '\u0AAA': 'pa', '\u0AAB': 'pha', '\u0AAC': 'ba', '\u0AAD': 'bha', '\u0AAE': 'ma',
  '\u0AAF': 'ya', '\u0AB0': 'ra', '\u0AB2': 'la', '\u0AB3': 'la', '\u0AB5': 'va',
  '\u0AB6': 'sha', '\u0AB7': 'sha', '\u0AB8': 'sa', '\u0AB9': 'ha',
  // Special signs
  '\u0ACD': '', // Virama (halant) - suppresses inherent vowel
  '\u0A82': 'n', // Anusvara
  '\u0A83': 'h', // Visarga
  '\u0ABD': '', // Avagraha
  '\u0AD0': 'om', // Om
  // Digits
  '\u0AE6': '0', '\u0AE7': '1', '\u0AE8': '2', '\u0AE9': '3', '\u0AEA': '4',
  '\u0AEB': '5', '\u0AEC': '6', '\u0AED': '7', '\u0AEE': '8', '\u0AEF': '9',
};

// Local transliteration using character map (no network calls)
const transliterateLocal = (text) => {
  let result = '';
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (GUJARATI_MAP.hasOwnProperty(ch)) {
      const mapped = GUJARATI_MAP[ch];
      // If this is a vowel sign (matra), remove the inherent 'a' from previous consonant
      if (ch >= '\u0ABE' && ch <= '\u0ACC' && result.length > 0 && result.endsWith('a')) {
        result = result.slice(0, -1) + mapped;
      } else if (ch === '\u0ACD') {
        // Virama: remove inherent 'a' from previous consonant
        if (result.endsWith('a')) {
          result = result.slice(0, -1);
        }
      } else {
        result += mapped;
      }
    } else if (/[\u0A80-\u0AFF]/.test(ch)) {
      // Unknown Gujarati character — skip
      result += ch;
    } else {
      // ASCII / space / punctuation — keep as-is
      result += ch;
    }
  }
  // Capitalize each word
  return result.replace(/\b\w/g, (c) => c.toUpperCase());
};

// Translation helper for Gujarati to English names
const translateGujaratiToEnglish = async (text) => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (!trimmed) return '';
  // If the text contains only ASCII/English characters, skip translation
  if (/^[\u0000-\u007F]*$/.test(trimmed)) {
    return trimmed;
  }

  // Endpoint 1: clients5 Google Translate (Chrome Extension dict API)
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=gu&tl=en&q=${encodeURIComponent(trimmed)}`;
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data[0]) {
      let translated = String(response.data[0]).trim();
      if (translated && /^[\u0000-\u007F]*$/.test(translated)) {
        console.log(`[Translate] clients5 OK: "${trimmed}" → "${translated}"`);
        return applyCustomReplacements(translated);
      }
    }
  } catch (err) {
    console.warn(`[Translate] clients5 failed for "${trimmed}":`, err.message);
  }

  // Endpoint 2: gtx Google Translate API
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
      let translated = String(response.data[0][0][0]).trim();
      if (translated && /^[\u0000-\u007F]*$/.test(translated)) {
        console.log(`[Translate] gtx OK: "${trimmed}" → "${translated}"`);
        return applyCustomReplacements(translated);
      }
    }
  } catch (err) {
    console.warn(`[Translate] gtx failed for "${trimmed}":`, err.message);
  }

  // Endpoint 3: MyMemory free translation API (no key needed, 5000 chars/day)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=gu|en`;
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      let translated = String(response.data.responseData.translatedText).trim();
      if (translated && /^[\u0000-\u007F]*$/.test(translated)) {
        console.log(`[Translate] MyMemory OK: "${trimmed}" → "${translated}"`);
        return applyCustomReplacements(translated);
      }
    }
  } catch (err) {
    console.warn(`[Translate] MyMemory failed for "${trimmed}":`, err.message);
  }

  // Fallback: Local Gujarati → Latin transliteration (always works, no network needed)
  const localResult = transliterateLocal(trimmed);
  console.log(`[Translate] Local fallback: "${trimmed}" → "${localResult}"`);
  return applyCustomReplacements(localResult);
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
