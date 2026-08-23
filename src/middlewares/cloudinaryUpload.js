const { uploadBufferToCloudinary } = require('../utils/uploadToCloudinary');

const attachCloudinaryResult = (file, uploaded) => {
  file.cloudinaryUrl = uploaded.url;
  file.public_id = uploaded.public_id;
  file.path = uploaded.public_id;
  file.image = {
    url: uploaded.url,
    path: uploaded.public_id,
  };
};

/**
 * After multer memory storage (+ optional HEIC convert), push file to Cloudinary.
 * Sets req.file.cloudinaryUrl (https link) and req.file.image { url, path }.
 */
const cloudinaryUpload =
  (folder = 'brivio') =>
  async (req, res, next) => {
    try {
      if (req.file) {
        attachCloudinaryResult(req.file, await uploadBufferToCloudinary(req.file, folder));
      }
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          attachCloudinaryResult(file, await uploadBufferToCloudinary(file, folder));
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = cloudinaryUpload;
