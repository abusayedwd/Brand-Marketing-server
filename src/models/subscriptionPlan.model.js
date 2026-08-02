const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'eur' },
    durationDays: { type: Number, default: 30 },
    features: [{ type: String }],
    role: {
      type: String,
      enum: ['influencer', 'brand', 'both'],
      default: 'both',
    },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

subscriptionPlanSchema.plugin(toJSON);
subscriptionPlanSchema.plugin(paginate);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
