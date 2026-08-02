const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  heldBalance: {
    type: Number,
    default: 0
  },
  transactions: [{
    amount: {
      type: Number,
      required: true
    },
  campaignName : {
      type: String
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'hold', 'hold_release'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String
    }
  }]
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
