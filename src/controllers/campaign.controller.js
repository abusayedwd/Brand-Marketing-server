// const { campaignService } = require("../services");

 

// // Create a new campaign
// const createCampaign = async (req, res) => {
//   try {
//     const data = req.body;
//     const newCampaign = await campaignService.createCampaign(data);
//     res.status(201).json(newCampaign);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get all campaigns
// const getAllCampaigns = async (req, res) => {
//   try {
//     const campaigns = await campaignService.getAllCampaigns();
//     res.status(200).json(campaigns);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get a specific campaign by ID
// const getCampaignById = async (req, res) => {
//   try {
//     const campaign = await campaignService.getCampaignById(req.params.id);
//     if (!campaign) {
//       return res.status(404).json({ message: 'Campaign not found' });
//     }
//     res.status(200).json(campaign);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Update a campaign by ID
// const updateCampaign = async (req, res) => {
//   try {
//     const updatedCampaign = await campaignService.updateCampaign(req.params.id, req.body);
//     if (!updatedCampaign) {
//       return res.status(404).json({ message: 'Campaign not found' });
//     }
//     res.status(200).json(updatedCampaign);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete a campaign by ID
// const deleteCampaign = async (req, res) => {
//   try {
//     const deletedCampaign = await campaignService.deleteCampaign(req.params.id);
//     if (!deletedCampaign) {
//       return res.status(404).json({ message: 'Campaign not found' });
//     }
//     res.status(200).json({ message: 'Campaign deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// module.exports = {
//   createCampaign,
//   getAllCampaigns,
//   getCampaignById,
//   updateCampaign,
//   deleteCampaign
// };


const httpStatus = require("http-status");
const {campaignService} =  require("../services");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const ApiError = require("../utils/ApiError");
const pick = require("../utils/pick");
const { Campaign } = require("../models");
const transactionController = require("./transaction.controller");
const DraftApprove = require("../models/draft.model");
 
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const endpointSecret = process.env.CREATE_CAMPAIGN_WEBHOOK_SECRET;
const {
  STRIPE_PROJECT,
  FRONTEND_URL,
  getStripeRawBody,
  toStripeMetadata,
  parsePlatforms,
} = require("../utils/stripeHelpers");
const { fulfillCampaignPayment, createCheckoutSessionForCampaign } = require("../services/campaignPayment.service");

const stripeSessionRetrieveOptions = { expand: ['payment_intent'] };

const { applyUploadedImage } = require('../utils/uploadToCloudinary');


