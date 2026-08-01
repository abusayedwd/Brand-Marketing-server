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

    if (hasObjectId(campaign.interestedInfluencers, influencerId)) {
      throw new Error('Influencer already showed interest');
    }

    campaign.interestedInfluencers.push(influencerId);
    syncCampaignStatus(campaign);
    await campaign.save();

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
      throw new ApiError('Campaign not found');
    }
    // if (!influencerId) {
    //   throw new ApiError(httpStatus.NOT_FOUND,'Influencer not found');
    // }

    if (campaign.acceptedInfluencers.length >= campaign.influencerCount) {
      throw new ApiError('Cannot accept more influencers');
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

const getUpcomingCampaignsForInfluecer = async (filter, option) => {
  const query = { status: 'upComming' }; // Start with filtering 'upComming' status

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

    const alreadySubmitted = campaign.drafts.some(
      (draft) => draft.influencerId.toString() === influencerId.toString()
    );

    if (alreadySubmitted) {
      throw new Error('You have already submitted a draft for this campaign');
    }

    // Add new draft
    campaign.drafts.push({
      influencerId,
      draftContent,
      image,
      socialPlatform,
    });

    syncCampaignStatus(campaign);
    await campaign.save();
    return campaign;

  } catch (error) {
    throw new Error(error.message || 'Error submitting draft');
  }
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
  approveDraftAndAddBudget, 
  getAllCampaigns,
  getMyCampaigns,
  getUpcomingCampaignsForInfluecer,
  getInterestedCampaignsForInfluencer,
  getAcceptedCampaignsForInfluencer,
  getCompletedCampaignsForInfluencer,
  getCompletedCampaignsCount,
};
