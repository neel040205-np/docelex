const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const Document = require('../models/Document');
const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const axios = require('axios');

// Define valid document fields (11 required documents)
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

// Helper to attach documents object to a student object
const attachDocumentsToStudent = async (student) => {
  if (!student) return null;
  const docs = await Document.find({ studentId: student._id }).populate('verifiedBy', 'name');
  const documentsObj = {};
  
  docs.forEach((doc) => {
    documentsObj[doc.documentType] = {
      _id: doc._id,
      url: doc.fileUrl,
      publicId: doc.publicId,
      fileName: doc.fileName,
      status: doc.status,
      remarks: doc.remarks || '',
      uploadDate: doc.uploadDate,
      verifiedBy: doc.verifiedBy,
    };
  });
  
  const studentObj = student.toObject ? student.toObject() : student;
  studentObj.documents = documentsObj;
  return studentObj;
};

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

// Helper to convert Google Drive shareable link to a direct download link
const getGoogleDriveDownloadUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=download&id=${match[1]}&confirm=t`;
  }
  return url;
};

// Helper to get a unique, valid file name for zipping (handles undefined / missing fileNames in database)
const getDocumentFileName = (doc) => {
  if (doc.fileName && doc.fileName !== 'undefined') {
    return doc.fileName;
  }
  const ext = path.extname(doc.url.split('?')[0]) || '.png';
  const formattedType = doc.documentType.replace(/([A-Z])/g, '_$1').toLowerCase();
  return `${formattedType}${ext}`;
};

// @desc    Get the next serial number (srNumber) based on student count & max SR number
// @route   GET /api/students/next-sr
// @access  Private
exports.getNextSrNumber = async (req, res) => {
  try {
    const students = await Student.find({}, { srNumber: 1 });
    let maxSr = 0;
    students.forEach((s) => {
      if (s.srNumber) {
        const match = s.srNumber.match(/\d+/);
        if (match) {
          const val = parseInt(match[0], 10);
          if (val > maxSr) {
            maxSr = val;
          }
        }
      }
    });
    const count = students.length;
    const nextSr = Math.max(count + 1, maxSr + 1);
    res.status(200).json({
      success: true,
      nextSrNumber: String(nextSr),
    });
  } catch (error) {
    console.error('Error getting next SR number:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Download all documents for all students in a ZIP
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
      const studentWithDocs = await attachDocumentsToStudent(student);
      const folderName = studentWithDocs.name.replace(/[^\w\s]/gi, '');

      for (const [key, doc] of Object.entries(studentWithDocs.documents || {})) {
        if (!doc?.url) continue;

        try {
          const fileName = getDocumentFileName(doc);
          if (!isCloudinaryConfigured() && doc.publicId && !doc.publicId.startsWith('drive-')) {
            // Local file - read directly from disk to avoid network resolution issues
            const filePath = path.join(__dirname, '../../uploads', doc.publicId);
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: `${folderName}/${fileName}` });
            } else {
              console.error(`Local file not found for ${studentWithDocs.name}: ${filePath}`);
            }
          } else {
            // Cloudinary or Google Drive remote URL
            let downloadUrl = doc.url;
            if (doc.publicId && doc.publicId.startsWith('drive-')) {
              downloadUrl = getGoogleDriveDownloadUrl(doc.url);
            }

            const response = await axios({
              method: 'get',
              url: downloadUrl,
              responseType: 'stream',
              timeout: 10000,
            });

            archive.append(response.data, {
              name: `${folderName}/${fileName}`,
            });
          }
        } catch (err) {
          console.error(`Error archiving doc for ${studentWithDocs.name}:`, err.message);
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error zipping all documents:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error downloading documents' });
    }
  }
};

// @desc    Download all documents for a single student in a ZIP
// @route   GET /api/students/:id/download-documents
// @access  Private
exports.downloadStudentDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentWithDocs = await attachDocumentsToStudent(student);
    
    // Fallback to name if firstName is not present (e.g. for legacy records)
    let rawName = 'student';
    if (studentWithDocs.firstName) {
      rawName = studentWithDocs.firstName;
    } else if (studentWithDocs.name) {
      // For legacy records, take the first word of the full name
      rawName = studentWithDocs.name.trim().split(/\s+/)[0];
    }
    
    const safeName = rawName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase() || 'student';
    const zipFileName = `${safeName}-docs.zip`;
    res.attachment(zipFileName);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    let fileCount = 0;
    for (const [key, doc] of Object.entries(studentWithDocs.documents || {})) {
      if (!doc?.url) continue;

      try {
        const fileName = getDocumentFileName(doc);
        const archivePath = `${safeName}-docs/${fileName}`;
        
        if (!isCloudinaryConfigured() && doc.publicId && !doc.publicId.startsWith('drive-')) {
          // Local file - read directly from disk
          const filePath = path.join(__dirname, '../../uploads', doc.publicId);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: archivePath });
            fileCount++;
          } else {
            console.error(`Local file not found: ${filePath}`);
          }
        } else {
          // Cloudinary or Google Drive remote URL
          let downloadUrl = doc.url;
          if (doc.publicId && doc.publicId.startsWith('drive-')) {
            downloadUrl = getGoogleDriveDownloadUrl(doc.url);
          }

          const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 10000,
          });

          archive.append(response.data, {
            name: archivePath,
          });
          fileCount++;
        }
      } catch (err) {
        console.error(`Error zipping document for student ${studentWithDocs.name}:`, err.message);
      }
    }

    if (fileCount === 0) {
      const { Readable } = require('stream');
      const s = new Readable();
      s.push('No documents uploaded for this student yet.');
      s.push(null);
      archive.append(s, { name: `${safeName}-docs/readme.txt` });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error zipping student documents:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error downloading documents' });
    }
  }
};

// @desc    Check if a GR or SR number already exists
// @route   GET /api/students/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
  try {
    const { field, value, excludeId } = req.query;
    if (!['grNumber', 'srNumber'].includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid duplicate check field' });
    }

    const query = { [field]: value };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const count = await Student.countDocuments(query);
    res.status(200).json({
      success: true,
      exists: count > 0,
    });
  } catch (error) {
    console.error('Error checking duplicate:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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

    if (req.query.casteCategory) {
      query.casteCategory = req.query.casteCategory;
    }

    if (req.query.verificationStatus) {
      query.verificationStatus = req.query.verificationStatus;
    }

    if (req.query.admissionYear) {
      const year = parseInt(req.query.admissionYear, 10);
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      query.admissionDate = { $gte: start, $lte: end };
    }

    // Search by name, GR, SR, Aadhaar, Mobile
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { grNumber: searchRegex },
        { srNumber: searchRegex },
        { aadhaarNumber: searchRegex },
        { mobileNumber1: searchRegex },
        { mobileNumber2: searchRegex },
      ];
    }

    // Filter by missing documents
    if (req.query.missingDocument) {
      const docType = req.query.missingDocument;
      if (VALID_DOCUMENTS.includes(docType)) {
        const hasDocStudentIds = await Document.find({ documentType: docType }).distinct('studentId');
        query._id = { $nin: hasDocStudentIds };
      } else if (docType === 'any') {
        const docCounts = await Document.aggregate([
          { $group: { _id: '$studentId', count: { $sum: 1 } } },
          { $match: { count: VALID_DOCUMENTS.length } },
        ]);
        const fullyUploadedStudentIds = docCounts.map((d) => d._id);
        query._id = { $nin: fullyUploadedStudentIds };
      }
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Attach document completeness count for the list view
    const studentsWithDocs = [];
    for (const student of students) {
      const sWithDocs = await attachDocumentsToStudent(student);
      studentsWithDocs.push(sWithDocs);
    }

    res.status(200).json({
      success: true,
      count: studentsWithDocs.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: studentsWithDocs,
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
      .populate('updatedBy', 'name email');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentWithDocs = await attachDocumentsToStudent(student);

    res.status(200).json({
      success: true,
      data: studentWithDocs,
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
    const { grNumber, srNumber, aadhaarNumber, mobileNumber1 } = req.body;

    // Aadhaar Validations
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ success: false, message: 'Aadhaar Number must be exactly 12 digits.' });
    }
    // Mobile Validation
    if (!/^\d{10}$/.test(mobileNumber1)) {
      return res.status(400).json({ success: false, message: 'Mobile Number 1 must be exactly 10 digits.' });
    }

    // Check duplicate GR
    const existingGr = await Student.findOne({ grNumber });
    if (existingGr) {
      return res.status(400).json({
        success: false,
        message: `A student with GR Number '${grNumber}' already exists.`,
      });
    }

    // Check duplicate SR
    const existingSr = await Student.findOne({ srNumber });
    if (existingSr) {
      return res.status(400).json({
        success: false,
        message: `A student with SR Number '${srNumber}' already exists.`,
      });
    }

    // Attach auditing info
    req.body.createdBy = req.user._id;
    req.body.updatedBy = req.user._id;
    req.body.verificationStatus = 'Pending';

    const student = await Student.create(req.body);

    // Audit Log entry
    await AuditLog.create({
      action: 'CREATE_STUDENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Registered student ${student.name} with GR No: ${student.grNumber}, SR No: ${student.srNumber}`,
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
    const { grNumber, srNumber, aadhaarNumber, mobileNumber1 } = req.body;
    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Aadhaar Validations
    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ success: false, message: 'Aadhaar Number must be exactly 12 digits.' });
    }
    // Mobile Validation
    if (mobileNumber1 && !/^\d{10}$/.test(mobileNumber1)) {
      return res.status(400).json({ success: false, message: 'Mobile Number 1 must be exactly 10 digits.' });
    }

    // Check GR number conflict
    if (grNumber && grNumber !== student.grNumber) {
      const grConflict = await Student.findOne({ grNumber });
      if (grConflict) {
        return res.status(400).json({
          success: false,
          message: `GR Number '${grNumber}' is already allocated to another student`,
        });
      }
    }

    // Check SR number conflict
    if (srNumber && srNumber !== student.srNumber) {
      const srConflict = await Student.findOne({ srNumber });
      if (srConflict) {
        return res.status(400).json({
          success: false,
          message: `SR Number '${srNumber}' is already allocated to another student`,
        });
      }
    }

    // Identify changed fields for Audit Log
    const changes = [];
    Object.keys(req.body).forEach((key) => {
      if (['updatedBy', 'createdBy', '_id', 'createdAt', 'updatedAt', 'name'].includes(key)) return;

      let oldVal = student[key];
      let newVal = req.body[key];

      if ((key === 'dob' || key === 'admissionDate' || key === 'dobAsPerAadhaar') && oldVal && newVal) {
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

    // Delete all files from storage and database
    const docs = await Document.find({ studentId: student._id });
    const deletePromises = [];
    docs.forEach((doc) => {
      if (doc.publicId) {
        deletePromises.push(deletePhysicalFile(doc.publicId));
      }
    });

    await Promise.all(deletePromises);
    await Document.deleteMany({ studentId: student._id });

    // Delete student record
    await Student.findByIdAndDelete(req.params.id);

    // Log deletion
    await AuditLog.create({
      action: 'DELETE_STUDENT',
      performedBy: req.user._id,
      studentName: student.name,
      details: `Deleted student ${student.name} (GR No: ${student.grNumber}, SR No: ${student.srNumber}) and all documents`,
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
        await deletePhysicalFile(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if document already exists, if so delete physical file
    const existingDoc = await Document.findOne({ studentId: id, documentType });
    if (existingDoc && existingDoc.publicId) {
      await deletePhysicalFile(existingDoc.publicId);
    }

    // Save/Update Document
    await Document.findOneAndUpdate(
      { studentId: id, documentType },
      {
        fileUrl,
        publicId: filePublicId,
        fileName: originalName,
        uploadDate: new Date(),
        status: 'Pending',
        remarks: '',
      },
      { upsert: true, new: true }
    );

    // Update overall Student status back to pending since a new file was uploaded
    await Student.findByIdAndUpdate(id, { verificationStatus: 'Pending' });

    // Log upload action
    await AuditLog.create({
      action: 'UPLOAD_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Uploaded ${documentType} for student ${student.name} (${originalName})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    const updatedStudent = await Student.findById(id);
    const result = await attachDocumentsToStudent(updatedStudent);

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: result,
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

    const doc = await Document.findOne({ studentId: id, documentType });
    if (!doc) {
      return res.status(400).json({ success: false, message: 'Document does not exist' });
    }

    // Delete file physically
    if (doc.publicId) {
      await deletePhysicalFile(doc.publicId);
    }

    // Remove document record
    await Document.deleteOne({ studentId: id, documentType });

    // Recalculate Student Status
    const remainingDocs = await Document.find({ studentId: id });
    const hasRejected = remainingDocs.some((d) => d.status === 'Rejected');
    const hasPending = remainingDocs.length < VALID_DOCUMENTS.length || remainingDocs.some((d) => d.status === 'Pending');

    let overallStatus = 'Pending';
    if (hasRejected) overallStatus = 'Rejected';
    else if (!hasPending && remainingDocs.length === VALID_DOCUMENTS.length) overallStatus = 'Verified';

    student.verificationStatus = overallStatus;
    student.updatedBy = req.user._id;
    await student.save();

    // Log deletion
    await AuditLog.create({
      action: 'DELETE_DOCUMENT',
      performedBy: req.user._id,
      studentId: student._id,
      studentName: student.name,
      details: `Deleted ${documentType} (${doc.fileName}) for student ${student.name}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    const result = await attachDocumentsToStudent(student);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Server error deleting document' });
  }
};

// @desc    Verify a single document of a student
// @route   PUT /api/students/:id/document/:documentType/verify
// @access  Private
exports.verifyDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const { status, remarks } = req.body;

    if (!['Verified', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    const doc = await Document.findOne({ studentId: id, documentType });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or not uploaded yet.' });
    }

    doc.status = status;
    doc.remarks = remarks || '';
    doc.verifiedBy = req.user._id;
    await doc.save();

    // Recalculate Student Status
    const allDocs = await Document.find({ studentId: id });
    const hasRejected = allDocs.some((d) => d.status === 'Rejected');
    const verifiedCount = allDocs.filter((d) => d.status === 'Verified').length;
    const isAllVerified = verifiedCount === VALID_DOCUMENTS.length; // all 11 verified

    let overallStatus = 'Pending';
    if (hasRejected) {
      overallStatus = 'Rejected';
    } else if (isAllVerified) {
      overallStatus = 'Verified';
    }

    await Student.findByIdAndUpdate(id, { verificationStatus: overallStatus });

    // Log Verification Action
    await AuditLog.create({
      action: 'UPDATE_STUDENT',
      performedBy: req.user._id,
      studentId: id,
      details: `Document ${documentType} marked as ${status}. Remarks: "${remarks || ''}"`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Document verification updated successfully',
      data: doc,
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, message: 'Server error verifying document' });
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
      'SR Number',
      'Class',
      'Division',
      'DOB',
      'Gender',
      'Caste Category',
      'Aadhaar Number',
      'Mobile Number 1',
      'IFSC Code',
      'Bank Account Number',
      'Verification Status',
      'Documents Uploaded Count',
    ].join(',');

    const csvRows = [];
    for (const s of students) {
      const studentWithDocs = await attachDocumentsToStudent(s);
      let uploadCount = 0;
      VALID_DOCUMENTS.forEach((doc) => {
        if (studentWithDocs.documents[doc]?.url) uploadCount++;
      });

      const dobStr = s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '';

      csvRows.push(
        [
          `"${s.name.replace(/"/g, '""')}"`,
          `"${s.grNumber.replace(/"/g, '""')}"`,
          `"${s.srNumber ? s.srNumber.replace(/"/g, '""') : ''}"`,
          `"${s.class.replace(/"/g, '""')}"`,
          `"${s.division.replace(/"/g, '""')}"`,
          `"${dobStr}"`,
          `"${s.gender}"`,
          `"${s.casteCategory || ''}"`,
          `"${s.aadhaarNumber || ''}"`,
          `"${s.mobileNumber1 || ''}"`,
          `"${s.ifscCode || ''}"`,
          `"${s.bankAccountNumber || ''}"`,
          `"${s.verificationStatus || 'Pending'}"`,
          uploadCount,
        ].join(',')
      );
    }

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

    const data = [];
    for (const s of students) {
      const studentWithDocs = await attachDocumentsToStudent(s);
      let uploadCount = 0;
      const docStatuses = {};

      VALID_DOCUMENTS.forEach((doc) => {
        const docRecord = studentWithDocs.documents[doc];
        const uploaded = !!docRecord?.url;
        if (uploaded) uploadCount++;
        docStatuses[doc] = uploaded ? `${docRecord.status || 'Uploaded'}` : 'Pending';
      });

      data.push({
        'Student Name': s.name,
        'GR Number': s.grNumber,
        'SR Number': s.srNumber || '',
        Class: s.class,
        Division: s.division,
        DOB: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '',
        Gender: s.gender,
        Caste: s.caste || '',
        Category: s.casteCategory || '',
        'Aadhaar Number': s.aadhaarNumber || '',
        'Mobile Number 1': s.mobileNumber1 || '',
        'Mobile Number 2': s.mobileNumber2 || '',
        'IFSC Code': s.ifscCode || '',
        'Bank Account Number': s.bankAccountNumber || '',
        'Account Holder Name': s.accountHolderName || '',
        'Verification Status': s.verificationStatus || 'Pending',
        'Total Uploaded Docs': uploadCount,
        ...docStatuses,
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="students_document_report.xlsx"');
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

    doc.fontSize(20).text('DocElex - Student Document Report', { align: 'center' });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    const tableTop = 100;
    const itemX = 30;
    const grX = 180;
    const srX = 240;
    const classX = 300;
    const divX = 350;
    const phoneX = 400;
    const statusX = 480;
    const docsX = 560;

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Student Name', itemX, tableTop);
    doc.text('GR No.', grX, tableTop);
    doc.text('SR No.', srX, tableTop);
    doc.text('Class', classX, tableTop);
    doc.text('Div', divX, tableTop);
    doc.text('Mobile', phoneX, tableTop);
    doc.text('Verification', statusX, tableTop);
    doc.text('Docs Count', docsX, tableTop);

    doc.moveTo(30, tableTop + 15).lineTo(800, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    for (const student of students) {
      const studentWithDocs = await attachDocumentsToStudent(student);

      if (y > 520) {
        doc.addPage({ layout: 'landscape' });
        y = 50;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Student Name', itemX, y);
        doc.text('GR No.', grX, y);
        doc.text('SR No.', srX, y);
        doc.text('Class', classX, y);
        doc.text('Div', divX, y);
        doc.text('Mobile', phoneX, y);
        doc.text('Verification', statusX, y);
        doc.text('Docs Count', docsX, y);
        doc.moveTo(30, y + 15).lineTo(800, y + 15).stroke();
        y += 25;
        doc.font('Helvetica').fontSize(9);
      }

      let uploadCount = 0;
      VALID_DOCUMENTS.forEach((docName) => {
        if (studentWithDocs.documents[docName]?.url) {
          uploadCount++;
        }
      });

      const truncatedName = student.name.length > 22 ? student.name.substring(0, 19) + '...' : student.name;

      doc.text(truncatedName, itemX, y);
      doc.text(student.grNumber, grX, y);
      doc.text(student.srNumber || '-', srX, y);
      doc.text(student.class, classX, y);
      doc.text(student.division, divX, y);
      doc.text(student.mobileNumber1, phoneX, y);
      doc.text(student.verificationStatus || 'Pending', statusX, y);
      doc.text(`${uploadCount} / ${VALID_DOCUMENTS.length}`, docsX, y);

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
