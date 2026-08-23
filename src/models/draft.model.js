
const mongoose = require('mongoose');
const { toJSON, cloudinaryImage } = require('./plugins');

const draftApproveSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  }, 
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
 draftContent: String,
     image: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },  
     socialPlatform: [{
      platform: String,  
      url: String   
    }],
  budget: {
    type: Number,
    required: true
  },
    campaignName: {
    type: String,
    required: true
  },
    influencerCount: {
    type: Number,
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvalDate: {
    type: Date,
    default: Date.now
  }
});

draftApproveSchema.plugin(toJSON);
draftApproveSchema.plugin(cloudinaryImage);

const DraftApprove = mongoose.model('DraftApprove', draftApproveSchema);

module.exports = DraftApprove;
