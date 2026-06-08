const { getStudentModel, getDocumentModel, getAuditLogModel } = require('../utils/dynamicModels');

const attachDynamicModels = (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      req.models = {
        Student: getStudentModel(req.user._id),
        Document: getDocumentModel(req.user._id),
        AuditLog: getAuditLogModel(req.user._id),
      };
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication context missing; cannot mount scoped dynamic models',
      });
    }
    next();
  } catch (error) {
    console.error('Error attaching dynamic models:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error setting up scoped user data connection',
    });
  }
};

module.exports = {
  attachDynamicModels,
};
