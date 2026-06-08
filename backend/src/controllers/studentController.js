const Student = require('../models/Student');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const ImportHistory = require('../models/ImportHistory');
const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const axios = require('axios');

// Helper to delete physical file
const deletePhysicalFile = async (publicId) => {
  if (!publicId) return;
  if (publicId.startsWith('drive-')) return;

  if (isCloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary file deleted: ${publicId}`);
    } catch (err) {
      console.error(`Error deleting Cloudinary file ${publicId}:`, err);
    }
  } else {
    const filePath = path.join(__dirname, '../../uploads', publicId);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${filePath}`);
      }
    } catch (err) {
      console.error(`Error deleting local file ${filePath}:`, err);
    }
  }
};

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
  'aadhaarUpload',
  'bankPassbookUpload'
];

// @desc    Get all students with filters, searches, and pagination
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.class) {
      query.class = req.query.class;
    }

    if (req.query.casteCategory) {
      query.casteCategory = req.query.casteCategory;
    }

    // Filter by Admission Year
    if (req.query.admissionYear) {
      const year = parseInt(req.query.admissionYear, 10);
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      query.admissionDate = { $gte: start, $lte: end };
    }

    // Search by Name, GR, SR, Aadhaar, Mobile
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { surname: searchRegex },
        { fatherName: searchRegex },
        { grNumber: searchRegex },
        { srNumber: searchRegex },
        { aadhaarNumber: searchRegex },
        { mobileNumber1: searchRegex },
      ];
    }

    // Filter by overall Verification Status (at student level)
    if (req.query.verificationStatus) {
      const status = req.query.verificationStatus;
      if (status === 'Verified') {
        // Find students with no unverified documents
        const unverifiedDocIds = await Document.find({ status: { $ne: 'Verified' } }).distinct('studentId');
        query._id = { $nin: unverifiedDocIds };
      } else if (status === 'Rejected') {
        // Find students with at least one rejected document
        const rejectedDocIds = await Document.find({ status: 'Rejected' }).distinct('studentId');
        query._id = { $in: rejectedDocIds };
      } else if (status === 'Pending') {
        // Find students with at least one pending document
        const pendingDocIds = await Document.find({ status: 'Pending' }).distinct('studentId');
        query._id = { $in: pendingDocIds };
      }
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch Verification counts for each student in the result set
    const studentsWithDocCounts = await Promise.all(
      students.map(async (student) => {
        const docs = await Document.find({ studentId: student._id });
        const uploadedCount = docs.length;
        const verifiedCount = docs.filter((d) => d.status === 'Verified').length;
        const rejectedCount = docs.filter((d) => d.status === 'Rejected').length;
        
        return {
          ...student.toJSON(),
          documentStats: {
            uploaded: uploadedCount,
            verified: verifiedCount,
            rejected: rejectedCount,
            totalRequired: 11, // standard count of required files
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: students.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: studentsWithDocCounts,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Server error fetching students' });
  }
};

// @desc    Get single student details with populated documents
// @route   GET /api/students/:id
// @access  Private
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const documentsList = await Document.find({ studentId: student._id })
      .populate('verifiedBy', 'name');

    // Convert list to key-value map for easy consumption in frontend
    const documents = {};
    documentsList.forEach((doc) => {
      documents[doc.documentType] = {
        _id: doc._id,
        url: doc.fileUrl,
        publicId: doc.publicId,
        status: doc.status,
        remarks: doc.remarks,
        uploadDate: doc.uploadDate,
        verifiedBy: doc.verifiedBy,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...student.toJSON(),
        documents,
      },
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Register a new student (uniqueness checks for SR/GR)
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const { srNumber, grNumber } = req.body;

    const existingSR = await Student.findOne({ srNumber });
    if (existingSR) {
      return res.status(400).json({ success: false, message: `SR Number '${srNumber}' is already in use.` });
    }

    const existingGR = await Student.findOne({ grNumber });
    if (existingGR) {
      return res.status(400).json({ success: false, message: `GR Number '${grNumber}' is already in use.` });
    }

    req.body.createdBy = req.user._id;
    const student = await Student.create(req.body);

    await AuditLog.create({
      action: 'CREATE_STUDENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: `${student.firstName} ${student.surname}`,
      details: `Registered Student: ${student.firstName} ${student.surname} (SR: ${student.srNumber}, GR: ${student.grNumber})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating student' });
  }
};

// @desc    Update student fields
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const { srNumber, grNumber } = req.body;
    const studentId = req.params.id;

    if (srNumber) {
      const existingSR = await Student.findOne({ srNumber, _id: { $ne: studentId } });
      if (existingSR) {
        return res.status(400).json({ success: false, message: `SR Number '${srNumber}' is already in use.` });
      }
    }

    if (grNumber) {
      const existingGR = await Student.findOne({ grNumber, _id: { $ne: studentId } });
      if (existingGR) {
        return res.status(400).json({ success: false, message: `GR Number '${grNumber}' is already in use.` });
      }
    }

    req.body.updatedBy = req.user._id;
    const student = await Student.findByIdAndUpdate(studentId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await AuditLog.create({
      action: 'UPDATE_STUDENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: `${student.firstName} ${student.surname}`,
      details: `Updated info for student: ${student.firstName} ${student.surname}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating student' });
  }
};

// @desc    Delete student & all document records
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const documents = await Document.find({ studentId: student._id });
    const deletePromises = [];
    documents.forEach((doc) => {
      if (doc.publicId) {
        deletePromises.push(deletePhysicalFile(doc.publicId));
      }
    });

    await Promise.all(deletePromises);

    await Document.deleteMany({ studentId: student._id });
    await Student.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'DELETE_STUDENT',
      performedBy: req.user._id,
      studentName: `${student.firstName} ${student.surname}`,
      details: `Deleted student: ${student.firstName} ${student.surname} (SR: ${student.srNumber}) and all files`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Student and associated files deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Server error deleting student' });
  }
};

// @desc    Upload document file or Google Drive link
// @route   POST /api/students/:id/document/:documentType
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;

    if (!VALID_DOCUMENTS.includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type specified' });
    }

    let fileUrl;
    let filePublicId;
    let originalName;

    if (req.file) {
      fileUrl = req.file.path;
      filePublicId = req.file.filename;
      originalName = req.file.originalname;

      if (!isCloudinaryConfigured()) {
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        filePublicId = req.file.filename;
      }
    } else if (req.body.driveUrl) {
      fileUrl = req.body.driveUrl;
      filePublicId = `drive-${Date.now()}`;
      originalName = req.body.fileName || 'Google Drive File';
    } else {
      return res.status(400).json({ success: false, message: 'Please upload a file or provide a Google Drive URL' });
    }

    const student = await Student.findById(id);
    if (!student) {
      if (req.file) {
        await deletePhysicalFile(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const existingDoc = await Document.findOne({ studentId: id, documentType });
    if (existingDoc) {
      await deletePhysicalFile(existingDoc.publicId);
      existingDoc.fileUrl = fileUrl;
      existingDoc.publicId = filePublicId;
      existingDoc.status = 'Pending'; // resets on re-upload
      existingDoc.remarks = '';
      existingDoc.uploadDate = new Date();
      existingDoc.verifiedBy = null;
      await existingDoc.save();
    } else {
      await Document.create({
        studentId: id,
        documentType,
        fileUrl,
        publicId: filePublicId,
        uploadDate: new Date(),
        status: 'Pending',
      });
    }

    await AuditLog.create({
      action: 'UPLOAD_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: `${student.firstName} ${student.surname}`,
      details: `Uploaded ${documentType} for student ${student.firstName} ${student.surname} (${originalName})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Server error uploading document' });
  }
};

// @desc    Delete single document
// @route   DELETE /api/students/:id/document/:documentType
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;

    if (!VALID_DOCUMENTS.includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type specified' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const document = await Document.findOne({ studentId: id, documentType });
    if (!document) {
      return res.status(400).json({ success: false, message: 'Document does not exist' });
    }

    await deletePhysicalFile(document.publicId);
    await Document.deleteOne({ _id: document._id });

    await AuditLog.create({
      action: 'DELETE_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: `${student.firstName} ${student.surname}`,
      details: `Deleted ${documentType} for student ${student.firstName} ${student.surname}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Server error deleting document' });
  }
};

// @desc    Verify/Approve/Reject student document
// @route   PUT /api/students/:studentId/document/:documentType/verify
// @access  Private
exports.verifyDocument = async (req, res) => {
  try {
    const { studentId, documentType } = req.params;
    const { status, remarks } = req.body;

    if (!['Verified', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    const document = await Document.findOne({ studentId, documentType });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document record not found' });
    }

    document.status = status;
    document.remarks = remarks || '';
    document.verifiedBy = req.user._id;
    await document.save();

    res.status(200).json({
      success: true,
      message: `Document status updated to ${status}`,
      data: document,
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, message: 'Server error verifying document' });
  }
};

// @desc    Download all documents zip for one student
// @route   GET /api/students/:id/download-documents
// @access  Private
exports.downloadStudentDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.attachment(`${student.firstName}_${student.surname}_documents.zip`);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    const documents = await Document.find({ studentId: student._id });
    let fileCount = 0;

    for (const doc of documents) {
      if (!doc?.fileUrl) continue;
      fileCount++;

      try {
        const response = await axios({
          method: 'get',
          url: doc.fileUrl,
          responseType: 'stream',
        });

        const ext = doc.fileUrl.split('.').pop().split('?')[0] || 'pdf';
        archive.append(response.data, {
          name: `${doc.documentType}.${ext}`,
        });
      } catch (err) {
        console.error(`Error zipping document ${doc.documentType} for student ${student.firstName}:`, err.message);
      }
    }

    if (fileCount === 0) {
      const { Readable } = require('stream');
      const s = new Readable();
      s.push('No documents uploaded for this student yet.');
      s.push(null);
      archive.append(s, { name: 'readme.txt' });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error zipping student documents:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error downloading documents' });
    }
  }
};

// @desc    Download all documents zip for all students
// @route   GET /api/students/download/all
// @access  Private
exports.downloadAllDocuments = async (req, res) => {
  try {
    const students = await Student.find();

    res.attachment('students_documents.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    for (const student of students) {
      const folderName = `${student.firstName}_${student.surname}`.replace(/[^\w\s]/gi, '');
      const documents = await Document.find({ studentId: student._id });

      for (const doc of documents) {
        if (!doc?.fileUrl) continue;

        try {
          const response = await axios({
            method: 'get',
            url: doc.fileUrl,
            responseType: 'stream',
          });

          const ext = doc.fileUrl.split('.').pop().split('?')[0] || 'pdf';
          archive.append(response.data, {
            name: `${folderName}/${doc.documentType}.${ext}`,
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Download all documents error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error downloading all zip' });
    }
  }
};

// @desc    Export students to CSV
// @route   GET /api/students/export/csv
// @access  Private
exports.exportCSV = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ surname: 1, firstName: 1 });

    const csvHeaders = [
      'SR Number',
      'GR Number',
      'Surname',
      'First Name',
      'Gender',
      'DOB',
      'Admission Date',
      'Caste Category',
      'Aadhaar Number',
      'Bank Account Number',
      'IFSC Code',
      'Mobile 1',
      'Uploaded Documents Count'
    ].join(',');

    const csvRows = await Promise.all(
      students.map(async (s) => {
        const docsCount = await Document.countDocuments({ studentId: s._id });
        const dobStr = s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '';
        const admStr = s.admissionDate ? new Date(s.admissionDate).toISOString().slice(0, 10) : '';

        return [
          `"${s.srNumber}"`,
          `"${s.grNumber}"`,
          `"${s.surname.replace(/"/g, '""')}"`,
          `"${s.firstName.replace(/"/g, '""')}"`,
          `"${s.gender}"`,
          `"${dobStr}"`,
          `"${admStr}"`,
          `"${s.casteCategory}"`,
          `"${s.aadhaarNumber}"`,
          `"${s.bankAccountNumber}"`,
          `"${s.bankIfscCode}"`,
          `"${s.mobileNumber1}"`,
          docsCount
        ].join(',');
      })
    );

    const csvData = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Disposition', 'attachment; filename="students_master_report.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
};

// @desc    Export students to Excel
// @route   GET /api/students/export/excel
// @access  Private
exports.exportExcel = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ surname: 1, firstName: 1 });

    const data = await Promise.all(
      students.map(async (s) => {
        const docs = await Document.find({ studentId: s._id });
        const docStatuses = {};
        
        VALID_DOCUMENTS.forEach((docType) => {
          const doc = docs.find((d) => d.documentType === docType);
          docStatuses[docType] = doc ? doc.status : 'Pending Upload';
        });

        return {
          'SR Number': s.srNumber,
          'GR Number': s.grNumber,
          Surname: s.surname,
          'First Name': s.firstName,
          'Father Name': s.fatherName,
          'Mother Name': s.motherName,
          Gender: s.gender,
          DOB: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
          'Admission Date': s.admissionDate ? new Date(s.admissionDate).toISOString().slice(0, 10) : '',
          Category: s.casteCategory,
          Caste: s.caste,
          'Aadhaar Number': s.aadhaarNumber,
          'Account Number': s.bankAccountNumber,
          'IFSC Code': s.bankIfscCode,
          'Mobile 1': s.mobileNumber1,
          ...docStatuses
        };
      })
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StudentsMaster');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="students_master_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
};

// @desc    Export students to PDF
// @route   GET /api/students/export/pdf
// @access  Private
exports.exportPDF = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ surname: 1, firstName: 1 });
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Disposition', 'attachment; filename="students_master_report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('DocElex - Student Master Registration Report', { align: 'center' });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    const tableTop = 100;
    const srX = 30;
    const grX = 80;
    const nameX = 130;
    const genderX = 280;
    const dobX = 330;
    const catX = 400;
    const adhX = 460;
    const mobX = 560;
    const docsX = 640;
    const statusX = 700;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('SR No.', srX, tableTop);
    doc.text('GR No.', grX, tableTop);
    doc.text('Student Name', nameX, tableTop);
    doc.text('Gender', genderX, tableTop);
    doc.text('DOB', dobX, tableTop);
    doc.text('Category', catX, tableTop);
    doc.text('Aadhaar No.', adhX, tableTop);
    doc.text('Mobile 1', mobX, tableTop);
    doc.text('Docs', docsX, tableTop);
    doc.text('Status', statusX, tableTop);

    doc.moveTo(30, tableTop + 15).lineTo(800, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    for (const student of students) {
      if (y > 520) {
        doc.addPage({ layout: 'landscape' });
        y = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('SR No.', srX, y);
        doc.text('GR No.', grX, y);
        doc.text('Student Name', nameX, y);
        doc.text('Gender', genderX, y);
        doc.text('DOB', dobX, y);
        doc.text('Category', catX, y);
        doc.text('Aadhaar No.', adhX, y);
        doc.text('Mobile 1', mobX, y);
        doc.text('Docs', docsX, y);
        doc.text('Status', statusX, y);
        doc.moveTo(30, y + 15).lineTo(800, y + 15).stroke();
        y += 25;
        doc.font('Helvetica').fontSize(9);
      }

      const docs = await Document.find({ studentId: student._id });
      const uploadedCount = docs.length;
      const rejectedCount = docs.filter((d) => d.status === 'Rejected').length;
      const pendingCount = docs.filter((d) => d.status === 'Pending').length;

      let statusText = 'Verified';
      if (rejectedCount > 0) statusText = 'Rejected';
      else if (pendingCount > 0 || uploadedCount < 11) statusText = 'Pending';

      const fullName = `${student.firstName} ${student.surname}`;
      const dobStr = student.dob ? new Date(student.dob).toISOString().slice(0, 10) : '';

      doc.text(student.srNumber, srX, y);
      doc.text(student.grNumber, grX, y);
      doc.text(fullName.length > 25 ? fullName.substring(0, 22) + '...' : fullName, nameX, y);
      doc.text(student.gender, genderX, y);
      doc.text(dobStr, dobX, y);
      doc.text(student.casteCategory, catX, y);
      doc.text(student.aadhaarNumber, adhX, y);
      doc.text(student.mobileNumber1, mobX, y);
      doc.text(`${uploadedCount}/11`, docsX, y);
      doc.text(statusText, statusX, y);

      doc.moveTo(30, y + 12).lineTo(800, y + 12).strokeColor('#e4e4e4').lineWidth(0.5).stroke();
      y += 20;
    }

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to export PDF' });
    }
  }
};

// ==========================================
// BULK STUDENT IMPORT MODULE
// ==========================================

const templateHeaders = [
  'SR Number',
  'GR Number',
  'Surname',
  'First Name',
  'Father Name',
  'Grand Father Name',
  'Mother Name',
  'Gender',
  'Date of Birth',
  'Admission Date',
  'Caste',
  'Caste Category',
  'PEN Number',
  'APAAR ID',
  'UDISE Number',
  'Student Name as per Child Tracking',
  'Student Name as per UDISE+',
  'Aadhaar Number',
  'Name as per Aadhaar',
  'Date of Birth as per Aadhaar',
  'Student Bank Account Number',
  'IFSC Code',
  'Account Holder Name',
  'Mother Aadhaar Number',
  'Father Aadhaar Number',
  'Mobile Number 1',
  'Mobile Number 2'
];

const row1 = {
  'SR Number': 'SR10001',
  'GR Number': 'GR20001',
  'Surname': 'Sharma',
  'First Name': 'Aarav',
  'Father Name': 'Rajesh',
  'Grand Father Name': 'Mohanlal',
  'Mother Name': 'Sunita',
  'Gender': 'Male',
  'Date of Birth': '2015-05-15',
  'Admission Date': '2021-06-01',
  'Caste': 'Hindu Brahmin',
  'Caste Category': 'General',
  'PEN Number': 'PEN12345678',
  'APAAR ID': 'APAAR98765432',
  'UDISE Number': 'UDISE55443322',
  'Student Name as per Child Tracking': 'Aarav Rajesh Sharma',
  'Student Name as per UDISE+': 'Aarav R Sharma',
  'Aadhaar Number': '123456789012',
  'Name as per Aadhaar': 'Aarav Sharma',
  'Date of Birth as per Aadhaar': '2015-05-15',
  'Student Bank Account Number': '9876543210',
  'IFSC Code': 'SBIN0001234',
  'Account Holder Name': 'Aarav Sharma',
  'Mother Aadhaar Number': '987654321012',
  'Father Aadhaar Number': '876543210987',
  'Mobile Number 1': '9876543210',
  'Mobile Number 2': '9123456780'
};

const row2 = {
  'SR Number': 'SR10002',
  'GR Number': 'GR20002',
  'Surname': 'Patel',
  'First Name': 'Diya',
  'Father Name': 'Amit',
  'Grand Father Name': 'Ramanbhai',
  'Mother Name': 'Meenaben',
  'Gender': 'Female',
  'Date of Birth': '2016-08-20',
  'Admission Date': '2022-06-15',
  'Caste': 'Leva Patel',
  'Caste Category': 'OBC',
  'PEN Number': 'PEN87654321',
  'APAAR ID': 'APAAR23456789',
  'UDISE Number': 'UDISE22334455',
  'Student Name as per Child Tracking': 'Diya Amit Patel',
  'Student Name as per UDISE+': 'Diya A Patel',
  'Aadhaar Number': '234567890123',
  'Name as per Aadhaar': 'Diya Patel',
  'Date of Birth as per Aadhaar': '2016-08-20',
  'Student Bank Account Number': '1234567890',
  'IFSC Code': 'BARB0VADODR',
  'Account Holder Name': 'Diya Patel',
  'Mother Aadhaar Number': '876543210987',
  'Father Aadhaar Number': '765432109876',
  'Mobile Number 1': '8765432109',
  'Mobile Number 2': ''
};

const FIELD_MAPPINGS = {
  srNumber: ['sr number', 'sr no', 'sr no.', 'srnumber', 'sr_number', 'srnum'],
  grNumber: ['gr number', 'gr no', 'gr no.', 'grnumber', 'gr_number', 'grnum'],
  surname: ['surname', 'last name', 'lastname'],
  firstName: ['first name', 'firstname', 'student name', 'name'],
  fatherName: ['father name', 'father\'s name', 'fathername', 'father_name'],
  grandFatherName: ['grandfather name', 'grand father name', 'grandfather\'s name', 'grandfathername', 'grand_father_name'],
  motherName: ['mother name', 'mother\'s name', 'mothername', 'mother_name'],
  gender: ['gender', 'sex'],
  dob: ['dob', 'date of birth', 'dateofbirth', 'date_of_birth', 'birth date'],
  admissionDate: ['admission date', 'date of admission', 'admissiondate', 'admission_date'],
  caste: ['caste', 'sub caste', 'subcaste'],
  casteCategory: ['caste category', 'category', 'castecategory', 'caste_category'],
  penNumber: ['pen number', 'pen', 'pennumber', 'pen_number'],
  apaarId: ['apaar id', 'apaar', 'apaarid', 'apaar_id'],
  udiseNumber: ['udise number', 'udise', 'udisenumber', 'udise_brand_no'],
  nameAsPerChildTracking: ['student name as per child tracking', 'name as per child tracking', 'nameasperchildtracking'],
  nameAsPerUdisePlus: ['student name as per udise+', 'name as per udise', 'nameasperudiseplus'],
  aadhaarNumber: ['aadhaar number', 'aadhaar no', 'aadhaar no.', 'aadhaarnumber', 'aadhaar_number', 'aadhar number', 'aadhar no'],
  aadhaarName: ['name as per aadhaar', 'aadhaar name', 'aadhaarname', 'aadhaar_name', 'aadhar name'],
  aadhaarDob: ['date of birth as per aadhaar', 'aadhaar dob', 'aadhaardob', 'aadhaar_dob', 'aadhar dob'],
  bankAccountNumber: ['student bank account number', 'bank account number', 'account number', 'bankaccountnumber', 'bank_account_number', 'account no', 'account no.'],
  bankIfscCode: ['ifsc code', 'ifsc', 'ifsc_code', 'bank ifsc'],
  bankAccountHolderName: ['account holder name', 'bank account holder name', 'bankaccountholdername', 'bank_account_holder_name', 'holder name'],
  motherAadhaarNumber: ['mother aadhaar number', 'mother\'s aadhaar number', 'motheraadhaarnumber', 'mother_aadhaar_number', 'mother aadhaar', 'mother\'s aadhaar'],
  fatherAadhaarNumber: ['father aadhaar number', 'father\'s aadhaar number', 'fatheraadhaarnumber', 'father_aadhaar_number', 'father aadhaar', 'father\'s aadhaar'],
  mobileNumber1: ['mobile number 1', 'mobile 1', 'phone number 1', 'phone 1', 'mobile', 'phone', 'mobilenumber1', 'mobile_number_1'],
  mobileNumber2: ['mobile number 2', 'mobile 2', 'phone number 2', 'phone 2', 'mobilenumber2', 'mobile_number_2']
};

const parseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const dateStr = val.toString().trim();
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    } else if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

