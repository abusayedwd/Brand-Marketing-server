// const {Campaign} = require('../models');

// // Create a new campaign
// const createCampaign = async (data) => {
//   const campaign = new Campaign(data);
//   return await campaign.save();
// };

// // Get all campaigns
// const getAllCampaigns = async () => {
//   return await Campaign.find();
// };

// // Get a specific campaign by ID
// const getCampaignById = async (id) => {
//   return await Campaign.findById(id);
// };

// // Update a campaign by ID
// const updateCampaign = async (id, data) => {
//   return await Campaign.findByIdAndUpdate(id, data, { new: true });
// };

// // Delete a campaign by ID
// const deleteCampaign = async (id) => {
//   return await Campaign.findByIdAndDelete(id);
// };

// module.exports = {
//   createCampaign,
//   getAllCampaigns,
//   getCampaignById,
//   updateCampaign,
//   deleteCampaign
// };



const { default: mongoose } = require('mongoose');
const {Campaign} = require('../models');
const {User} = require('../models');
const DraftApprove = require('../models/draft.model');
const { populate } = require('../models/service.model');
const Wallet = require('../models/wallet.model');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const { syncCampaignStatus, hasObjectId } = require('./campaignStatus.service');
 
 

// Create a new campaign
// const createCampaign = async (data) => {
 
//   try { 
//     const campaign = new Campaign(data);
//     await campaign.save();
//     return campaign;
//   } catch (error) {
//     throw new Error('Error creating campaign');
//   }
// };

const createCampaign = async (data) => {
  data.startDate = new Date(data.startDate).toISOString();
  data.endDate = new Date(data.endDate).toISOString();

  try {
    const campaign = new Campaign(data);
    syncCampaignStatus(campaign);
    await campaign.save();
    return campaign;
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw new Error('Error creating campaign');
  }
};




const updateCampaign = async (campaignId, updatedData) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { $set: updatedData },
      { new: true }  
    );
    return updatedCampaign;
  } catch (error) {
    throw new Error('Error updating campaign: ' + error.message);
  }
};




 const getAllCampaigns =  async(filter, option) => {
   const query = { status: { $ne: 'pending' } };

  for (const key of Object.keys(filter)) {
    if (
      (key === "campaignName" || key === "status" || key === "budget") &&
      filter[key] !== ""
    ) {
      query[key] = { $regex: filter[key], $options: "i" }; // Case-insensitive regex search for name
    } else if (filter[key] !== "") {
      query[key] = filter[key];
    }
  }

   const campaigns = await Campaign.paginate(query, {
      ...option,
      populate: "brandId",
   }) ;
   return campaigns
 };


const getMyCampaigns = async (brandId, filter, options) => {
 
  const query = { brandId}; // Add userId to the query to filter by brandId

  // Process the filter object to add other search criteria (like campaignName, status, etc.)
  for (const key of Object.keys(filter)) {
    if (
      (key === "campaignName" || key === "status" || key === "budget") &&
      filter[key] !== ""
    ) {
      query[key] = { $regex: filter[key], $options: "i" }; // Case-insensitive regex search for name
    } else if (filter[key] !== "") {
      query[key] = filter[key];
    }
  }

  // Now, we pass the `query` and `options` to paginate
  const campaigns = await Campaign.paginate(query,{
    ...options,
    populate: "brandId",
    select:"fullName"
  } ); 
  return campaigns;
};



// Get campaign details along with interested and accepted influencers




