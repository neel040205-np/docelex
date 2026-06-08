const mongoose = require('mongoose');

// Import base models to ensure their schemas are registered with Mongoose
require('../models/Student');
require('../models/Document');
require('../models/AuditLog');

const getDynamicModel = (baseModelName, collectionPrefix, userId) => {
  if (!userId) {
    throw new Error(`User ID is required to get dynamic model for ${baseModelName}`);
  }
  
  const userIdStr = userId.toString();
  const collectionName = `${collectionPrefix}_${userIdStr}`;
  const modelName = `${baseModelName}_${userIdStr}`;

  // If already compiled, return the cached model
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  // Get schema from the base model
  const baseModel = mongoose.model(baseModelName);
  const schema = baseModel.schema;

  // Compile new model targeting the user-specific collection
  return mongoose.model(modelName, schema, collectionName);
};

const getStudentModel = (userId) => getDynamicModel('Student', 'students', userId);
const getDocumentModel = (userId) => getDynamicModel('Document', 'documents', userId);
const getAuditLogModel = (userId) => getDynamicModel('AuditLog', 'auditlogs', userId);

module.exports = {
  getStudentModel,
  getDocumentModel,
  getAuditLogModel,
};
