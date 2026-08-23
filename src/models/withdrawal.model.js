// const mongoose = require('mongoose');
// const { toJSON,paginate } = require('./plugins');

// const withdrawalRequestSchema = new mongoose.Schema({
//   influencerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending'
//   },
//   bankDetails: {
//     bankName: {
//       type: String,
//       required: true
//     },
//     accountNumber: {
//       type: String,
//       required: true
//     },
//     routingNumber: {
//       type: String,
//       required: true
//     }
//   },
//   reason: {
//     type: String,
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// withdrawalRequestSchema.plugin(toJSON);
// withdrawalRequestSchema.plugin(paginate);

// const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

// module.exports = WithdrawalRequest;



const mongoose = require('mongoose');
const { toJSON, paginate, cloudinaryImage } = require('./plugins');

const withdrawalRequestSchema = new mongoose.Schema({
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  bankDetails: {
    bankName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    holderName: {
      type: String,
      required: true
    }
  },
  reason: {
    type: String,
    required: true
  },
  approvalNote: {
    type: String,
    required: false,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  isHeld: {
    type: Boolean,
    default: false,
  },
  image: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

withdrawalRequestSchema.plugin(toJSON);
withdrawalRequestSchema.plugin(paginate);
withdrawalRequestSchema.plugin(cloudinaryImage);

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

module.exports = WithdrawalRequest;
