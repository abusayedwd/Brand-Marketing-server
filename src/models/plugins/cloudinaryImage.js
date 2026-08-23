const { toImageUrl, isHttpUrl } = require('../../utils/uploadToCloudinary');

/** Coerce leftover { url, path } values to a Cloudinary URL string. */
const coerceImageValue = (value) => {
  if (value == null || value === '') return value;
  if (typeof value === 'object') {
    const url = value.url || '';
    if (isHttpUrl(url)) return url;
    if (url.startsWith('/uploads/')) return toImageUrl(value);
    return '';
  }
  return value;
};

const cloudinaryImage = (schema) => {
  schema.post('init', (doc) => {
    if (doc.image != null && typeof doc.image === 'object') {
      doc.image = coerceImageValue(doc.image);
    }
    if (Array.isArray(doc.drafts)) {
      doc.drafts.forEach((draft) => {
        if (draft.image != null && typeof draft.image === 'object') {
          draft.image = coerceImageValue(draft.image);
        }
      });
    }
  });

  schema.pre('save', function (next) {
    if (this.image != null && typeof this.image === 'object') {
      this.image = coerceImageValue(this.image);
    }
    if (Array.isArray(this.drafts)) {
      this.drafts.forEach((draft) => {
        if (draft.image != null && typeof draft.image === 'object') {
          draft.image = coerceImageValue(draft.image);
        }
      });
    }
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate() || {};
    const set = update.$set || update;
    if (set.image != null && typeof set.image === 'object') {
      set.image = coerceImageValue(set.image);
    }
    next();
  });
};

module.exports = cloudinaryImage;
