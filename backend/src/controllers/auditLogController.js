const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs (Admin only)
// @route   GET /api/audit-logs
// @access  Private (Admin Only)
exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLogModel = req.models.AuditLog;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.action) {
      query.action = req.query.action;
    }

    if (req.query.performedBy) {
      query.performedBy = req.performedBy;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { details: searchRegex },
        { studentName: searchRegex },
      ];
    }

    const total = await AuditLogModel.countDocuments(query);
    const logs = await AuditLogModel.find(query)
      .populate('performedBy', 'name email role')
      .populate('studentId', 'name grNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving audit logs' });
  }
};
