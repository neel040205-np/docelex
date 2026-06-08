const Student = require('../models/Student');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
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