// const getMyCampaigns = async (brandId, filter, options) => {
//   // Building the aggregation pipeline
//   const pipeline = [
//     {
//       $match: { brandId: new mongoose.Types.ObjectId(brandId) }, // Filter by brandId
//     },
//     // Add additional filters to the match stage
//     {
//       $match: {
//         $or: [
//           { campaignName: { $regex: filter.campaignName || '', $options: 'i' } },
//           { status: { $regex: filter.status || '', $options: 'i' } },
//           { budget: filter.budget || { $gte: 0 } },
//         ]
//       }
//     },
//     {
//       $lookup: {
//         from: 'users', // Assuming 'users' collection stores influencer data
//         localField: 'acceptedInfluencers',
//         foreignField: '_id',
//         as: 'acceptedInfluencersDetails'
//       }
//     },
//     {
//       $lookup: {
//         from: 'users', // Assuming 'users' collection stores influencer data
//         localField: 'interestedInfluencers',
//         foreignField: '_id',
//         as: 'interestedInfluencersDetails'
//       }
//     },
//     {
//       $project: {
//         campaignName: 1,
//         status: 1,
//         budget: 1,
//         description: 1,
//         startDate: 1,
//         endDate: 1,
//         selectedPlatforms: 1,
//         image: 1,
//         totalAmount: 1,
//         brandId: 1, 
//         acceptedInfluencersDetails: { fullName: 1, email: 1, userName: 1, socialMedia: 1,image: 1},
//         interestedInfluencersDetails: { fullName: 1, email: 1, userName: 1, socialMedia: 1, image: 1},
        
//       }
//     },
//     // Add pagination
//     {
//       $skip: options.page ? options.page * options.limit : 0, // Skip for pagination
//     },
//     {
//       $limit: options.limit || 10, // Limit to the specified number of results
//     },
//   ];

//   // Perform the aggregation
//   const campaigns = await Campaign.aggregate(pipeline);

//   return campaigns;
// };



const getCampaignDetails = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('brandId')
      .populate('interestedInfluencers')
      .populate('acceptedInfluencers')
      .exec();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    syncCampaignStatus(campaign);
    await campaign.save();

    return campaign;
  } catch (error) {
    throw new Error('Error fetching campaign details');
  }
};

// Influencer shows interest in the campaign
const showInterest = async (campaignId, influencerId) => {
  try {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (['pending', 'completed', 'cancelled'].includes(campaign.status)) {
      throw new Error('This campaign is not open for interest right now');
    }

    if ((campaign.acceptedInfluencers?.length || 0) >= campaign.influencerCount) {
      throw new Error('This campaign has already filled all influencer slots');
    }

    if (hasObjectId(campaign.interestedInfluencers, influencerId)) {
      throw new Error('Influencer already showed interest');
    }

    if (hasObjectId(campaign.acceptedInfluencers, influencerId)) {
      throw new Error('You are already accepted for this campaign');
    }

    campaign.interestedInfluencers.push(influencerId);
    syncCampaignStatus(campaign);
    await campaign.save();

    try {
      const { createNotification } = require('./notification.service');
      const influencer = await User.findById(influencerId).select('fullName userName');
      const name = influencer?.fullName || influencer?.userName || 'A creator';
      await createNotification({
        userId: campaign.brandId,
        title: 'New campaign interest',
        message: `${name} showed interest in ${campaign.campaignName}.`,
        type: 'campaign',
        link: `/dashboard/campaigns/details?id=${campaignId}`,
        meta: { campaignId, influencerId },
      });
    } catch (_) {}

    return campaign;
  } catch (error) {
    throw new Error(error.message || ' showing interest in campaign');
    // console.log( error.message)
     
  }
};

// Brand accepts an influencer
const acceptInfluencer = async (campaignId, influencerId) => {
 
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
    }

    if (campaign.acceptedInfluencers.length >= campaign.influencerCount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot accept more influencers');
    }

    // if (!campaign.interestedInfluencers.includes(influencerId)) {
    //   throw new Error('Influencer did not show interest');
    // }

    // Accept influencer and move from interested to accepted
    campaign.acceptedInfluencers.push(influencerId);
    campaign.interestedInfluencers = campaign.interestedInfluencers.filter(
      (id) => id?.toString() !== influencerId?.toString()
    );

    syncCampaignStatus(campaign);
    await campaign.save();

    try {
      const { createNotification } = require('./notification.service');
      await createNotification({
        userId: influencerId,
        title: 'You were accepted',
        message: `You were accepted for ${campaign.campaignName}. You can now submit your draft.`,
        type: 'campaign',
        link: `/dashboard/campaigns/details?id=${campaignId}`,
        meta: { campaignId },
        email: true,
      });
    } catch (_) {}

    return campaign;
  
};

