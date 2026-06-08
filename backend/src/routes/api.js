const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const statsController = require('../controllers/statsController');
const auditLogController = require('../controllers/auditLogController');

// Middlewares
const { protect } = require('../middleware/auth');
const { attachDynamicModels } = require('../middleware/dynamicModels');
const upload = require('../middleware/upload');

// Combined middleware chain for protected, user-scoped routes
const protectAndScope = [protect, attachDynamicModels];

// In-memory upload storage configuration specifically for excel/csv spreadsheet imports
const path = require('path');
const multer = require('multer');
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.'));
    }
  }
});

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// ==========================================
// EXPORT ROUTES
// ==========================================
// (Must be defined BEFORE student ID routes to avoid clash)
router.get('/students/export/csv', protectAndScope, studentController.exportCSV);
router.get('/students/export/excel', protectAndScope, studentController.exportExcel);
router.get('/students/export/pdf', protectAndScope, studentController.exportPDF);

// ==========================================
// STUDENT CRUD ROUTES
// ==========================================
router.get('/students/check-duplicate', protectAndScope, studentController.checkDuplicate);
router.get('/students/next-sr', protectAndScope, studentController.getNextSrNumber);
router.post('/students/import', protectAndScope, importUpload.single('file'), studentController.importStudents);


router.route('/students')
  .get(protectAndScope, studentController.getStudents)
  .post(protectAndScope, studentController.createStudent);

router.route('/students/:id')
  .get(protectAndScope, studentController.getStudentById)
  .put(protectAndScope, studentController.updateStudent)
  .delete(protectAndScope, studentController.deleteStudent);

router.get('/students/:id/download-documents', protectAndScope, studentController.downloadStudentDocuments);

// ==========================================
// DOCUMENT ROUTES
// ==========================================
router.route('/students/:id/document/:documentType')
  .post(protectAndScope, upload.single('file'), studentController.uploadDocument)
  .delete(protectAndScope, studentController.deleteDocument);

router.put('/students/:id/document/:documentType/verify', protectAndScope, studentController.verifyDocument);

// ==========================================
// ANALYTICS & STATS ROUTES
// ==========================================
router.get('/stats', protectAndScope, statsController.getStats);

// ==========================================
// AUDIT LOGS ROUTES
// ==========================================
router.get('/audit-logs', protectAndScope, auditLogController.getAuditLogs);
// ==========================================
//DOWNLOAD ALL FILES AT A TIME
// ==========================================
router.get(
  '/students/download/all',
  protectAndScope,
  studentController.downloadAllDocuments
);
module.exports = router;
