const Favorite = require('../models/favorite.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const toggleFavorite = async (brandId, influencerId) => {
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