const formatDate = (dateObj) => {
  if (!dateObj) return '';
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const detectColumnMapping = (headers) => {
  const mapping = {};
  headers.forEach(h => {
    const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    for (const [key, variations] of Object.entries(FIELD_MAPPINGS)) {
      if (variations.includes(h.toLowerCase().trim()) || variations.some(v => v.replace(/[^a-z0-9]/g, '') === norm)) {
        mapping[h] = key;
        break;
      }
    }
  });
  return mapping;
};

// @desc    Download sample template for bulk student import (CSV or Excel)
// @route   GET /api/students/import/template
// @access  Private
exports.downloadImportTemplate = async (req, res) => {
  try {
    const format = req.query.format || 'xlsx';
    const data = [row1, row2];

    if (format === 'csv') {
      const headersLine = templateHeaders.join(',');
      const rowsLines = data.map(row => 
        templateHeaders.map(h => {
          const val = row[h] || '';
          return `"${val.toString().replace(/"/g, '""')}"`;
        }).join(',')
      );
      const csvData = [headersLine, ...rowsLines].join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csvData);
    } else {
      const ws = XLSX.utils.json_to_sheet(data, { header: templateHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.status(200).send(buffer);
    }
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

// @desc    Dry-run validate bulk import student file
// @route   POST /api/students/import/validate
// @access  Private
exports.validateBulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    let columnMapping = {};
    if (req.body.columnMapping) {
      try {
        columnMapping = typeof req.body.columnMapping === 'string' 
          ? JSON.parse(req.body.columnMapping) 
          : req.body.columnMapping;
      } catch (err) {
        console.error('Error parsing columnMapping:', err);
      }
    }
    
    const autoMapping = detectColumnMapping(headers);
    const finalMapping = { ...autoMapping, ...columnMapping };
    
    const srList = [];
    const grList = [];
    const fileSrSet = new Set();
    const fileGrSet = new Set();
    const internalSrDuplicates = new Set();
    const internalGrDuplicates = new Set();
    
    const parsedRows = jsonData.map((row, index) => {
      const mappedData = {};
      headers.forEach(h => {
        const key = finalMapping[h];
        if (key) {
          mappedData[key] = row[h] !== undefined ? row[h].toString().trim() : '';
        }
      });
      return { mappedData, rowIndex: index + 2 };
    });
    
    parsedRows.forEach(({ mappedData }) => {
      const sr = mappedData.srNumber;
      const gr = mappedData.grNumber;
      if (sr) {
        if (fileSrSet.has(sr)) internalSrDuplicates.add(sr);
        else fileSrSet.add(sr);
        srList.push(sr);
      }
      if (gr) {
        if (fileGrSet.has(gr)) internalGrDuplicates.add(gr);
        else fileGrSet.add(gr);
        grList.push(gr);
      }
    });
    
    const existingStudents = await Student.find({
      $or: [
        { srNumber: { $in: srList } },
        { grNumber: { $in: grList } }
      ]
    });
    
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    
    const validatedRows = parsedRows.map(({ mappedData, rowIndex }) => {
      const rowErrors = [];
      const data = { ...mappedData };
      
      if (data.gender) {
        const g = data.gender.toLowerCase();
        if (g === 'm' || g === 'male') data.gender = 'Male';
        else if (g === 'f' || g === 'female') data.gender = 'Female';
      }
      
      if (data.casteCategory) {
        const c = data.casteCategory.toUpperCase();
        if (['GENERAL', 'OBC', 'SC', 'ST', 'EWS'].includes(c)) {
          data.casteCategory = c === 'GENERAL' ? 'General' : c;
        }
      }
      
      const dobDate = parseDate(data.dob);
      if (data.dob && !dobDate) {
        rowErrors.push('Invalid Date of Birth format');
      } else if (dobDate) {
        data.dob = formatDate(dobDate);
      }
      
      const admDate = parseDate(data.admissionDate);
      if (data.admissionDate && !admDate) {
        rowErrors.push('Invalid Admission Date format');
      } else if (admDate) {
        data.admissionDate = formatDate(admDate);
      }
      
      const aadhDobDate = parseDate(data.aadhaarDob);
      if (data.aadhaarDob && !aadhDobDate) {
        rowErrors.push('Invalid Aadhaar DOB format');
      } else if (aadhDobDate) {
        data.aadhaarDob = formatDate(aadhDobDate);
      }
      
      const requiredFields = [
        { key: 'srNumber', name: 'SR Number' },
        { key: 'grNumber', name: 'GR Number' },
        { key: 'surname', name: 'Surname' },
        { key: 'firstName', name: 'First Name' },
        { key: 'fatherName', name: 'Father Name' },
        { key: 'grandFatherName', name: 'Grandfather Name' },
        { key: 'motherName', name: 'Mother Name' },
        { key: 'gender', name: 'Gender' },
        { key: 'dob', name: 'Date of Birth' },
        { key: 'admissionDate', name: 'Admission Date' },
        { key: 'caste', name: 'Caste' },
        { key: 'casteCategory', name: 'Caste Category' },
        { key: 'aadhaarNumber', name: 'Aadhaar Number' },
        { key: 'aadhaarName', name: 'Name as per Aadhaar' },
        { key: 'aadhaarDob', name: 'Date of Birth as per Aadhaar' },
        { key: 'bankAccountNumber', name: 'Bank Account Number' },
        { key: 'bankIfscCode', name: 'IFSC Code' },
        { key: 'bankAccountHolderName', name: 'Account Holder Name' },
        { key: 'motherAadhaarNumber', name: 'Mother Aadhaar Number' },
        { key: 'fatherAadhaarNumber', name: 'Father Aadhaar Number' },
        { key: 'mobileNumber1', name: 'Mobile Number 1' }
      ];
      
      requiredFields.forEach(f => {
        if (!data[f.key]) {
          rowErrors.push(`${f.name} is required`);
        }
      });
      
      if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) {
        rowErrors.push('Aadhaar Number must be exactly 12 digits');
      }
      if (data.motherAadhaarNumber && !/^\d{12}$/.test(data.motherAadhaarNumber)) {
        rowErrors.push('Mother Aadhaar Number must be exactly 12 digits');
      }
      if (data.fatherAadhaarNumber && !/^\d{12}$/.test(data.fatherAadhaarNumber)) {
        rowErrors.push('Father Aadhaar Number must be exactly 12 digits');
      }
      if (data.mobileNumber1 && !/^\d{10}$/.test(data.mobileNumber1)) {
        rowErrors.push('Mobile Number 1 must be exactly 10 digits');
      }
      if (data.mobileNumber2 && !/^\d{10}$/.test(data.mobileNumber2)) {
        rowErrors.push('Mobile Number 2 must be exactly 10 digits');
      }
      if (data.bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankIfscCode)) {
        rowErrors.push('Invalid IFSC Code format (e.g. SBIN0001234)');
      }
      if (data.gender && !['Male', 'Female'].includes(data.gender)) {
        rowErrors.push('Gender must be Male or Female');
      }
      if (data.casteCategory && !['General', 'OBC', 'SC', 'ST', 'EWS'].includes(data.casteCategory)) {
        rowErrors.push('Caste Category must be General, OBC, SC, ST, or EWS');
      }
      
      if (data.srNumber && internalSrDuplicates.has(data.srNumber)) {
        rowErrors.push(`Duplicate SR Number '${data.srNumber}' in file`);
      }
      if (data.grNumber && internalGrDuplicates.has(data.grNumber)) {
        rowErrors.push(`Duplicate GR Number '${data.grNumber}' in file`);
      }
      
      let rowType = 'new';
      if (data.srNumber || data.grNumber) {
        const existingBySR = existingStudents.find(s => s.srNumber === data.srNumber);
        const existingByGR = existingStudents.find(s => s.grNumber === data.grNumber);
        
        if (existingBySR || existingByGR) {
          if (existingBySR && existingByGR && existingBySR.id !== existingByGR.id) {
            rowErrors.push(`Conflict: SR Number matches student '${existingBySR.firstName} ${existingBySR.surname}' but GR Number matches student '${existingByGR.firstName} ${existingByGR.surname}'`);
          } else {
            rowType = 'update';
          }
        }
      }
      
      const isValid = rowErrors.length === 0;
      if (isValid) {
        validCount++;
        if (rowType === 'update') {
          duplicateCount++;
        }
      } else {
        invalidCount++;
      }
      
      return {
        rowNumber: rowIndex,
        data,
        type: rowType,
        errors: rowErrors,
        isValid
      };
    });
    
    res.status(200).json({
      success: true,
      headers,
      columnMapping: finalMapping,
      summary: {
        totalRecords: validatedRows.length,
        validRecords: validCount,
        invalidRecords: invalidCount,
        duplicateRecords: duplicateCount
      },
      rows: validatedRows
    });
  } catch (error) {
    console.error('Bulk validation error:', error);
    res.status(500).json({ success: false, message: 'Server error during validation' });
  }
};

