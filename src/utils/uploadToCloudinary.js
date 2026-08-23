const cloudinary = require('../config/cloudinary');
const config = require('../config/config');
const ApiError = require('./ApiError');
const httpStatus = require('http-status');

const DEFAULT_IMAGE_URL =
  'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,g_face/sample.jpg';

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

/**
 * Upload a multer memory file buffer to Cloudinary and return the public https link.
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
        overwrite: true,
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

/** Public Cloudinary URL string from an uploaded file. */
const imageFromUpload = (file) => {
  if (!file) return null;
  if (!file.cloudinaryUrl) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Image was not uploaded to Cloudinary. Check CLOUDINARY_* env vars.'
    );
  }
  return file.cloudinaryUrl;
};

/** Always a https URL string. Accepts old { url, path } docs. */
const toImageUrl = (image, fallback = DEFAULT_IMAGE_URL) => {
  if (!image) return fallback;
  if (typeof image === 'string') {
    return isHttpUrl(image) ? image : fallback;
  }
  const url = image.url || '';
  return isHttpUrl(url) ? url : fallback;
};

/** Walk API payloads so every `image` field is a Cloudinary URL string. */
const normalizeImagesDeep = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(normalizeImagesDeep);
    return value;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'image')) {
    value.image = toImageUrl(value.image, value.image ? DEFAULT_IMAGE_URL : '');
  }
  Object.keys(value).forEach((key) => {
    if (key !== 'image' && value[key] && typeof value[key] === 'object') {
      normalizeImagesDeep(value[key]);
    }
  });
  return value;
};

/**
 * Save the new Cloudinary link on req.body.image (string).
 * Next update replaces the previous URL.
 */
const applyUploadedImage = (req) => {
  const image = imageFromUpload(req.file);
  if (image) {
    req.body.image = image;
    return image;
  }
  const incoming = req.body?.image;
  const incomingUrl = typeof incoming === 'object' ? incoming?.url : incoming;
  if (incoming !== undefined && !isHttpUrl(incomingUrl)) {
    delete req.body.image;
  } else if (isHttpUrl(incomingUrl) && typeof incoming === 'object') {
    req.body.image = incomingUrl;
    return incomingUrl;
  }
  return isHttpUrl(incomingUrl) ? incomingUrl : null;
};

module.exports = {
  DEFAULT_IMAGE_URL,
  isHttpUrl,
  uploadBufferToCloudinary,
  imageFromUpload,
  toImageUrl,
  normalizeImagesDeep,
  applyUploadedImage,
};
