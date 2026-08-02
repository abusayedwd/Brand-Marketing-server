const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const favoriteSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

favoriteSchema.index({ brandId: 1, influencerId: 1 }, { unique: true });
favoriteSchema.plugin(toJSON);
favoriteSchema.plugin(paginate);

module.exports = mongoose.model('Favorite', favoriteSchema);