const createCampaign = catchAsync(async (req, res) => {
  const { budget, campaignName, description, endDate, influencerCount, selectedPlatforms, startDate, totalAmount } = req.body; // Include imageUrl
  const brandId = req.user.id;

  if (!req.user.isSubscribe) {
    throw new ApiError(
      httpStatus.PAYMENT_REQUIRED,
      "An active subscription is required to create a campaign. Please subscribe to a plan first."
    );
  }

  const image = applyUploadedImage(req);
  if (!image) {
    return res.status(400).json({ message: "Image file is required" });
  }


  const items = [
    {
      name: campaignName,
      quantity: 1,
    },
  ];

  // Convert totalAmount to cents
  const amount = Math.round(totalAmount * 100); // Stripe expects price in cents

  const pendingCampaign = await Campaign.create({
    brandId,
    campaignName,
    description: description || '',
    budget: Number(budget),
    totalAmount: Number(totalAmount),
    influencerCount: Number(influencerCount),
    selectedPlatforms: parsePlatforms(selectedPlatforms),
    startDate,
    endDate,
    image,
    status: 'pending',
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
        },
     
        unit_amount: amount,
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${FRONTEND_URL}/dashboard/campaigns?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard/campaigns?payment=cancelled`,
    customer_email: req?.user?.email,
    metadata: toStripeMetadata({
      brandId,
      budget,
      campaignName,
      totalAmount,
      project: STRIPE_PROJECT,
      startDate,
      endDate,
      description,
      influencerCount,
      selectedPlatforms: parsePlatforms(selectedPlatforms),
      image,
      campaignId: pendingCampaign._id.toString(),
    }),
  });

  pendingCampaign.stripeSessionId = session.id;
  await pendingCampaign.save();

  res.status(httpStatus.CREATED).json({
    status: "success",
    sessionId: session.id,
    url: session.url,
    campaignId: pendingCampaign._id,
  });
});

const stripeCampaignWebhook = async (req, res) => {
  console.log("Campaign webhook endpoint hit!");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (!endpointSecret) {
      console.error("Stripe webhook secret not configured.");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    event = stripe.webhooks.constructEvent(getStripeRawBody(req), sig, endpointSecret);
    console.log("Webhook verified.,>>>>>>>>>:", event);

    const data = event.data.object;
    const eventType = event.type;

    console.log(`Received event type: ${eventType}`);

    if (eventType === "checkout.session.completed") {
      const session = data;
      console.log("Payment successfully completed. Session details:", session);

      const result = await fulfillCampaignPayment(session);
      console.log("Campaign payment fulfillment result:", result);
      return res.status(200).json({ received: true, eventType, ...result });
    }

    return res.status(200).json({ received: true, ignored: true, eventType });
  } catch (error) {
    console.error("Error processing webhook event:", error);
    return res.status(400).json({ error: error.message });
  }
};

const verifyCampaignPayment = catchAsync(async (req, res) => {
  const { sessionId, campaignId } = req.body;

  if (!sessionId && !campaignId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Session ID or campaign ID is required");
  }

  let session;

  if (sessionId) {
    session = await stripe.checkout.sessions.retrieve(sessionId, stripeSessionRetrieveOptions);
  } else {
    const pendingCampaign = await Campaign.findOne({
      _id: campaignId,
      brandId: req.user.id,
      status: "pending",
    });

    if (!pendingCampaign?.stripeSessionId) {
      throw new ApiError(httpStatus.NOT_FOUND, "No pending payment found for this campaign");
    }

    session = await stripe.checkout.sessions.retrieve(
      pendingCampaign.stripeSessionId,
      stripeSessionRetrieveOptions
    );
  }

  if (String(session.metadata?.brandId) !== String(req.user.id)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this payment session");
  }

  const result = await fulfillCampaignPayment(session);

  res.status(httpStatus.OK).json(
    response({
      message: result.alreadyFulfilled
        ? "Campaign already activated"
        : result.ignored
        ? "Payment not completed yet"
        : "Campaign activated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const resumeCampaignPayment = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  if (!req.user.isSubscribe) {
    throw new ApiError(
      httpStatus.PAYMENT_REQUIRED,
      "An active subscription is required to create a campaign. Please subscribe to a plan first."
    );
  }

  const campaign = await Campaign.findOne({
    _id: campaignId,
    brandId: req.user.id,
    status: "pending",
  });

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, "Pending campaign not found");
  }

  if (campaign.stripeSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(campaign.stripeSessionId);

    if (existingSession.status === "open" && existingSession.url) {
      return res.status(httpStatus.OK).json({
        status: "success",
        sessionId: existingSession.id,
        url: existingSession.url,
        message: "Continue your Stripe checkout to complete payment.",
      });
    }
  }

  const session = await createCheckoutSessionForCampaign(campaign, req.user.email);
  campaign.stripeSessionId = session.id;
  await campaign.save();

  res.status(httpStatus.OK).json({
    status: "success",
    sessionId: session.id,
    url: session.url,
    message: "New Stripe checkout session created.",
  });
});

 
 


const updateCampaign = catchAsync(async (req, res) => {
  const { campaignId } = req.params; // Extract campaignId from URL parameter

  const { budget, campaignName,description, endDate, influencerCount, selectedPlatforms, startDate, totalAmount } = req.body;
 
  const image = applyUploadedImage(req);

   const updatedData = {
       budget,  
       campaignName,
       ...(image ? { image } : {}),
       description, 
       endDate, 
       influencerCount, 
       selectedPlatforms, 
       startDate, 
       totalAmount
   }


 
    // Call the service to update the campaign
    const updatedCampaign = await campaignService.updateCampaign(campaignId, updatedData);

    // Return the updated campaign in response
    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign,
    });
 
 
});
 

const getAllCampaigns = catchAsync(async (req, res) => {

    const filter = pick(req.query, ['campaignName', 'status', 'budget']);  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

   const campaigns = await campaignService.getAllCampaigns(filter, options)

   if(!campaigns){
     throw new ApiError(httpStatus.NOT_FOUND, "no campaign found")
   }

   res.status(httpStatus.OK).json(
     response({
      status: "success",
      statusCode: httpStatus.OK,
      message: "get All Campaignss",
      data: campaigns
     })
   )
  

} )

const getMyCampaigns = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['campaignName', 'status', 'budget']); // Picking filters from query params
  const options = pick(req.query, ['sortBy', 'limit', 'page']); // Picking pagination and sorting options

  const brandId = req.user?.id; // Assuming the logged-in user's ID is stored in req.user.id
  if (!brandId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: "fail",
      message: "Brand ID is missing or invalid"
    });
  }

  // Get campaigns for the brand using the service function
  const myCampaigns = await campaignService.getMyCampaigns(brandId, filter, options);

  // Return the campaigns in the response
  res.status(httpStatus.OK).json(
    response({
      status: "success",
      message: "Successfully retrieved campaigns",
      statusCode: httpStatus.OK,
      data: myCampaigns,
    })
  );
});
// Get campaign details along with interested and accepted influencers
const getCampaignDetails = catchAsync(async (req, res) => {
  
    const { campaignId } = req.params;
    const campaign = await campaignService.getCampaignDetails(campaignId);
    res.status(httpStatus.OK)
    .json(
      response({
        status: "success",
        statusCode: httpStatus.OK, 
        data: campaign
       })
      );
   
});

  

const showInterest = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const  influencerId  = req.user.id;
    const campaign = await campaignService.showInterest(campaignId, influencerId);
    res.status(200).json({ message: "Interest shown successfully", code:200, campaign });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOpenCampaigns = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.limit) options.limit = 6;
  const campaigns = await campaignService.getOpenCampaigns(options);
  res.status(httpStatus.OK).json(
    response({
      message: 'Open campaigns',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: campaigns,
    })
  );
});

const getUpcomingCampaignsForInfluecer = catchAsync(async (req, res) => {
 
  const filter = pick(req.query, ['campaignName', 'status', 'budget','brandId']); 
 
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
    // Call the service to get campaigns with 'upComming' status
    const campaigns = await campaignService.getUpcomingCampaignsForInfluecer(filter, options);
    
    // Return the result as JSON
    res.status(200).json(
       response({
      message: 'get all Upcomming campaign request',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: campaigns,
    })
    ); 
});

// Controller function to get campaigns that an influencer is interested in
const getInterestedCampaignsForInfluencer = catchAsync(async (req, res) => {
  const  influencerId  = req.user.id;  // Get influencerId from the request parameters
    const filter = pick(req.query, ['campaignName', 'status', 'budget','brandId']); 
 
  const options = pick(req.query, ['sortBy', 'limit', 'page']); // Get filter and option (pagination) from the request body

 
    // Call the service to get the campaigns
    const campaigns = await campaignService.getInterestedCampaignsForInfluencer(influencerId, filter, options);

    // Return the campaigns in the response
       res.status(200).json(
       response({
      message: 'get all interested campaign request',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: campaigns,
    })
    ); 

 
});

const getAcceptedCampaignsForInfluencer = catchAsync(async (req, res) => {
  const influencerId = req.user.id;  // Get influencerId from the request parameters
    const filter = pick(req.query, ['campaignName', 'status', 'budget','brandId']); 
 
  const options = pick(req.query, ['sortBy', 'limit', 'page']); // Get filter and option (pagination) from the request body

 
    // Call the service to get the campaigns where the influencer is accepted
    const campaigns = await campaignService.getAcceptedCampaignsForInfluencer(influencerId, filter, options);

    // Return the campaigns in the response
       res.status(200).json(
       response({
      message: 'get all accepted campaign request',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: campaigns,
    })
    ); 
 
});




const getMyCompletedCampaigns = catchAsync(async (req, res) => {
  const influencerId = req.user.id;
  const filter = pick(req.query, ['campaignName', 'status', 'budget', 'brandId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const campaigns = await campaignService.getCompletedCampaignsForInfluencer(
    influencerId,
    filter,
    options
  );

  res.status(200).json(
    response({
      message: 'Completed campaigns retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: campaigns,
    })
  );
});

// Brand accepts an influencer
const acceptInfluencer = catchAsync(async (req, res) => {
 
    const { campaignId } = req.params;
    const { influencerId } = req.body;
    const campaign = await campaignService.acceptInfluencer(campaignId, influencerId);
    res.status(200).json({ message: "Influencer accepted", code:200, campaign }); 
});

const denyInfluencer = async (req, res) => {
  try {
    const { campaignId } = req.params; 
    const { influencerId } = req.body;

    const campaign = await campaignService.denyInfluencer(campaignId, influencerId);

    res.status(200).json({ message: "Influencer denied", campaign });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
 
const submitDraft = catchAsync(async (req, res) => {
  try {
    const { campaignId } = req.params;
    const influencerId = req?.user?.id;
    const { draftContent, socialPlatform } = req.body;

    const image = applyUploadedImage(req);
    if (!image) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Parse platforms from JSON string (if sent as JSON string)
    let platforms;
    try {
      platforms = JSON.parse(socialPlatform);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid socialPlatform format' });
    }

    // Submit draft via service
    const campaign = await campaignService.submitDraft(
      campaignId,
      influencerId,
      draftContent,
      image,
      platforms
    );

    



    res.status(200).json({ message: 'Draft submitted successfully',code: 200, campaign });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




const approveDraft = catchAsync(async (req, res) => {
 
    const { campaignId, draftId } = req.body; // Accept campaignId and draftId as params
    // Accept the budget value from the request (for the influencer)

    const campaign = await campaignService.approveDraftAndAddBudget(campaignId, draftId);

    res.status(200).json({ message: "Draft approved and budget added to wallet", code:200, campaign });
  
});

const rejectDraft = catchAsync(async (req, res) => {
  const { campaignId, draftId, rejectionReason } = req.body;
  const campaign = await campaignService.rejectDraft(campaignId, draftId, rejectionReason);
  res.status(200).json({
    message: 'Draft rejected. Influencer can revise and resubmit.',
    code: 200,
    campaign,
  });
});

const getBrandAnalytics = catchAsync(async (req, res) => {
  const data = await campaignService.getBrandCampaignAnalytics(req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Brand campaign analytics',
      status: 'OK',
      statusCode: httpStatus.OK,
      data,
    })
  );
});

const getMydraft = catchAsync(async(req, res)=> {
  const influencerId = req.user.id
  const drafts = await DraftApprove.find({influencerId})
  res.status(httpStatus.OK).json({
    message: "get success",
    code : httpStatus.OK,
    data: drafts
  })
}

)


module.exports = {
  createCampaign,
  updateCampaign,
  getCampaignDetails,
  showInterest,
  acceptInfluencer,
  denyInfluencer,
  submitDraft,
  approveDraft,
  rejectDraft,
  getBrandAnalytics,
  getAllCampaigns,
  getMyCampaigns,
  stripeCampaignWebhook,
  verifyCampaignPayment,
  resumeCampaignPayment,
  getOpenCampaigns,
  getUpcomingCampaignsForInfluecer,
  getInterestedCampaignsForInfluencer,
  getAcceptedCampaignsForInfluencer,
  getMyCompletedCampaigns,
  getMydraft
};
