const cloudinary = require('../config/cloudinary');
const config = require('../config/config');
const ApiError = require('./ApiError');
const httpStatus = require('http-status');

/**
 * Upload a multer memory file buffer to Cloudinary.
 * @param {Express.Multer.File} file
 * @param {string} folder
 * @returns {Promise<{ url: string, path: string, public_id: string }>}
 */
const uploadBufferToCloudinary = (file, folder = 'brivio') => {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }

  if (!file?.buffer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No file buffer to upload');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: false,
      },
      (err, result) => {
        if (err) {
          return reject(
            new ApiError(httpStatus.BAD_REQUEST, err.message || 'Cloudinary upload failed')
          );
        }
        resolve({
          url: result.secure_url,
          path: result.public_id,
          public_id: result.public_id,
        });
      }
    );
    stream.end(file.buffer);
  });
};

/** Build image object for Mongo from uploaded file (after cloudinary middleware). */
const imageFromUpload = (file) => {
  if (!file) return null;
  if (file.cloudinaryUrl) {
    return {
      url: file.cloudinaryUrl,
      path: file.public_id || '',
    };
  }
  // Legacy local fallback (should not happen once Cloudinary is configured)
  if (file.filename) {
    return {
      url: `/uploads/users/${file.filename}`,
      path: file.path || '',
    };
  }
  return null;
};

module.exports = {
  uploadBufferToCloudinary,
  imageFromUpload,
};
