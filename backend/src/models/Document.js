const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        'birthCertificate',
        'incomeCertificate',
        'rationCard',
        'studentCasteCertificate',
        'fatherCasteCertificate',
        'studentBankPassbook',
        'fatherBankPassbook',
        'motherBankPassbook',
        'motherAadhaar',
        'fatherAadhaar',
        'studentAadhaar',
        'aadhaarUpload',
        'bankPassbookUpload'
      ],
      required: true,
    },
    fileUrl: {
      type: String,
    },
    publicId: {
      type: String,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one instance of a documentType per student
DocumentSchema.index({ studentId: 1, documentType: 1 }, { unique: true });

module.exports = mongoose.model('Document', DocumentSchema);
