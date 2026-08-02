const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const ratingSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

ratingSchema.index({ campaignId: 1, fromUserId: 1, toUserId: 1 }, { unique: true });
ratingSchema.plugin(toJSON);
ratingSchema.plugin(paginate);

module.exports = mongoose.model('Rating', ratingSchema);
