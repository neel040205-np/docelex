const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
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
      ],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
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
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookup of specific documents per student
DocumentSchema.index({ studentId: 1, documentType: 1 }, { unique: true });

module.exports = mongoose.model('Document', DocumentSchema);
