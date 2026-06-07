const Student = require('../models/Student');

// @desc    Get dashboard metrics & visual stats
// @route   GET /api/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    // 1. Total Students
    const totalStudents = await Student.countDocuments({});

    // 2. Missing Documents Count (students who are missing at least 1 document)
    const missingDocsCount = await Student.countDocuments({
      $or: [
        { 'documents.birthCertificate': { $exists: false } },
        { 'documents.studentAadhaar': { $exists: false } },
        { 'documents.fatherAadhaar': { $exists: false } },
        { 'documents.motherAadhaar': { $exists: false } },
        { 'documents.rationCard': { $exists: false } },
        { 'documents.addressProof': { $exists: false } },
        { 'documents.incomeCertificate': { $exists: false } },
        { 'documents.casteCertificate': { $exists: false } },
        { 'documents.passportPhoto': { $exists: false } },
      ],
    });

    const completeDocsCount = totalStudents - missingDocsCount;

    // 3. Class Wise Statistics (Aggregation pipeline)
    const classStats = await Student.aggregate([
      {
        $project: {
          class: 1,
          isMissing: {
            $cond: {
              if: {
                $or: [
                  { $eq: [{ $ifNull: ['$documents.birthCertificate', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.studentAadhaar', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.fatherAadhaar', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.motherAadhaar', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.rationCard', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.addressProof', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.incomeCertificate', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.casteCertificate', null] }, null] },
                  { $eq: [{ $ifNull: ['$documents.passportPhoto', null] }, null] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: '$class',
          total: { $sum: 1 },
          missing: { $sum: '$isMissing' },
        },
      },
      {
        $project: {
          class: '$_id',
          total: 1,
          missing: 1,
          complete: { $subtract: ['$total', '$missing'] },
          _id: 0,
        },
      },
      { $sort: { class: 1 } },
    ]);

    // 4. Document-wise upload statistics breakdown
    const docBreakdown = await Student.aggregate([
      {
        $group: {
          _id: null,
          birthCertificate: {
            $sum: { $cond: [{ $ifNull: ['$documents.birthCertificate', false] }, 1, 0] },
          },
          studentAadhaar: {
            $sum: { $cond: [{ $ifNull: ['$documents.studentAadhaar', false] }, 1, 0] },
          },
          fatherAadhaar: {
            $sum: { $cond: [{ $ifNull: ['$documents.fatherAadhaar', false] }, 1, 0] },
          },
          motherAadhaar: {
            $sum: { $cond: [{ $ifNull: ['$documents.motherAadhaar', false] }, 1, 0] },
          },
          rationCard: {
            $sum: { $cond: [{ $ifNull: ['$documents.rationCard', false] }, 1, 0] },
          },
          addressProof: {
            $sum: { $cond: [{ $ifNull: ['$documents.addressProof', false] }, 1, 0] },
          },
          incomeCertificate: {
            $sum: { $cond: [{ $ifNull: ['$documents.incomeCertificate', false] }, 1, 0] },
          },
          casteCertificate: {
            $sum: { $cond: [{ $ifNull: ['$documents.casteCertificate', false] }, 1, 0] },
          },
          passportPhoto: {
            $sum: { $cond: [{ $ifNull: ['$documents.passportPhoto', false] }, 1, 0] },
          },
        },
      },
    ]);

    // Format doc breakdown output cleanly
    const documentStats = [];
    const keys = [
      { key: 'birthCertificate', name: 'Birth Certificate' },
      { key: 'studentAadhaar', name: 'Student Aadhaar' },
      { key: 'fatherAadhaar', name: 'Father Aadhaar' },
      { key: 'motherAadhaar', name: 'Mother Aadhaar' },
      { key: 'rationCard', name: 'Ration Card' },
      { key: 'addressProof', name: 'Address Proof' },
      { key: 'incomeCertificate', name: 'Income Certificate' },
      { key: 'casteCertificate', name: 'Caste Certificate' },
      { key: 'passportPhoto', name: 'Passport Photo' },
    ];

    if (docBreakdown.length > 0) {
      const dbRow = docBreakdown[0];
      keys.forEach(({ key, name }) => {
        const uploadedCount = dbRow[key] || 0;
        documentStats.push({
          documentType: key,
          name,
          uploaded: uploadedCount,
          missing: totalStudents - uploadedCount,
        });
      });
    } else {
      keys.forEach(({ key, name }) => {
        documentStats.push({
          documentType: key,
          name,
          uploaded: 0,
          missing: totalStudents,
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalStudents,
          missingDocsStudents: missingDocsCount,
          completeDocsStudents: completeDocsCount,
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
