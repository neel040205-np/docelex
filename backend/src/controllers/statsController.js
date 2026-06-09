const Student = require('../models/Student');
const Document = require('../models/Document');

// Define the 11 required documents list
const VALID_DOCUMENTS = [
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
];

// @desc    Get dashboard metrics & visual stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const StudentModel = req.models.Student;
    const DocumentModel = req.models.Document;

    // 1. Total Students
    const totalStudents = await StudentModel.countDocuments({});

    // 2. Count by verification status
    const verifiedStudents = await StudentModel.countDocuments({ verificationStatus: 'Verified' });
    const rejectedStudents = await StudentModel.countDocuments({ verificationStatus: 'Rejected' });
    const pendingStudents = await StudentModel.countDocuments({ verificationStatus: 'Pending' });

    // 3. Class Wise Statistics (Aggregation pipeline)
    const classStatsAgg = await StudentModel.aggregate([
      {
        $group: {
          _id: '$class',
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Verified'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'Rejected'] }, 1, 0] } },
        },
      },
      {
        $project: {
          class: '$_id',
          total: 1,
          verified: 1,
          pending: 1,
          rejected: 1,
          complete: '$verified',
          _id: 0,
        },
      },
    ]);

    const classesOrder = [
      'Balvatika', 'Class 1', 'Class 2', 'Class 3', 'Class 4',
      'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9',
      'Class 10', 'Class 11', 'Class 12'
    ];

    const classStatsMap = {};
    classStatsAgg.forEach((item) => {
      classStatsMap[item.class] = item;
    });

    const classStats = classesOrder.map((className) => {
      const stats = classStatsMap[className] || { total: 0, verified: 0, pending: 0, rejected: 0 };
      return {
        class: className,
        total: stats.total,
        verified: stats.verified,
        pending: stats.pending,
        rejected: stats.rejected,
        complete: stats.verified,
        missing: stats.total - stats.verified,
      };
    });

    // 4. Document-wise upload statistics breakdown
    const docStatsAgg = await DocumentModel.aggregate([
      {
        $group: {
          _id: '$documentType',
          uploaded: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] } },
        },
      },
    ]);

    const docStatsMap = {};
    docStatsAgg.forEach((item) => {
      docStatsMap[item._id] = { uploaded: item.uploaded, verified: item.verified };
    });

    const documentStats = VALID_DOCUMENTS.map((docType) => {
      const stats = docStatsMap[docType] || { uploaded: 0, verified: 0 };
      // Format document type key into display name
      const displayName = docType
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());

      return {
        documentType: docType,
        name: displayName,
        uploaded: stats.uploaded,
        missing: totalStudents - stats.uploaded,
        verified: stats.verified,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalStudents,
          verifiedStudents,
          rejectedStudents,
          pendingStudents,
          missingDocsStudents: totalStudents - verifiedStudents,
          completeDocsStudents: verifiedStudents,
        },
        classStats,
        documentStats,
      },
    });
  } catch (error) {
    console.error('Stats aggregation error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
};
