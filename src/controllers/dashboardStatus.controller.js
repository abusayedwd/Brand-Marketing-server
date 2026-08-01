 
const { http } = require("winston");
const response = require("../config/response");
const { User, Wallet, Campaign } = require("../models");
const PlanSubscription = require("../models/payment.model");
const Transaction = require("../models/trancsaction.model");
const WithdrawalRequest = require("../models/withdrawal.model");
 
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const { campaignService } = require("../services");


const dashboredBar = catchAsync(async (req, res) => {
 
  // Admin stats calculation
  const campaignEarning = await Transaction.find({}, "amount");
  const campaignEarningTotal = campaignEarning.reduce((acc, cur) => acc + cur.amount, 0);
  
  const subscriptionEarning = await PlanSubscription.find({}, "price");
 const withdraw = await WithdrawalRequest.find({ status: "approved" }, "amount"); 
const withdrawPayment = withdraw.reduce((acc, cur) => acc + cur.amount, 0);

  const totalSubscriptionEarning = subscriptionEarning.reduce((acc, cur) => acc + cur.price, 0);

 const campaignAmount = campaignEarningTotal - withdrawPayment;

  const totalEarnAdmin = totalSubscriptionEarning;

  const influencersCount = await User.find({ role: "influencer", isEmailVerified: true }).countDocuments();
  const brandsCount = await User.find({ role: "brand", isEmailVerified: true }).countDocuments();
  const campaignsCount = await Campaign.find().countDocuments();

  const adminStatus = {
    totalEarnAdmin: totalEarnAdmin.toFixed(2),
    brands: brandsCount,
    influencers: influencersCount,
    campaigns: campaignsCount,
    campaignPaymentTotal: campaignEarningTotal,
    withdrawPayment: withdrawPayment,
    currentBalance:campaignAmount
  };

 

  res.status(200).json(
    response({
      status: "success",
      statusCode: 200,
      message: "Dashboard status data retrieved successfully.",
      data: adminStatus,
    })
  );
});

const brandPayment = catchAsync(async (req, res) => {
  const brandId = req.user.id;

  // Get all transactions for the specified brandId
  const payments = await Transaction.find({ brandId }, "amount");

  // If no transactions exist for this brand, return a message
  if (!payments || payments.length === 0) {
    return res.status(httpStatus.OK).json({
      message: "No payments found for this brand",
      code: httpStatus.OK,
      totalEarnings: 0,
    });
  }

  // Calculate total earnings by summing up all amounts
  const totalPayment = payments.reduce((acc, cur) => acc + cur.amount, 0);

  return res.status(httpStatus.OK).json({
    message: "Status retrieved successfully",
    code: httpStatus.OK,
     data: {totalPayment},
  });
});



const influencerStatus = catchAsync(async (req, res) => {
  const influencerId = req.user.id;

  // Check if the user is an influencer before processing wallet data
  if (req.user.role !== 'influencer') {
    throw new Error("Access denied: User is not an influencer");
  }



  // Find the wallet data for the influencer
  const wallet = await Wallet.findOne({ influencerId });
  const completedCampaignsCount = await campaignService.getCompletedCampaignsCount(influencerId);

  if (!wallet) {
    return res.status(200).json(
      response({
        status: "success",
        statusCode: 200,
        message: "Dashboard status data retrieved successfully.",
        data: {
          totalEarnings: "0.00",
          totalWithdrawals: "0.00",
          currentBalance: "0.00",
          completedCampaignsCount,
        },
      })
    );
  }

  // Separate transactions for deposits and withdrawals
  const deposits = wallet.transactions.filter(transaction => transaction.type === 'deposit');
  const withdrawals = wallet.transactions.filter(transaction => transaction.type === 'withdrawal');

  // Calculate total deposit and withdrawal amounts
  const totalEarnings = deposits.reduce((acc, cur) => acc + cur.amount, 0);
  const totalWithdrawals = withdrawals.reduce((acc, cur) => acc + cur.amount, 0);

  // Calculate current balance (balance + deposits - withdrawals)
  const currentBalance =  totalEarnings - totalWithdrawals;

  const influencer = {
    totalEarnings: totalEarnings.toFixed(2),
    totalWithdrawals: totalWithdrawals.toFixed(2),
    currentBalance: currentBalance.toFixed(2),
    completedCampaignsCount,
  }; 
  res.status(200).json(
    response({
      status: "success",
      statusCode: 200,
      message: "Dashboard status data retrieved successfully.",
      data: influencer,
    })
  );
});



