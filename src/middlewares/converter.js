const path = require('path');
const convert = require('heic-convert');

/** Convert HEIC/HEIF in-memory before Cloudinary upload. Folder arg kept for route compatibility. */
const convertHeicToPngMiddleware = () => {
  return async (req, res, next) => {
    try {
      if (
        req.file &&
        (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif')
      ) {
        const pngBuffer = await convert({
          buffer: req.file.buffer,
          format: 'PNG',
        });
        const originalFileName = path.basename(
          req.file.originalname,
          path.extname(req.file.originalname)
        );
        req.file.buffer = pngBuffer;
        req.file.mimetype = 'image/png';
        req.file.originalname = `${originalFileName}.png`;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = convertHeicToPngMiddleware;
