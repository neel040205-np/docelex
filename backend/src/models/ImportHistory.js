const mongoose = require('mongoose');

const ImportHistorySchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalRecords: {
      type: Number,
      required: true,
    },
    successRecords: {
      type: Number,
      required: true,
    },
    failedRecords: {
      type: Number,
      required: true,
    },
    errorReport: [
      {
        rowNumber: Number,
        identifier: String, // GR or SR Number
        studentName: String,
        errors: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ImportHistory', ImportHistorySchema);
