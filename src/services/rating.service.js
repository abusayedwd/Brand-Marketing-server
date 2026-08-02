const Rating = require('../models/rating.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const createRating = async (payload) => {
  try {
    return await Rating.create(payload);
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
