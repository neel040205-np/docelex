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
// ---------------------------------------------------------------------------
// Gujarati → English Transliteration (local, no API calls, works everywhere)
// Converts Gujarati script to English letters preserving pronunciation.
// Examples: પટેલ → Patel, મહેશ → Mahesh, નીલ → Nil, જિતેશ → Jitesh
// ---------------------------------------------------------------------------

// Consonant base sounds (without inherent vowel 'a')
const GU_CONSONANTS = {
  '\u0A95': 'k',   '\u0A96': 'kh',  '\u0A97': 'g',   '\u0A98': 'gh',  '\u0A99': 'ng',
  '\u0A9A': 'ch',  '\u0A9B': 'chh', '\u0A9C': 'j',   '\u0A9D': 'z',   '\u0A9E': 'ny',
  '\u0A9F': 't',   '\u0AA0': 'th',  '\u0AA1': 'd',   '\u0AA2': 'dh',  '\u0AA3': 'n',
  '\u0AA4': 't',   '\u0AA5': 'th',  '\u0AA6': 'd',   '\u0AA7': 'dh',  '\u0AA8': 'n',
  '\u0AAA': 'p',   '\u0AAB': 'f',   '\u0AAC': 'b',   '\u0AAD': 'bh',  '\u0AAE': 'm',
  '\u0AAF': 'y',   '\u0AB0': 'r',   '\u0AB2': 'l',   '\u0AB3': 'l',   '\u0AB5': 'v',
  '\u0AB6': 'sh',  '\u0AB7': 'sh',  '\u0AB8': 's',   '\u0AB9': 'h',
};

// Independent vowels (used at the start of a word or after another vowel)
const GU_VOWELS = {
  '\u0A85': 'a',  '\u0A86': 'a',  '\u0A87': 'i',  '\u0A88': 'i',
  '\u0A89': 'u',  '\u0A8A': 'u',  '\u0A8B': 'ru',
  '\u0A8F': 'e',  '\u0A90': 'ai', '\u0A93': 'o',  '\u0A94': 'au',
};

// Vowel signs (matras) — replace the inherent 'a' of the preceding consonant
const GU_MATRAS = {
  '\u0ABE': 'a',  '\u0ABF': 'i',  '\u0AC0': 'i',
  '\u0AC1': 'u',  '\u0AC2': 'u',  '\u0AC3': 'ru',
  '\u0AC7': 'e',  '\u0AC8': 'ai', '\u0ACB': 'o',  '\u0ACC': 'au',
};

// Gujarati digits
const GU_DIGITS = {
  '\u0AE6': '0', '\u0AE7': '1', '\u0AE8': '2', '\u0AE9': '3', '\u0AEA': '4',
  '\u0AEB': '5', '\u0AEC': '6', '\u0AED': '7', '\u0AEE': '8', '\u0AEF': '9',
};

const GU_VIRAMA = '\u0ACD';   // ્  — halant, suppresses inherent vowel
const GU_ANUSVARA = '\u0A82'; // ં  — nasal sound
const GU_VISARGA = '\u0A83';  // ઃ  — aspirated sound
const GU_NUKTA = '\u0ABC';    // ઼  — modifier dot

/**
 * Transliterate a single word from Gujarati script to Latin letters.
 * Uses schwa-deletion at end of word (standard for Gujarati/Hindi names).
 */
const transliterateWord = (word) => {
  const chars = Array.from(word);
  let result = '';
  let lastWasConsonant = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (GU_CONSONANTS[ch]) {
      // Consonant: add consonant sound + inherent 'a'
      result += GU_CONSONANTS[ch] + 'a';
      lastWasConsonant = true;
    } else if (GU_MATRAS[ch]) {
      // Matra: replace the inherent 'a' with the matra vowel
      if (lastWasConsonant && result.endsWith('a')) {
        result = result.slice(0, -1);
      }
      result += GU_MATRAS[ch];
      lastWasConsonant = false;
    } else if (ch === GU_VIRAMA) {
      // Virama: remove the inherent 'a' (conjunct consonant)
      if (result.endsWith('a')) {
        result = result.slice(0, -1);
      }
      lastWasConsonant = false;
    } else if (GU_VOWELS[ch]) {
      result += GU_VOWELS[ch];
      lastWasConsonant = false;
    } else if (ch === GU_ANUSVARA) {
      result += 'n';
      lastWasConsonant = false;
    } else if (ch === GU_VISARGA) {
      result += 'h';
      lastWasConsonant = false;
    } else if (GU_DIGITS[ch]) {
      result += GU_DIGITS[ch];
      lastWasConsonant = false;
    } else if (ch === GU_NUKTA) {
      // Skip nukta modifier
    } else {
      // Non-Gujarati character (ASCII, punctuation, etc.) — keep as-is
      result += ch;
      lastWasConsonant = false;
    }
  }

  // Schwa deletion: remove trailing inherent 'a' at end of word
  // (standard in Gujarati pronunciation — પટેલ is "Patel" not "Patela")
  if (lastWasConsonant && result.endsWith('a')) {
    result = result.slice(0, -1);
  }

  // Capitalize first letter of the word
  if (result.length > 0) {
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
};

/**
 * Transliterate Gujarati text to English.
 * If text is already in English/ASCII, returns it unchanged.
 */
const transliterateGujarati = (text) => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (!trimmed) return '';

  // If the text is already ASCII (English), skip transliteration
  if (/^[\u0000-\u007F]*$/.test(trimmed)) {
    return trimmed;
  }

  // Split by whitespace, transliterate each word, rejoin
  return trimmed.split(/\s+/).map(transliterateWord).join(' ');
};

// Pre-save hook to transliterate Gujarati names and auto-populate the 'name' field
StudentSchema.pre('save', async function (next) {
  try {
    // Transliterate name fields if entered in Gujarati script
    if (this.surname) this.surname = transliterateGujarati(this.surname);
    if (this.firstName) this.firstName = transliterateGujarati(this.firstName);
    if (this.fatherName) this.fatherName = transliterateGujarati(this.fatherName);
    if (this.grandFatherName) this.grandFatherName = transliterateGujarati(this.grandFatherName);
    if (this.motherName) this.motherName = transliterateGujarati(this.motherName);
    if (this.nameAsPerAadhaar) this.nameAsPerAadhaar = transliterateGujarati(this.nameAsPerAadhaar);
    if (this.accountHolderName) this.accountHolderName = transliterateGujarati(this.accountHolderName);

    this.name = `${this.surname || ''} ${this.firstName || ''} ${this.fatherName || ''}`.trim().replace(/\s+/g, ' ').toUpperCase();
  } catch (err) {
    console.error('Error during pre-save:', err);
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
