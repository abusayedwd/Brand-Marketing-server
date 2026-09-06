const Favorite = require('../models/favorite.model');
const { User } = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const toggleFavorite = async (brandId, influencerId) => {
  const influencer = await User.findById(influencerId).select('role');
  if (!influencer || !['influencer', 'content creator'].includes(influencer.role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You can only save a creator');
  }
  const existing = await Favorite.findOne({ brandId, influencerId });
  if (existing) {
    await existing.deleteOne();
    return { favorited: false };
  }
  await Favorite.create({ brandId, influencerId });
  return { favorited: true };
};

const listFavorites = async (brandId) => {
  return Favorite.find({ brandId }).populate(
    'influencerId',
    'fullName userName image bio interests socialMedia role'
  );
};

const isFavorited = async (brandId, influencerId) => {
  const item = await Favorite.findOne({ brandId, influencerId });
  return { favorited: !!item };
};

module.exports = { toggleFavorite, listFavorites, isFavorited };
