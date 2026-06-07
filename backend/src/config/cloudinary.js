const cloudinary = require('cloudinary').v2;

const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary Configured successfully.');
} else {
  console.warn(
    'Cloudinary credentials are not set. The application will fall back to local file storage under /uploads.'
  );
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
