const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true, // for Cloudinary deletion, or file name if local
  },
  fileName: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,///////////////
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    grNumber: {
      type: String,
      required: [true, 'GR Number is required'],
      unique: true,
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
    dob: {
      type: Date,
      required: [true, 'Date of Birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    fatherName: {
      type: String,
      required: [true, 'Father name is required'],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, 'Mother name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    village: {
      type: String,
      trim: true,
    },
    taluka: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    // Document Uploads
    documents: {
      birthCertificate: DocumentSchema,
      studentAadhaar: DocumentSchema,
      fatherAadhaar: DocumentSchema,
      motherAadhaar: DocumentSchema,
      rationCard: DocumentSchema,
      addressProof: DocumentSchema,
      incomeCertificate: DocumentSchema,
      casteCertificate: DocumentSchema,
      passportPhoto: DocumentSchema,
    },
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

// Composite or index searches
StudentSchema.index({ name: 'text', grNumber: 'text' });

module.exports = mongoose.model('Student', StudentSchema);
