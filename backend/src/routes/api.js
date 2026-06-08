const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const statsController = require('../controllers/statsController');
const auditLogController = require('../controllers/auditLogController');

// Middlewares
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

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
router.get('/students/export/csv', protect, studentController.exportCSV);
router.get('/students/export/excel', protect, studentController.exportExcel);
router.get('/students/export/pdf', protect, studentController.exportPDF);

// ==========================================
// STUDENT CRUD ROUTES
// ==========================================
router.get('/students/check-duplicate', protect, studentController.checkDuplicate);
router.get('/students/next-sr', protect, studentController.getNextSrNumber);
router.post('/students/import', protect, importUpload.single('file'), studentController.importStudents);


router.route('/students')
  .get(protect, studentController.getStudents)
  .post(protect, studentController.createStudent);

router.route('/students/:id')
  .get(protect, studentController.getStudentById)
  .put(protect, studentController.updateStudent)
  .delete(protect, studentController.deleteStudent);

router.get('/students/:id/download-documents', protect, studentController.downloadStudentDocuments);

// ==========================================
// DOCUMENT ROUTES
// ==========================================
router.route('/students/:id/document/:documentType')
  .post(protect, upload.single('file'), studentController.uploadDocument)
  .delete(protect, studentController.deleteDocument);

router.put('/students/:id/document/:documentType/verify', protect, studentController.verifyDocument);

// ==========================================
// ANALYTICS & STATS ROUTES
// ==========================================
router.get('/stats', protect, statsController.getStats);

// ==========================================
// AUDIT LOGS ROUTES
// ==========================================
router.get('/audit-logs', protect, auditLogController.getAuditLogs);
// ==========================================
//DOWNLOAD ALL FILES AT A TIME
// ==========================================
router.get(
  '/students/download/all',
  protect,
  studentController.downloadAllDocuments
);
module.exports = router;
