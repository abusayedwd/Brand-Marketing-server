const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
      type: {
      type: String,
      enum: [
        'general',
        'campaign',
        'draft',
        'withdraw',
        'payment',
        'moderation',
        'support',
        'system',
        'message',
      ],
      default: 'general',
    },
    link: { type: String, default: '' },
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.plugin(toJSON);
notificationSchema.plugin(paginate);

module.exports = mongoose.model('Notification', notificationSchema);
