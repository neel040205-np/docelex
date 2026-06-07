const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_STUDENT',
      'UPDATE_STUDENT',
      'DELETE_STUDENT',
      'UPLOAD_DOCUMENT',
      'DELETE_DOCUMENT',
      'USER_LOGIN',
    ],
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
  },
  studentName: {
    type: String,
    required: false,
  },
  details: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