const denyInfluencer = async (campaignId, influencerId) => {
  try {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!hasObjectId(campaign.interestedInfluencers, influencerId)) {
      throw new Error('Influencer not in the interested list');
    }

    campaign.interestedInfluencers = campaign.interestedInfluencers.filter(
      (id) => id.toString() !== influencerId.toString()
    );

    syncCampaignStatus(campaign);
    await campaign.save();

    try {
      const { createNotification } = require('./notification.service');
      await createNotification({
        userId: influencerId,
        title: 'Interest not selected',
        message: `Your interest for ${campaign.campaignName} was not accepted this time.`,
        type: 'campaign',
        link: `/dashboard/campaigns`,
        meta: { campaignId },
      });
    } catch (_) {}

    return campaign;
  } catch (error) {
    throw new Error('Error denying influencer');
  }
};

// Influencer submits a draft
//  const getUpcomingCampaignsForInfluecer = async (filter,option) => {
//     // Find campaigns where status is 'upComming'
//     const campaigns = await Campaign.find({ status: 'upComming' });
//        const query = {};

//   for (const key of Object.keys(filter)) {
//     if (
//       (key === "campaignName" || key === "status" || key === "budget") &&
//       filter[key] !== ""
//     ) {
//       query[key] = { $regex: filter[key], $options: "i" }; // Case-insensitive regex search for name
//     } else if (filter[key] !== "") {
//       query[key] = filter[key];
//     }
//   }

//    const campaigns = await Campaign.paginate(query, {
//       ...option,
//       populate: "brandId",
//    }) ;
//    return campaigns
   
// };

/**
 * A campaign is still "recruiting" (open for new influencers to discover and
 * show interest in) as long as it hasn't wrapped up its lifecycle AND it still
 * has open influencer slots — not just while status is literally 'upComming'.
 * Status flips to 'active' as soon as the FIRST influencer is accepted, but
 * that shouldn't hide the campaign from everyone else while slots remain.
 */
const recruitingCampaignQuery = () => ({
  status: { $in: ['upComming', 'active'] },
  $expr: { $lt: [{ $size: { $ifNull: ['$acceptedInfluencers', []] } }, '$influencerCount'] },
});

/** Public home listing — recruiting campaigns only, limited brand fields */
const getOpenCampaigns = async (options = {}) => {
  return Campaign.paginate(
    recruitingCampaignQuery(),
    {
      ...options,
      sortBy: options.sortBy || 'createdAt:desc',
      populate: 'brandId',
    }
  );
};

const getUpcomingCampaignsForInfluecer = async (filter, option) => {
  const query = recruitingCampaignQuery(); // Still-recruiting campaigns (open slots), not just 'upComming'

  // Apply additional filters dynamically
  for (const key of Object.keys(filter)) {
    if (
      (key === "campaignName" || key === "status" || key === "budget") &&
      filter[key] !== ""
    ) {
      // Case-insensitive regex search for the specified fields
      query[key] = { $regex: filter[key], $options: "i" }; 
    } else if (filter[key] !== "") {
      // For other fields, just add them as exact matches
      query[key] = filter[key];
    }
  }

  // Apply pagination and populate the brandId field
  const campaigns = await Campaign.paginate(query, {
    ...option,
    populate: "brandId",
  });

  return campaigns;
};

const getInterestedCampaignsForInfluencer = async (influencerId, filter, option) => {
  const query = { 
    interestedInfluencers: influencerId  // Filter for campaigns the influencer is interested in
  };

  // Apply additional filters dynamically based on the filter object
  for (const key of Object.keys(filter)) {
    if (
      (key === "campaignName" || key === "status" || key === "budget") &&
      filter[key] !== ""
    ) {
      query[key] = { $regex: filter[key], $options: "i" }; // Case-insensitive regex search
    } else if (filter[key] !== "") {
      query[key] = filter[key];  // Exact match for other fields
    }
  }

  // Paginate the results and populate the brandId field
 
    const campaigns = await Campaign.paginate(query, {
      ...option,  // pagination options (page, limit, etc.)
      populate: 'brandId'  // Populate the brandId field with the brand details
    });
    return campaigns;
  
};

const getCompletedCampaignsCount = async (influencerId) => {
  return DraftApprove.countDocuments({ influencerId, isApproved: true });
};

