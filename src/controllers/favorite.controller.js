const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const favoriteService = require('../services/favorite.service');

const toggleFavorite = catchAsync(async (req, res) => {
  const data = await favoriteService.toggleFavorite(req.user.id, req.params.influencerId);
  res.status(httpStatus.OK).json(
    response({ message: 'Favorite updated', statusCode: httpStatus.OK, data })
  );
});

const listFavorites = catchAsync(async (req, res) => {
  const data = await favoriteService.listFavorites(req.user.id);
  res.status(httpStatus.OK).json(
    response({ message: 'Favorites', statusCode: httpStatus.OK, data })
  );
});

const favoriteStatus = catchAsync(async (req, res) => {
  const data = await favoriteService.isFavorited(req.user.id, req.params.influencerId);
  res.status(httpStatus.OK).json(
    response({ message: 'Favorite status', statusCode: httpStatus.OK, data })
  );
});

module.exports = { toggleFavorite, listFavorites, favoriteStatus };
