const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const { subscriptionController } = require('../../controllers');
const transactionController = require("../../controllers/transaction.controller");
const { dashboredBar, influencerStatus } = require('../../controllers/dashboardStatus.controller');

// Stripe webhooks are registered in app.js before the JSON body parser

router.get("/dashbord-status", auth("common"), dashboredBar);

router.get("/influencer-status", auth("common"), influencerStatus);

router.get("/getAllSubscriptions", auth("common"),subscriptionController.getAllSubscriptions);

router.get('/getSubscription/:id', auth('common'), subscriptionController.getSubscriptionById);

router.get("/getMySubscription", auth("common"),subscriptionController.getMySubscriptions);

// Other routes for payment, such as creating a plan payment
router.post('/pay',auth('common'), subscriptionController.createPlanPayment);

router.post('/verifySubscription', auth('common'), subscriptionController.verifySubscriptionPayment);



//Transaction Route heare,
router.get('/get-transactions',auth("common"), transactionController.getAllTransactions);

router.get('/getMyTransactions',auth("common"), transactionController.getMyTransactions);

// Get transaction by ID
router.get('/transaction/:id',auth("common"), transactionController.getTransactionById);

 
router.get('/getTransactionById/:id',auth("common"), transactionController.getTransactionById);

router.delete('/deleteTransaction/:id',auth("common"), transactionController.deleteTransaction);



module.exports = router; 
