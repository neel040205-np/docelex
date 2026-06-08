import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export type DocumentType =
  | 'birthCertificate'
  | 'incomeCertificate'
  | 'rationCard'
  | 'studentCasteCertificate'
  | 'fatherCasteCertificate'
  | 'studentBankPassbook'
  | 'fatherBankPassbook'
  | 'motherBankPassbook'
  | 'motherAadhaar'
  | 'fatherAadhaar'
  | 'studentAadhaar';

export interface IDocument extends MongooseDocument {
  studentId: mongoose.Types.ObjectId;
  documentType: DocumentType;
  fileUrl: string;
  publicId: string;
  uploadDate: Date;
  status: 'Pending' | 'Verified' | 'Rejected';
  remarks?: string;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID reference is required'],
      index: true,
    },
    documentType: {
      type: String,
      enum: {
        values: [
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
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Public ID or File Name is required'],
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Verified', 'Rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a student cannot have duplicate document entries of the same type
DocumentSchema.index({ studentId: 1, documentType: 1 }, { unique: true });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