// @desc    Execute bulk import of validated student records
// @route   POST /api/students/import/execute
// @access  Private
exports.executeBulkImport = async (req, res) => {
  try {
    const { rows, fileName, totalRecords, errorReport } = req.body;
    
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Invalid import data format' });
    }
    
    const newRows = rows.filter(r => r.isValid && r.type === 'new');
    const updateRows = rows.filter(r => r.isValid && r.type === 'update');
    
    const requiredDocs = [
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
      'studentAadhaar'
    ];
    
    let successCount = 0;
    const insertedStudents = [];
    const updatedStudentsList = [];
    
    // 1. Process inserts in batches
    if (newRows.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < newRows.length; i += batchSize) {
        const batch = newRows.slice(i, i + batchSize).map(r => ({
          ...r.data,
          createdBy: req.user._id
        }));
        
        try {
          const inserted = await Student.insertMany(batch, { ordered: false });
          insertedStudents.push(...inserted);
          successCount += inserted.length;
        } catch (err) {
          console.error('Error inserting batch:', err);
          if (err.insertedDocs) {
            insertedStudents.push(...err.insertedDocs);
            successCount += err.insertedDocs.length;
          }
        }
      }
    }
    
    // Create document checklists for all inserted students
    if (insertedStudents.length > 0) {
      const docsToInsert = [];
      insertedStudents.forEach(s => {
        requiredDocs.forEach(docType => {
          docsToInsert.push({
            studentId: s._id,
            documentType: docType,
            status: 'Pending'
          });
        });
      });
      
      if (docsToInsert.length > 0) {
        await Document.insertMany(docsToInsert, { ordered: false });
      }
    }
    
    // 2. Process updates in batches
    if (updateRows.length > 0) {
      const srList = updateRows.map(r => r.data.srNumber).filter(Boolean);
      const grList = updateRows.map(r => r.data.grNumber).filter(Boolean);
      
      const dbStudents = await Student.find({
        $or: [
          { srNumber: { $in: srList } },
          { grNumber: { $in: grList } }
        ]
      });
      
      const bulkOps = [];
      updateRows.forEach(r => {
        const dbStudent = dbStudents.find(s => s.srNumber === r.data.srNumber || s.grNumber === r.data.grNumber);
        if (dbStudent) {
          r.data.updatedBy = req.user._id;
          bulkOps.push({
            updateOne: {
              filter: { _id: dbStudent._id },
              update: { $set: r.data }
            }
          });
          updatedStudentsList.push(dbStudent);
        }
      });
      
      if (bulkOps.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batchOps = bulkOps.slice(i, i + batchSize);
          try {
            const res = await Student.bulkWrite(batchOps, { ordered: false });
            successCount += (res.modifiedCount || res.nModified || 0) + (res.upsertedCount || 0);
          } catch (err) {
            console.error('Error executing bulk update batch:', err);
          }
        }
      }
      
      // Ensure document checklist for updated students
      if (updatedStudentsList.length > 0) {
        const updatedStudentIds = updatedStudentsList.map(s => s._id);
        const existingDocs = await Document.find({ studentId: { $in: updatedStudentIds } });
        const existingDocsMap = new Set(existingDocs.map(d => `${d.studentId.toString()}_${d.documentType}`));
        
        const docsToInsertForUpdated = [];
        updatedStudentsList.forEach(s => {
          requiredDocs.forEach(docType => {
            const key = `${s._id.toString()}_${docType}`;
            if (!existingDocsMap.has(key)) {
              docsToInsertForUpdated.push({
                studentId: s._id,
                documentType: docType,
                status: 'Pending'
              });
            }
          });
        });
        
        if (docsToInsertForUpdated.length > 0) {
          await Document.insertMany(docsToInsertForUpdated, { ordered: false });
        }
      }
    }
    
    const failedRecordsCount = (totalRecords || rows.length) - successCount;
    const history = await ImportHistory.create({
      fileName: fileName || 'bulk_import.xlsx',
      importedBy: req.user._id,
      totalRecords: totalRecords || rows.length,
      successRecords: successCount,
      failedRecords: failedRecordsCount >= 0 ? failedRecordsCount : 0,
      errorReport: errorReport || []
    });
    
    await AuditLog.create({
      action: 'BULK_IMPORT',
      performedBy: req.user._id,
      details: `Executed bulk student import for file: ${fileName || 'unnamed'}. Success: ${successCount}, Failed: ${failedRecordsCount >= 0 ? failedRecordsCount : 0}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });
    
    res.status(200).json({
      success: true,
      message: `Bulk import completed. Successfully processed ${successCount} records.`,
      data: history
    });
  } catch (error) {
    console.error('Execution of bulk import failed:', error);
    res.status(500).json({ success: false, message: 'Server error during bulk import execution' });
  }
};

// @desc    Get import history logs
// @route   GET /api/students/import/history
// @access  Private
exports.getImportHistory = async (req, res) => {
  try {
    const history = await ImportHistory.find({})
      .populate('importedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({ success: false, message: 'Server error fetching import history' });
  }
};

// @desc    Download import failure error report CSV
// @route   GET /api/students/import/history/:id/error-report
// @access  Private
exports.downloadImportErrorReport = async (req, res) => {
  try {
    const history = await ImportHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ success: false, message: 'Import history log not found' });
    }
    
    const csvHeaders = ['Row Number', 'Identifier (SR/GR)', 'Student Name', 'Errors'].join(',');
    const csvRows = history.errorReport.map(err => {
      return [
        err.rowNumber,
        `"${(err.identifier || '').replace(/"/g, '""')}"`,
        `"${(err.studentName || '').replace(/"/g, '""')}"`,
        `"${err.errors.join('; ').replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvData = [csvHeaders, ...csvRows].join('\n');
    
    res.setHeader('Content-Disposition', `attachment; filename="error_report_${history._id}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
  } catch (error) {
    console.error('Error exporting error report CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export error report' });
  }
};
