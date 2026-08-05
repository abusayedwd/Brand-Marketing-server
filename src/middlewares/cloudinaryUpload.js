const { uploadBufferToCloudinary } = require('../utils/uploadToCloudinary');

/**
 * After multer memory storage (+ optional HEIC convert), push file to Cloudinary.
 * Sets req.file.cloudinaryUrl and req.file.public_id
 */
const cloudinaryUpload =
  (folder = 'brivio') =>
  async (req, res, next) => {
    try {
      if (!req.file) return next();
      const uploaded = await uploadBufferToCloudinary(req.file, folder);
      req.file.cloudinaryUrl = uploaded.url;
      req.file.public_id = uploaded.public_id;
      req.file.path = uploaded.public_id;
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = cloudinaryUpload;