const getCompletedCampaignsForInfluencer = async (influencerId, filter, option) => {
  const query = {
    drafts: {
      $elemMatch: {
        influencerId,
        isApproved: true,
      },
    },
  };

  for (const key of Object.keys(filter)) {
    if (
      (key === 'campaignName' || key === 'status' || key === 'budget') &&
      filter[key] !== ''
    ) {
      query[key] = { $regex: filter[key], $options: 'i' };
    } else if (filter[key] !== '') {
      query[key] = filter[key];
    }
  }

  const campaigns = await Campaign.paginate(query, {
    ...option,
    populate: 'brandId',
  });
  return campaigns;
};

const getAcceptedCampaignsForInfluencer = async (influencerId, filter, option) => {
  const query = {
                // Filter for 'upComming' campaigns
    acceptedInfluencers: influencerId    // Filter for campaigns the influencer has been accepted into
  };

  // Apply additional filters dynamically based on the filter object
  for (const key of Object.keys(filter)) {
    if (
      (key === "campaignName" || key === "status" || key === "budget") &&
      filter[key] !== ""
    ) {
      query[key] = { $regex: filter[key], $options: "i" }; // Case-insensitive regex search
    } else if (filter[key] !== "") {
      query[key] = filter[key];  // Exact match for other fields
    }
  }

  // Paginate the results and populate the brandId field
 
    const campaigns = await Campaign.paginate(query, {
      ...option,  // pagination options (page, limit, etc.)
      populate: 'brandId',  // Populate the brandId field with the brand details
    });
    return campaigns;
  
};
 

const submitDraft = async (campaignId, influencerId, draftContent, image, socialPlatform) => {
  try {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!hasObjectId(campaign.acceptedInfluencers, influencerId)) {
      throw new Error('Influencer not accepted for this campaign');
    }

    const existingDraft = campaign.drafts.find(
      (draft) => draft.influencerId.toString() === influencerId.toString()
    );

    if (existingDraft) {
      if (existingDraft.isApproved) {
        throw new Error('Your draft is already approved for this campaign');
      }
      if (!existingDraft.isRejected) {
        throw new Error('You have already submitted a draft for this campaign');
      }
      // Allow resubmit after rejection
      existingDraft.draftContent = draftContent;
      existingDraft.image = image;
      existingDraft.socialPlatform = socialPlatform;
      existingDraft.isRejected = false;
      existingDraft.rejectionReason = '';
      existingDraft.createdAt = new Date();
    } else {
      campaign.drafts.push({
        influencerId,
        draftContent,
        image,
        socialPlatform,
      });
    }

    syncCampaignStatus(campaign);
    await campaign.save();

    try {
      const { createNotification } = require('./notification.service');
      await createNotification({
        userId: campaign.brandId,
        title: 'New draft submitted',
        message: `A draft was submitted for ${campaign.campaignName}.`,
        type: 'draft',
        link: `/dashboard/campaigns/details?id=${campaignId}`,
        email: true,
      });
    } catch (_) {}

    return campaign;
  } catch (error) {
    throw new Error(error.message || 'Error submitting draft');
  }
};

const rejectDraft = async (campaignId, draftId, rejectionReason = '') => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const draft = campaign.drafts.id(draftId);
  if (!draft) throw new Error('Draft not found');
  if (draft.isApproved) throw new Error('Approved drafts cannot be rejected');

  draft.isRejected = true;
  draft.isApproved = false;
  draft.rejectionReason = rejectionReason || 'Please revise and resubmit your draft.';

  await campaign.save();

  try {
    const { createNotification } = require('./notification.service');
    await createNotification({
      userId: draft.influencerId,
      title: 'Draft needs revision',
      message: `Your draft for ${campaign.campaignName} was rejected. ${draft.rejectionReason}`,
      type: 'draft',
      link: `/dashboard/campaigns/details?id=${campaignId}`,
      email: true,
    });
  } catch (_) {}

  return campaign;
};

