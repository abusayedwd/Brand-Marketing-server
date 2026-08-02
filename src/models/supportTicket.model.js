const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const supportTicketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: {
      type: String,
      enum: ['Campaign', 'Payment', 'Withdraw', 'Account', 'Other'],
      default: 'Other',
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminReply: { type: String, default: '' },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supportTicketSchema.plugin(toJSON);
supportTicketSchema.plugin(paginate);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
