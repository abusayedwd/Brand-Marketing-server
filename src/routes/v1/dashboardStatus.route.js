const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const auth = require('../../middlewares/auth'); 
const { publicStats,
    dashboredBar,
    brandEariningChart, 
    influencerStatus, 
    adminEarining, 
    influencerEarningsChart,
    brandPayment ,
    adminpaymentToInfluencerChart
   } = require('../../controllers/dashboardStatus.controller');
 

router.get("/public-stats", publicStats);
router.get("/dashbord-status", auth("admin"), dashboredBar); 
router.get("/influencer-status", auth("influencer"), influencerStatus);
router.get("/adminEarning-chart", auth("admin"), adminEarining);
router.get("/influencerEarningsChart", auth("influencer"), influencerEarningsChart);
router.get("/brandPayment", auth("brand"), brandPayment);
router.get("/brandEariningChart", auth("brand"), brandEariningChart);
router.get("/adminpaymentToInfluencerChart", auth("admin"), adminpaymentToInfluencerChart);





module.exports = router; 
