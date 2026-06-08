const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const archiver = require('archiver');
const axios = require('axios');

exports.downloadAllDocuments = async (req, res) => {
  const students = await Student.find();

  res.attachment('students_documents.zip');

  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  archive.pipe(res);

  for (const student of students) {
    const folderName = student.name.replace(/[^\w\s]/gi, '');

    for (const [key, doc] of Object.entries(student.documents || {})) {
      if (!doc?.url) continue;

      try {
        const response = await axios({
          method: 'get',
          url: doc.url,
          responseType: 'stream',
        });

        archive.append(response.data, {
          name: `${folderName}/${doc.fileName}`,
        });
      } catch (err) {
        console.error(err);
      }
    }
  }

  await archive.finalize();
};

// Helper to delete physical file
const deletePhysicalFile = async (publicId) => {
  if (!publicId) return;
  if (publicId.startsWith('drive-')) return;

  if (isCloudinaryConfigured()) {
    try {
      // Cloudinary deletion
      // If it's a PDF, we might need to specify resource_type in some configs, or let it auto-detect.
      // We pass resource_type: 'raw' or auto. Multer storage cloudinary uses file.filename as publicId
      await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary file deleted: ${publicId}`);
    } catch (err) {
      console.error(`Error deleting Cloudinary file ${publicId}:`, err);
    }
  } else {
    // Local deletion
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

// Define valid document fields
const VALID_DOCUMENTS = [
  'birthCertificate',
  'studentAadhaar',
  'fatherAadhaar',
  'motherAadhaar',
  'rationCard',
  'addressProof',
  'incomeCertificate',
  'casteCertificate',
  'passportPhoto',
];

// @desc    Get all students (paginated, filtered, searched)
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const query = {};

    if (req.query.class) {
      query.class = req.query.class;
    }

    if (req.query.division) {
      query.division = req.query.division;
    }

    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    // Search by Name or GR Number
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { grNumber: searchRegex },
        { fatherName: searchRegex },
      ];
    }

    // Filter by document status (missing documents)
    if (req.query.missingDocument) {
      const docType = req.query.missingDocument;
      if (VALID_DOCUMENTS.includes(docType)) {
        query[`documents.${docType}`] = { $exists: false };
      } else if (docType === 'any') {
        // Find students who are missing ANY of the 9 documents
        query.$or = VALID_DOCUMENTS.map((doc) => ({
          [`documents.${doc}`]: { $exists: false },
        }));
      }
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: students.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Server error fetching students' });
  }
};

// @desc    Get single student details
// @route   GET /api/students/:id
// @access  Private
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.birthCertificate.uploadedBy', 'name')
      .populate('documents.studentAadhaar.uploadedBy', 'name')
      .populate('documents.fatherAadhaar.uploadedBy', 'name')
      .populate('documents.motherAadhaar.uploadedBy', 'name')
      .populate('documents.rationCard.uploadedBy', 'name')
      .populate('documents.addressProof.uploadedBy', 'name')
      .populate('documents.incomeCertificate.uploadedBy', 'name')
      .populate('documents.casteCertificate.uploadedBy', 'name')
      .populate('documents.passportPhoto.uploadedBy', 'name');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const { grNumber } = req.body;

    // Check if GR number is already in use
    const existingStudent = await Student.findOne({ grNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: `A student with GR Number '${grNumber}' already exists.`,
      });
    }

    // Attach auditing info
    req.body.createdBy = req.user._id;
    req.body.updatedBy = req.user._id;

    const student = await Student.create(req.body);

    // Audit Log entry
    await AuditLog.create({
      action: 'CREATE_STUDENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Registered student ${student.name} with GR No: ${student.grNumber}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error creating student' });
  }
};

// @desc    Update student fields
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check GR number conflict
    if (req.body.grNumber && req.body.grNumber !== student.grNumber) {
      const grConflict = await Student.findOne({ grNumber: req.body.grNumber });
      if (grConflict) {
        return res.status(400).json({
          success: false,
          message: `GR Number '${req.body.grNumber}' is already allocated to another student`,
        });
      }
    }

    // Identify changed fields for Audit Log
    const changes = [];
    Object.keys(req.body).forEach((key) => {
      // Ignore timestamp/audit fields
      if (['updatedBy', 'createdBy', 'documents', '_id', 'createdAt', 'updatedAt'].includes(key)) return;
      
      let oldVal = student[key];
      let newVal = req.body[key];

      if (key === 'dob' && oldVal && newVal) {
        oldVal = new Date(oldVal).toISOString().slice(0, 10);
        newVal = new Date(newVal).toISOString().slice(0, 10);
      }

      if (String(oldVal) !== String(newVal)) {
        changes.push(`${key}: "${oldVal || ''}" -> "${newVal || ''}"`);
      }
    });

    req.body.updatedBy = req.user._id;

    // Update
    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (changes.length > 0) {
      await AuditLog.create({
        action: 'UPDATE_STUDENT',
        performedBy: req.user._id,
        studentId: student._id,
        studentName: student.name,
        details: `Updated fields for student ${student.name}: ${changes.join(', ')}`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error updating student' });
  }
};

// @desc    Delete student & their documents
// @route   DELETE /api/students/:id
// @access  Private (Admin Only)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Delete all files from storage
    const deletePromises = [];
    VALID_DOCUMENTS.forEach((docType) => {
      if (student.documents && student.documents[docType] && student.documents[docType].publicId) {
        deletePromises.push(deletePhysicalFile(student.documents[docType].publicId));
      }
    });

    await Promise.all(deletePromises);

    // Delete record
    await Student.findByIdAndDelete(req.params.id);

    // Log deletion
    await AuditLog.create({
      action: 'DELETE_STUDENT',
      performedBy: req.user._id,
      studentName: student.name,
      details: `Deleted student ${student.name} (GR No: ${student.grNumber}) and all associated files`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Student and all associated files deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Server error deleting student' });
  }
};

// @desc    Upload document file for a student
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
        const fileIdToDelete = req.file.filename;
        await deletePhysicalFile(fileIdToDelete);
      }
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if document already exists, if so delete the old one
    if (student.documents && student.documents[documentType] && student.documents[documentType].publicId) {
      await deletePhysicalFile(student.documents[documentType].publicId);
    }

    // Update student document details
    student.documents = student.documents || {};
    student.documents[documentType] = {
      url: fileUrl,
      publicId: filePublicId,
      fileName: originalName,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };
    student.updatedBy = req.user._id;

    await student.save();

    // Log upload action
    await AuditLog.create({
      action: 'UPLOAD_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Uploaded ${documentType} for student ${student.name} (${originalName})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Server error uploading document' });
  }
};

// @desc    Delete single document of a student
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

    if (!student.documents || !student.documents[documentType] || !student.documents[documentType].publicId) {
      return res.status(400).json({ success: false, message: 'Document does not exist' });
    }

    const fileName = student.documents[documentType].fileName;

    // Delete file physically
    await deletePhysicalFile(student.documents[documentType].publicId);

    // Remove document object path
    student.documents[documentType] = undefined;
    student.updatedBy = req.user._id;

    await student.save();

    // Log deletion
    await AuditLog.create({
      action: 'DELETE_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Deleted ${documentType} (${fileName}) for student ${student.name}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Server error deleting document' });
  }
};

// @desc    Export students to CSV
// @route   GET /api/students/export/csv
// @access  Private
exports.exportCSV = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ class: 1, name: 1 });

    const csvHeaders = [
      'Name',
      'GR Number',
      'Class',
      'Division',
      'DOB',
      'Gender',
      'Father Name',
      'Mother Name',
      'Mobile',
      'Address',
      'Village',
      'Taluka',
      'District',
      'Documents Uploaded Count',
    ].join(',');

    const csvRows = students.map((s) => {
      let uploadCount = 0;
      if (s.documents) {
        VALID_DOCUMENTS.forEach((doc) => {
          if (s.documents[doc] && s.documents[doc].url) uploadCount++;
        });
      }

      const dobStr = s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '';

      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.grNumber.replace(/"/g, '""')}"`,
        `"${s.class.replace(/"/g, '""')}"`,
        `"${s.division.replace(/"/g, '""')}"`,
        `"${dobStr}"`,
        `"${s.gender}"`,
        `"${s.fatherName.replace(/"/g, '""')}"`,
        `"${s.motherName.replace(/"/g, '""')}"`,
        `"${s.mobile.replace(/"/g, '""')}"`,
        `"${s.address.replace(/"/g, '""')}"`,
        `"${(s.village || '').replace(/"/g, '""')}"`,
        `"${(s.taluka || '').replace(/"/g, '""')}"`,
        `"${(s.district || '').replace(/"/g, '""')}"`,
        uploadCount,
      ].join(',');
    });

    const csvData = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Disposition', 'attachment; filename="students_report.csv"');
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
    const students = await Student.find({}).sort({ class: 1, name: 1 });

    const data = students.map((s) => {
      let uploadCount = 0;
      const docStatuses = {};
      VALID_DOCUMENTS.forEach((doc) => {
        const uploaded = !!(s.documents && s.documents[doc] && s.documents[doc].url);
        if (uploaded) uploadCount++;
        docStatuses[doc] = uploaded ? 'Uploaded' : 'Pending';
      });

      return {
        'Student Name': s.name,
        'GR Number': s.grNumber,
        Class: s.class,
        Division: s.division,
        DOB: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
        Gender: s.gender,
        'Father Name': s.fatherName,
        'Mother Name': s.motherName,
        Mobile: s.mobile,
        Address: s.address,
        Village: s.village || '',
        Taluka: s.taluka || '',
        District: s.district || '',
        'Birth Certificate': docStatuses.birthCertificate,
        'Student Aadhaar': docStatuses.studentAadhaar,
        'Father Aadhaar': docStatuses.fatherAadhaar,
        'Mother Aadhaar': docStatuses.motherAadhaar,
        'Ration Card': docStatuses.rationCard,
        'Address Proof': docStatuses.addressProof,
        'Income Certificate': docStatuses.incomeCertificate,
        'Caste Certificate': docStatuses.casteCertificate,
        'Passport Photo': docStatuses.passportPhoto,
        'Total Uploaded Docs': uploadCount,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="students_document_report.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
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
    const students = await Student.find({}).sort({ class: 1, name: 1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Disposition', 'attachment; filename="students_report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Title Section
    doc.fontSize(20).text('DocElex - Student Document Report', { align: 'center' });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table Header
    const tableTop = 100;
    const itemX = 30;
    const grX = 180;
    const classX = 250;
    const divX = 300;
    const phoneX = 350;
    const docsX = 450;
    const missingX = 520;

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Student Name', itemX, tableTop);
    doc.text('GR No.', grX, tableTop);
    doc.text('Class', classX, tableTop);
    doc.text('Div', divX, tableTop);
    doc.text('Mobile', phoneX, tableTop);
    doc.text('Docs Count', docsX, tableTop);
    doc.text('Missing Documents', missingX, tableTop);

    // Draw header line
    doc.moveTo(30, tableTop + 15).lineTo(800, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    students.forEach((student, index) => {
      // Page budget check
      if (y > 520) {
        doc.addPage({ layout: 'landscape' });
        y = 50; // top of new page
        
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Student Name', itemX, y);
        doc.text('GR No.', grX, y);
        doc.text('Class', classX, y);
        doc.text('Div', divX, y);
        doc.text('Mobile', phoneX, y);
        doc.text('Docs Count', docsX, y);
        doc.text('Missing Documents', missingX, y);
        doc.moveTo(30, y + 15).lineTo(800, y + 15).stroke();
        y += 25;
        doc.font('Helvetica').fontSize(9);
      }

      let uploadCount = 0;
      const missingList = [];
      VALID_DOCUMENTS.forEach((docName) => {
        if (student.documents && student.documents[docName] && student.documents[docName].url) {
          uploadCount++;
        } else {
          // Add formatted short name to missing list
          missingList.push(docName.replace('birthCertificate', 'Birth Cert').replace('Aadhaar', ' Adh').replace('rationCard', 'Ration').replace('addressProof', 'Addr Proof').replace('incomeCertificate', 'Income').replace('casteCertificate', 'Caste').replace('passportPhoto', 'Photo'));
        }
      });

      const missingText = missingList.length === 0 ? 'None (Complete)' : missingList.slice(0, 3).join(', ') + (missingList.length > 3 ? '...' : '');

      // Limit student name length to avoid overlapping
      const truncatedName = student.name.length > 25 ? student.name.substring(0, 22) + '...' : student.name;

      doc.text(truncatedName, itemX, y);
      doc.text(student.grNumber, grX, y);
      doc.text(student.class, classX, y);
      doc.text(student.division, divX, y);
      doc.text(student.mobile, phoneX, y);
      doc.text(`${uploadCount} / 9`, docsX, y);
      doc.text(missingText, missingX, y);

      // Separator line
      doc.moveTo(30, y + 12).lineTo(800, y + 12).strokeColor('#e4e4e4').lineWidth(0.5).stroke();

      y += 20;
    });

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    // Don't crash connection, send error message if not started piping
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to export PDF' });
    }
  }
};
