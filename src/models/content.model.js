const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const contentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ['privacy', 'terms', 'about'],
      required: true,
      unique: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

contentSchema.plugin(toJSON);
contentSchema.plugin(paginate);

module.exports = mongoose.model('ContentPage', contentSchema);
