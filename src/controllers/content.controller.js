const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const contentService = require('../services/content.service');

const getAll = catchAsync(async (req, res) => {
  const data = await contentService.getAll();
  res.status(httpStatus.OK).json(
    response({ message: 'Content pages', statusCode: httpStatus.OK, data })
  );
});

const getByKey = catchAsync(async (req, res) => {
  const data = await contentService.getByKey(req.params.key);
  res.status(httpStatus.OK).json(
    response({ message: 'Content page', statusCode: httpStatus.OK, data })
  );
});

const upsert = catchAsync(async (req, res) => {
  const data = await contentService.upsert(req.params.key, req.body, req.user.id);
  res.status(httpStatus.OK).json(
    response({ message: 'Content updated', statusCode: httpStatus.OK, data })
  );
});

module.exports = { getAll, getByKey, upsert };
