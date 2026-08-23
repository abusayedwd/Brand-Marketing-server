const httpStatus = require('http-status');
const response = require('../config/response');
const {withdrawalService} = require('../services'); // Adjust path as needed
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const { Wallet } = require('../models');
const ApiError = require('../utils/ApiError');

// Request Withdrawal (Influencer)
const requestWithdrawal = catchAsync(async (req, res) => {
   
    const  influencerId  = req.user.id;
    const { amount, bankDetails, reason } = req.body;

    // Validate the input (amount, bank details, and reason can be optional or required based on your use case)
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Call the service to handle the withdrawal request
    const withdrawalRequest = await withdrawalService.requestWithdrawal(
      influencerId, 
      amount, 
      bankDetails, 
      reason
    );

    res.status(200).json({
      message: "Withdrawal request submitted successfully",
      code: 200,
      withdrawalRequest
    });

 
});


// Admin Approves Withdrawal
const approveWithdrawal = catchAsync(async (req, res) => { 
    const { requestId } = req.params; // Withdrawal request ID to approve
    const { approvalNote } = req.body; // Note for the approval
  const { applyUploadedImage } = require('../utils/uploadToCloudinary');
  const image = applyUploadedImage(req);
    if (!image) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Call the service to approve the withdrawal with the image and note
    const withdrawalRequest = await withdrawalService.approveWithdrawal(requestId, approvalNote, image);

    res.status(httpStatus.OK).json(
      response({
      message: 'Withdrawal request approved successfully',
      code: httpStatus.OK,
      data: withdrawalRequest,
    })
  );
  
});


// Get All Withdrawal Requests (for Admin)
const getAllWithdrawalRequests = catchAsync(async (req, res) => { 

  const filter = pick(req.query, ['fullName', 'bankName', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const withdrawalRequests = await withdrawalService.getAllWithdrawalRequests(filter,options);
     res.status(httpStatus.OK).json(
    response({
      message: 'get all withdraw request',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: withdrawalRequests,
    })
  );
 
});


const getMyWithdrawalRequests = catchAsync(async (req, res) => {
  // Get the userId from the authenticated user (assuming it's added to req.user)
  const userId = req.user.id; // Or req.user.id, depending on your auth setup

  const filter = pick(req.query, ['bankName', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Add userId to filter to fetch only requests for this specific user
  filter.influencerId = userId;

  const withdrawalRequests = await withdrawalService.getMyWithdrawalRequests (filter, options);
  
  res.status(httpStatus.OK).json(
    response({
      message: 'Fetched withdrawal requests for the user',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: withdrawalRequests,
    })
  );
});


// Get Withdrawal Request by ID (for Admin)
const getWithdrawById = async (req, res) => {
  try {
    const { requestId } = req.params;  // Withdrawal request ID
    const withdrawalRequest = await withdrawalService.getWithdrawById(requestId);

    if (!withdrawalRequest) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    res.status(200).json({
      message: "Withdrawal request fetched successfully",
      withdrawalRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




const getWallet = catchAsync(async (req, res) => {
  const influencerId = req.user.id;

  const wallet = await Wallet.findOne({ influencerId: influencerId });
  
  if (!wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, "Wallet not found");
  }

  // Sort transactions by date in descending order
  wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const payload = wallet.toJSON ? wallet.toJSON() : wallet;
  payload.availableBalance = Math.max(
    0,
    (wallet.balance || 0) - (wallet.heldBalance || 0)
  );

  res.status(httpStatus.OK).json(
    response({
      message: "Wallet get successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: payload,
    })
  );
});


const rejectWithdrawal = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const { rejectionReason } = req.body;
  const withdrawalRequest = await withdrawalService.rejectWithdrawal(
    requestId,
    rejectionReason
  );
  res.status(httpStatus.OK).json(
    response({
      message: 'Withdrawal request rejected',
      statusCode: httpStatus.OK,
      data: withdrawalRequest,
    })
  );
});

module.exports = { 
    requestWithdrawal, 
    approveWithdrawal,
    rejectWithdrawal,
    getAllWithdrawalRequests ,
    getWithdrawById,
    getWallet,
    getMyWithdrawalRequests 
};