const adminEarining =  catchAsync (async(  req, res) => {
  
    const admin = req.user.role;

    if (admin !== "admin") {
      return res.status(400).json(
         response({
          status: "error",
          statusCode: 400,
          message: "You are not an admin.",
        })
      );
    }

    const { year } = req.query; // Get the year from the query params
    if (!year || isNaN(year)) {
      return res.status(400).json(
       response({
          status: "error",
          statusCode: 400,
          message: "Please provide a valid year.",
        })
      );
    }

    // Define all months with initial earnings set to 0
    const allMonths = {
      Jan: 0,
      Feb: 0,
      Mar: 0,
      Apr: 0,
      May: 0,
      Jun: 0,
      Jul: 0,
      Aug: 0,
      Sep: 0,
      Oct: 0,
      Nov: 0,
      Dec: 0,
    };

    // Get all subscriptions paid in the specified year
    const earnings = await  PlanSubscription.find({ 
        status:"active",
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${parseInt(year) + 1}-01-01`),
      },
    });

    // Helper function to get month abbreviation
    const getMonthAbbreviation = (date) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames[new Date(date).getMonth()];
    };

    // Aggregate earnings by month
    earnings.forEach((transaction) => {
      const month = getMonthAbbreviation(transaction.createdAt);
      allMonths[month] += transaction.price;
    });

    // Format the response as an array of objects
    const formattedResponse = Object.keys(allMonths).map((month) => ({
      month,
      totalEarnings: allMonths[month].toFixed(2), // Format to 2 decimal places
    }));

    return res.status(200).json(
      response({
        status: "success",
        statusCode: 200,
        message: `Yearly earnings for ${year} by month`,
        data: formattedResponse,
      })
    );
  
});

const adminpaymentToInfluencerChart =  catchAsync (async(  req, res) => {
  
    const admin = req.user.role;

    if (admin !== "admin") {
      return res.status(400).json(
         response({
          status: "error",
          statusCode: 400,
          message: "You are not an admin.",
        })
      );
    }

    const { year } = req.query; // Get the year from the query params
    if (!year || isNaN(year)) {
      return res.status(400).json(
       response({
          status: "error",
          statusCode: 400,
          message: "Please provide a valid year.",
        })
      );
    }

    // Define all months with initial earnings set to 0
    const allMonths = {
      Jan: 0,
      Feb: 0,
      Mar: 0,
      Apr: 0,
      May: 0,
      Jun: 0,
      Jul: 0,
      Aug: 0,
      Sep: 0,
      Oct: 0,
      Nov: 0,
      Dec: 0,
    };

    // Get all subscriptions paid in the specified year
    const earnings = await  WithdrawalRequest.find({ 
        status:"approved",
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${parseInt(year) + 1}-01-01`),
      },
    });

    // Helper function to get month abbreviation
    const getMonthAbbreviation = (date) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames[new Date(date).getMonth()];
    };

    // Aggregate earnings by month
    earnings.forEach((transaction) => {
      const month = getMonthAbbreviation(transaction.createdAt);
      allMonths[month] += transaction.amount;
    });

    // Format the response as an array of objects
    const formattedResponse = Object.keys(allMonths).map((month) => ({
      month,
      totalEarnings: allMonths[month].toFixed(2), // Format to 2 decimal places
    }));

    return res.status(200).json(
      response({
        status: "success",
        statusCode: 200,
        message: `Yearly earnings for ${year} by month`,
        data: formattedResponse,
      })
    );
  
});

