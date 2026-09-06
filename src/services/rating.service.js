const Rating = require('../models/rating.model');
const Campaign = require('../models/campaign.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const idsEqual = (a, b) => String(a?._id || a) === String(b?._id || b);

const createRating = async (payload) => {
  const { campaignId, fromUserId, toUserId, rating, review } = payload;

  if (!campaignId || !toUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Campaign and recipient are required');
  }
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
  }
  if (idsEqual(fromUserId, toUserId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot rate yourself');
  }

  const campaign = await Campaign.findById(campaignId).select(
    'brandId acceptedInfluencers status campaignName'
  );
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  const isBrand = idsEqual(campaign.brandId, fromUserId);
  const isAccepted = (campaign.acceptedInfluencers || []).some((id) => idsEqual(id, fromUserId));
  if (!isBrand && !isAccepted) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only rate after working on this campaign');
  }

  const otherIsBrand = idsEqual(campaign.brandId, toUserId);
  const otherIsAccepted = (campaign.acceptedInfluencers || []).some((id) => idsEqual(id, toUserId));
  if (!otherIsBrand && !otherIsAccepted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You can only rate the other party on this campaign');
  }

  if (!['completed', 'active'].includes(campaign.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You can rate after the campaign is active or completed');
  }

  try {
    const created = await Rating.create({
      campaignId,
      fromUserId,
      toUserId,
      rating,
      review: (review || '').trim().slice(0, 1000),
    });

    try {
      const { createNotification } = require('./notification.service');
      await createNotification({
        userId: toUserId,
        title: 'New review',
        message: `You received a ${rating}-star review on ${campaign.campaignName}.`,
        type: 'general',
        link: '/dashboard',
        meta: { campaignId, fromUserId, rating },
      });
    } catch (_) {}

    return created;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You already rated this user for this campaign');
    }
    throw err;
  }
};

const getRatingsForUser = async (userId) => {
  const ratings = await Rating.find({ toUserId: userId })
    .populate('fromUserId', 'fullName image role')
    .populate('campaignId', 'campaignName')
    .sort({ createdAt: -1 });
  const avg =
    ratings.length === 0
      ? 0
      : ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  return { average: Number(avg.toFixed(2)), count: ratings.length, ratings };
};

module.exports = { createRating, getRatingsForUser };
