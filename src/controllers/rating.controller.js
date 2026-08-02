const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const ratingService = require('../services/rating.service');

const createRating = catchAsync(async (req, res) => {
  const data = await ratingService.createRating({
    ...req.body,
    fromUserId: req.user.id,
  });
  res.status(httpStatus.CREATED).json(
    response({ message: 'Rating submitted', statusCode: httpStatus.CREATED, data })
  );
});

const getRatingsForUser = catchAsync(async (req, res) => {
  const data = await ratingService.getRatingsForUser(req.params.userId);
  res.status(httpStatus.OK).json(
    response({ message: 'Ratings', statusCode: httpStatus.OK, data })
  );
});

module.exports = { createRating, getRatingsForUser };