const getBrandCampaignAnalytics = async (brandId) => {
  const campaigns = await Campaign.find({ brandId });
  const summary = {
    totalCampaigns: campaigns.length,
    pending: 0,
    upComming: 0,
    active: 0,
    completed: 0,
    totalSpend: 0,
    totalAcceptedInfluencers: 0,
    draftsPending: 0,
    draftsApproved: 0,
    draftsRejected: 0,
    campaigns: [],
  };

  for (const c of campaigns) {
    summary[c.status] = (summary[c.status] || 0) + 1;
    if (c.status !== 'pending') summary.totalSpend += Number(c.totalAmount || 0);
    summary.totalAcceptedInfluencers += c.acceptedInfluencers?.length || 0;

    let pendingDrafts = 0;
    let approvedDrafts = 0;
    let rejectedDrafts = 0;
    for (const d of c.drafts || []) {
      if (d.isApproved) approvedDrafts += 1;
      else if (d.isRejected) rejectedDrafts += 1;
      else pendingDrafts += 1;
    }
    summary.draftsPending += pendingDrafts;
    summary.draftsApproved += approvedDrafts;
    summary.draftsRejected += rejectedDrafts;

    summary.campaigns.push({
      id: c.id || c._id,
      campaignName: c.campaignName,
      status: c.status,
      budget: c.budget,
      totalAmount: c.totalAmount,
      influencerCount: c.influencerCount,
      acceptedCount: c.acceptedInfluencers?.length || 0,
      interestedCount: c.interestedInfluencers?.length || 0,
      draftsPending: pendingDrafts,
      draftsApproved: approvedDrafts,
      draftsRejected: rejectedDrafts,
      completionRate:
        c.influencerCount > 0
          ? Number(((approvedDrafts / c.influencerCount) * 100).toFixed(1))
          : 0,
    });
  }

  return summary;
};



const approveDraftAndAddBudget = async (campaignId, draftId) => {
  
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Find the draft by its ID 
    const draft = campaign.drafts.id(draftId);

    if (!draft) {
      throw new Error('Draft not found');
    }

    // Approve the draft
    draft.isApproved = true;
    draft.isRejected = false;
    draft.rejectionReason = '';

    // Get the budget from the campaign or set a fixed budget
    const budget = campaign.budget;  // Example: a fixed budget per influencer in the campaign

    // Add the budget to the influencer's wallet
    const influencer = await User.findById(draft.influencerId);

    if (!influencer) {
      throw new Error('Influencer not found');
    }

    // Find the influencer's wallet or create one if it doesn't exist
    let wallet = await Wallet.findOne({ influencerId: draft.influencerId });

    if (!wallet) {
      wallet = new Wallet({ influencerId: draft.influencerId });
    }

    // Add the budget to the wallet balance
    wallet.balance += budget;

    // Record the transaction in the wallet
    wallet.transactions.push({
      amount: budget,
      type: 'deposit',
      campaignName: campaign?.campaignName,
      description: 'Budget added after draft approval'
    });

    // Save the wallet
    await wallet.save();

    // Create a record in the DraftApprove model
    const draftApproval = new DraftApprove({
      campaignId,
      draftId,
      influencerId: draft.influencerId,
      image:draft.image,
      budget,
      campaignName: campaign.campaignName,
      influencerCount:campaign.influencerCount, 
      isApproved: true
    });

    await draftApproval.save();

    syncCampaignStatus(campaign);
    await campaign.save();

    try {
      const { createNotification } = require('./notification.service');
      await createNotification({
        userId: draft.influencerId,
        title: 'Draft approved',
        message: `Your draft for ${campaign.campaignName} was approved. $${budget} added to your wallet.`,
        type: 'draft',
        link: '/dashboard/my-wallet',
        email: true,
      });
    } catch (_) {}

    return campaign;
  
};
 

module.exports = {
  createCampaign,
  updateCampaign,
  getCampaignDetails,
  showInterest,
  acceptInfluencer,
  denyInfluencer,
  submitDraft,
  rejectDraft,
  approveDraftAndAddBudget,
  getBrandCampaignAnalytics,
  getAllCampaigns,
  getMyCampaigns,
  getOpenCampaigns,
  getUpcomingCampaignsForInfluecer,
  getInterestedCampaignsForInfluencer,
  getAcceptedCampaignsForInfluencer,
  getCompletedCampaignsForInfluencer,
  getCompletedCampaignsCount,
};
