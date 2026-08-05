 


// const express = require("express");
// const auth = require("../../middlewares/auth");
// const validate = require("../../middlewares/validate");
// const userValidation = require("../../validations/user.validation");
 
// const userFileUploadMiddleware = require("../../middlewares/fileUpload");
// const convertHeicToPngMiddleware = require("../../middlewares/converter");
// const { campaignController } = require("../../controllers");
// const bodyParser = require("body-parser");
// const UPLOADS_FOLDER_USERS = "./public/uploads/users";

// const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

// const router = express.Router();


// router.post("/createCampaign",auth('brand'),
//      [uploadUsers.single("image")],
//      convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
//      campaignController.createCampaign);

// // router.post('/webhook-createCampaign',auth('brand'), campaignController.stripeWebhook);   

// router.put('/updateCampaign/:campaignId',auth('brand'),
//  [uploadUsers.single("image")],
//  convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
// campaignController.updateCampaign);

// router.get('/getAllCampaigns',auth('common'), campaignController.getAllCampaigns);

// router.get('/getMy-Campaigns',auth('common'), campaignController.getMyCampaigns);
// ////Influencer showing interest in a campaign

// router.get('/:campaignId',auth('common'), campaignController.getCampaignDetails); 

// router.get('/getUpcomingCampaignsForInfluecer',auth('influencer'),
//  campaignController.getUpcomingCampaignsForInfluecer);

//  router.post('/acceptInfluencer/:campaignId',auth('brand'), campaignController.acceptInfluencer);
//  router.post('/denyInfluencer/:campaignId',auth('brand'), campaignController.denyInfluencer);
//  router.get('/getInterestedCampaignsForInfluencer',auth('influencer'),
//       campaignController.getInterestedCampaignsForInfluencer);

//  router.get('/getAcceptedCampaignsForInfluencer',auth('influencer'),
//       campaignController.getAcceptedCampaignsForInfluencer);

// router.post('/interested/:campaignId',auth('influencer'), campaignController.showInterest);


// router.post('/submitDraft/:campaignId',auth('influencer'),
//      [uploadUsers.single("image")],
//      convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
//     campaignController.submitDraft);

// router.post('/approveDraft',auth('brand'), campaignController.approveDraft); 

 

// module.exports = router;



const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const userValidation = require("../../validations/user.validation");

const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const convertHeicToPngMiddleware = require("../../middlewares/converter");
const cloudinaryUpload = require("../../middlewares/cloudinaryUpload");
const { campaignController } = require("../../controllers");

const uploadUsers = userFileUploadMiddleware();

const router = express.Router();



router.post("/createCampaign", auth('brand'),
    uploadUsers.single("image"),
    convertHeicToPngMiddleware(),
    cloudinaryUpload("brivio/campaigns"),
    campaignController.createCampaign);

router.post('/verifyCampaignPayment', auth('brand'), campaignController.verifyCampaignPayment);

router.post('/resumePayment/:campaignId', auth('brand'), campaignController.resumeCampaignPayment);

// Public (Get) Routes
router.get('/open', campaignController.getOpenCampaigns);
router.get('/getAllCampaigns', auth('common'), campaignController.getAllCampaigns);
router.get('/getMy-Campaigns', auth('common'), campaignController.getMyCampaigns);


router.get('/getUpcomingCampaignsForInfluecer', auth('influencer'), 
campaignController.getUpcomingCampaignsForInfluecer);

router.get('/getInterestedCampaignsForInfluencer', auth('influencer'), 
campaignController.getInterestedCampaignsForInfluencer);

router.get('/getAcceptedCampaignsForInfluencer', auth('influencer'), 
campaignController.getAcceptedCampaignsForInfluencer);

router.get('/getMyCompletedCampaigns', auth('influencer'),
campaignController.getMyCompletedCampaigns);

router.get('/brandAnalytics', auth('brand'), campaignController.getBrandAnalytics);

router.get('/getMydraft', auth('influencer'), campaignController.getMydraft);

router.get('/:campaignId', auth('common'), campaignController.getCampaignDetails);
// Campaign Creation / Update (Post / Put) Routes

// Updating Campaign
router.put('/updateCampaign/:campaignId', auth('brand'),
    uploadUsers.single("image"),
    convertHeicToPngMiddleware(),
    cloudinaryUpload("brivio/campaigns"),
    campaignController.updateCampaign);

// Campaign Interactions (Accept, Deny, Show Interest)
router.post('/acceptInfluencer/:campaignId', auth('brand'), campaignController.acceptInfluencer);
router.post('/denyInfluencer/:campaignId', auth('brand'), campaignController.denyInfluencer);
router.post('/interested/:campaignId', auth('influencer'), campaignController.showInterest);
router.post('/submitDraft/:campaignId', auth('influencer'),
    uploadUsers.single("image"),
    convertHeicToPngMiddleware(),
    cloudinaryUpload("brivio/drafts"),
    campaignController.submitDraft);
router.post('/approveDraft', auth('brand'), campaignController.approveDraft);
router.post('/rejectDraft', auth('brand'), campaignController.rejectDraft);

// Webhook Route (Uncomment and implement as needed)
 // router.post('/webhook-createCampaign', auth('brand'), campaignController.stripeWebhook); 

module.exports = router;
