 


const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const userValidation = require("../../validations/user.validation");
 
const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const convertHeicToPngMiddleware = require("../../middlewares/converter");
const cloudinaryUpload = require("../../middlewares/cloudinaryUpload");
const { withdrawController } = require("../../controllers");

const uploadUsers = userFileUploadMiddleware();

const router = express.Router();

router.post("/request-withdrawal", auth("influencer"), withdrawController.requestWithdrawal)
router.post("/Payment-approveWithdrawal/:requestId", auth("admin"),
    uploadUsers.single("image"),
    convertHeicToPngMiddleware(),
    cloudinaryUpload("brivio/withdrawals"),
    withdrawController.approveWithdrawal)
router.post("/rejectWithdrawal/:requestId", auth("admin"), withdrawController.rejectWithdrawal)
router.get("/getAllWithdrawalRequests", auth("admin"), withdrawController.getAllWithdrawalRequests)
router.get("/getMyWithdrawalRequests", auth("influencer"), withdrawController.getMyWithdrawalRequests)

router.get("/my-wallet", auth("influencer"), withdrawController.getWallet)

 

module.exports = router;