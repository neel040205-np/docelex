const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

let storage;

if (isCloudinaryConfigured()) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'docelex_documents',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto', // Allows both image types and PDF format
    },
  });
  console.log('Multer configured to upload directly to Cloudinary.');
} else {
  // Local storage fallback configuration
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
  console.log('Multer configured to upload locally to /uploads.');
}

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files (jpg, jpeg, png) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
