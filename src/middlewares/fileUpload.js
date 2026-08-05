const multer = require('multer');

/** Memory storage — files go to Cloudinary (not local disk). */
module.exports = function () {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20_000_000, // 20MB
    },
    fileFilter: (req, file, cb) => {
      if (
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/webp' ||
        file.mimetype === 'image/heic' ||
        file.mimetype === 'image/heif'
      ) {
        cb(null, true);
      } else {
        cb(new Error('Only jpg, png, jpeg, webp format allowed!'));
      }
    },
  });

  return upload;
};