const brandEariningChart =  catchAsync (async(  req, res) => {
  
    const admin = req.user.role;

    if (admin !== "brand") {
      return res.status(400).json(
         response({
          status: "error",
          statusCode: 400,
          message: "You are not an brand.",
        })
      );
    }

    const { year } = req.query; // Get the year from the query params
    if (!year || isNaN(year)) {
      return res.status(400).json(
       response({
          status: "error",
          statusCode: 400,
          message: "Please provide a valid year.",
        })
      );
    }

    // Define all months with initial earnings set to 0
    const allMonths = {
      Jan: 0,
      Feb: 0,
      Mar: 0,
      Apr: 0,
      May: 0,
      Jun: 0,
      Jul: 0,
      Aug: 0,
      Sep: 0,
      Oct: 0,
      Nov: 0,
      Dec: 0,
    };

    // Get all subscriptions paid in the specified year
    const earnings = await  Transaction.find({ 
        paymentStatus:"completed",
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${parseInt(year) + 1}-01-01`),
      },
    });

    // Helper function to get month abbreviation
    const getMonthAbbreviation = (date) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames[new Date(date).getMonth()];
    };

    // Aggregate earnings by month
    earnings.forEach((transaction) => {
      const month = getMonthAbbreviation(transaction.createdAt);
      allMonths[month] += transaction.amount;
    });

    // Format the response as an array of objects
    const formattedResponse = Object.keys(allMonths).map((month) => ({
      month,
      totalEarnings: allMonths[month].toFixed(2), // Format to 2 decimal places
    }));

    return res.status(200).json(
      response({
        status: "success",
        statusCode: 200,
        message: `Yearly earnings for ${year} by month`,
        data: formattedResponse,
      })
    );
  
});

const influencerEarningsChart = catchAsync(async (req, res) => {
  const admin = req.user.role;
  const influencerId = req.user.id; // Get the logged-in influencer's ID

  // Ensure that the user is an influencer
  if (admin !== "influencer") {
    return res.status(400).json(
      response({
        status: "error",
        statusCode: 400,
        message: "You are not an influencer.",
      })
    );
  }

  const { year } = req.query; // Get the year from the query params
  if (!year || isNaN(year)) {
    return res.status(400).json(
      response({
        status: "error",
        statusCode: 400,
        message: "Please provide a valid year.",
      })
    );
  }

  // Define all months with initial earnings set to 0
  const allMonths = {
    Jan: 0,
    Feb: 0,
    Mar: 0,
    Apr: 0,
    May: 0,
    Jun: 0,
    Jul: 0,
    Aug: 0,
    Sep: 0,
    Oct: 0,
    Nov: 0,
    Dec: 0,
  };

  // Get all subscriptions paid in the specified year for the logged-in influencer
  const earnings = await PlanSubscription.find({
    influencerId: influencerId, // Filter by logged-in influencerId
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${parseInt(year) + 1}-01-01`),
    },
  });

  // Get all deposits for the specified influencer and year (assuming wallet data is available)
  const deposits = await Wallet.find({
    influencerId: influencerId, // Filter by logged-in influencerId
    "transactions.type": "deposit",
    "transactions.date": {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${parseInt(year) + 1}-01-01`),
    },
  });

  // Helper function to get month abbreviation
  const getMonthAbbreviation = (date) => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return monthNames[new Date(date).getMonth()];
  };

  // Aggregate earnings by month for subscriptions
  earnings.forEach((transaction) => {
    const month = getMonthAbbreviation(transaction.createdAt);
    allMonths[month] += transaction.price;
  });

  // Aggregate deposit earnings by month
  deposits.forEach((wallet) => {
    wallet.transactions.forEach((transaction) => {
      if (transaction.type === "deposit" && transaction.date) {
        const month = getMonthAbbreviation(transaction.date);
        allMonths[month] += transaction.amount; // Add deposit amount to the correct month
      }
    });
  });

  // Format the response as an array of objects
  const formattedResponse = Object.keys(allMonths).map((month) => ({
    month,
    totalEarnings: allMonths[month].toFixed(2), // Format to 2 decimal places
  }));

  return res.status(200).json(
    response({
      status: "success",
      statusCode: 200,
      message: `Yearly earnings for ${year} by month`,
      data: formattedResponse,
    })
  );
});

 



   module.exports = {
     dashboredBar,
     adminEarining,
     influencerStatus,
     influencerEarningsChart,
     brandPayment,
     brandEariningChart,
     adminpaymentToInfluencerChart
   }