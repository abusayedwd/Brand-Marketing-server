 


const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const userValidation = require("../../validations/user.validation");
 
const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const convertHeicToPngMiddleware = require("../../middlewares/converter");
const { withdrawController } = require("../../controllers");
 
const UPLOADS_FOLDER_USERS = "./public/uploads/users";

const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

const router = express.Router();


// router.post("/createCampaign",auth('brand'),
//      [uploadUsers.single("image")],
//      convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
//      campaignController.createCampaign);
 
 


router.post("/request-withdrawal", auth("influencer"), withdrawController.requestWithdrawal)
router.post("/Payment-approveWithdrawal/:requestId", auth("admin"),
    [uploadUsers.single("image")],
    convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
 withdrawController.approveWithdrawal)
router.post("/rejectWithdrawal/:requestId", auth("admin"), withdrawController.rejectWithdrawal)
router.get("/getAllWithdrawalRequests", auth("admin"), withdrawController.getAllWithdrawalRequests)
router.get("/getMyWithdrawalRequests", auth("influencer"), withdrawController.getMyWithdrawalRequests)

router.get("/my-wallet", auth("influencer"), withdrawController.getWallet)

 

module.exports = router;