const { User, Wallet, Withdrawal } = require('../models');
const { createNotification } = require('./notification.service');

const requestWithdrawal = async (influencerId, amount, bankDetails, reason) => {
  const influencer = await User.findById(influencerId);
  if (!influencer) throw new Error('Influencer not found');

  const wallet = await Wallet.findOne({ influencerId });
  if (!wallet) throw new Error('Wallet not found');

  const available = (wallet.balance || 0) - (wallet.heldBalance || 0);
  if (available < amount) {
    throw new Error('Insufficient available funds (some balance may be on hold)');
  }

  wallet.heldBalance = (wallet.heldBalance || 0) + Number(amount);
  wallet.transactions.push({
    amount: Number(amount),
    type: 'hold',
    description: 'Withdrawal request hold',
  });
  await wallet.save();

  const withdrawalRequest = new Withdrawal({
    influencerId,
    amount,
    bankDetails,
    reason,
    status: 'pending',
    isHeld: true,
  });
  await withdrawalRequest.save();

  try {
    const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } }).select('_id');
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          title: 'New withdrawal request',
          message: `${influencer.fullName || 'A creator'} requested $${amount}.`,
          type: 'withdraw',
          link: '/dashboard/withdraw-request',
          meta: { withdrawalId: withdrawalRequest._id, amount },
        })
      )
    );
  } catch (_) {}

  return withdrawalRequest;
};

const approveWithdrawal = async (requestId, approvalNote, image) => {
  const request = await Withdrawal.findById(requestId);
  if (!request) throw new Error('Withdrawal request not found');
  if (request.status !== 'pending') throw new Error('Withdrawal request already processed');

  const influencer = await User.findById(request.influencerId);
  if (!influencer) throw new Error('Influencer not found');

  const wallet = await Wallet.findOne({ influencerId: influencer._id });
  if (!wallet) throw new Error('Wallet not found');

  if (wallet.balance < request.amount) {
    throw new Error('Insufficient funds in the wallet');
  }

  wallet.balance -= request.amount;
  if (request.isHeld) {
    wallet.heldBalance = Math.max(0, (wallet.heldBalance || 0) - request.amount);
  }

  wallet.transactions.push({
    amount: request.amount,
    type: 'withdrawal',
    description: 'Withdrawal approved by admin',
  });

  request.status = 'approved';
  request.approvalNote = approvalNote;
  request.image = image;
  request.isHeld = false;

  await wallet.save();
  await request.save();

  await createNotification({
    userId: request.influencerId,
    title: 'Withdrawal approved',
    message: `Your withdrawal of $${request.amount} was approved.`,
    type: 'withdraw',
    link: '/dashboard/my-wallet',
    email: true,
  });

  return request;
};

const rejectWithdrawal = async (requestId, rejectionReason = '') => {
  const request = await Withdrawal.findById(requestId);
  if (!request) throw new Error('Withdrawal request not found');
  if (request.status !== 'pending') throw new Error('Withdrawal request already processed');

  const wallet = await Wallet.findOne({ influencerId: request.influencerId });
  if (wallet && request.isHeld) {
    wallet.heldBalance = Math.max(0, (wallet.heldBalance || 0) - request.amount);
    wallet.transactions.push({
      amount: request.amount,
      type: 'hold_release',
      description: 'Withdrawal rejected — hold released',
    });
    await wallet.save();
  }

  request.status = 'rejected';
  request.rejectionReason = rejectionReason;
  request.isHeld = false;
  await request.save();

  await createNotification({
    userId: request.influencerId,
    title: 'Withdrawal rejected',
    message: rejectionReason || `Your withdrawal of $${request.amount} was rejected.`,
    type: 'withdraw',
    link: '/dashboard/my-wallet',
    email: true,
  });

  return request;
};

const getAllWithdrawalRequests = async (filter, options) => {
  const query = {};
  for (const key of Object.keys(filter)) {
    if (filter[key] !== '') {
      if (key === 'status') {
        query[key] = { $regex: new RegExp(filter[key], 'i') };
      } else {
        query[key] = filter[key];
      }
    }
  }

  return Withdrawal.paginate(query, {
    ...options,
    populate: 'influencerId',
  });
};

const getMyWithdrawalRequests = async (filter, options) => {
  const query = {};
  for (const key of Object.keys(filter)) {
    if (filter[key] !== '') {
      query[key] = filter[key];
    }
  }

  return Withdrawal.paginate(query, {
    ...options,
    populate: 'influencerId',
  });
};

const getWithdrawById = async (requestId) => {
  const request = await Withdrawal.findById(requestId).populate(
    'influencerId',
    'fullName email'
  );
  if (!request) throw new Error('Withdrawal request not found');
  return request;
};

module.exports = {
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getAllWithdrawalRequests,
  getWithdrawById,
  getMyWithdrawalRequests,
};
