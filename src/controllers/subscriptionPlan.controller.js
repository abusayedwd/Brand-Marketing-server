const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const planService = require('../services/subscriptionPlan.service');

const listPublic = catchAsync(async (req, res) => {
  await planService.seedDefaultsIfEmpty();
  const data = await planService.listPublic(req.query.role);
  res.status(httpStatus.OK).json(
    response({ message: 'Subscription plans', statusCode: httpStatus.OK, data })
  );
});

const listAll = catchAsync(async (req, res) => {
  await planService.seedDefaultsIfEmpty();
  const data = await planService.listAll();
  res.status(httpStatus.OK).json(
    response({ message: 'All plans', statusCode: httpStatus.OK, data })
  );
});

const createPlan = catchAsync(async (req, res) => {
  const data = await planService.createPlan(req.body);
  res.status(httpStatus.CREATED).json(
    response({ message: 'Plan created', statusCode: httpStatus.CREATED, data })
  );
});

const updatePlan = catchAsync(async (req, res) => {
  const data = await planService.updatePlan(req.params.id, req.body);
  res.status(httpStatus.OK).json(
    response({ message: 'Plan updated', statusCode: httpStatus.OK, data })
  );
});

const deletePlan = catchAsync(async (req, res) => {
  const data = await planService.deletePlan(req.params.id);
  res.status(httpStatus.OK).json(
    response({ message: 'Plan deleted', statusCode: httpStatus.OK, data })
  );
});

module.exports = { listPublic, listAll, createPlan, updatePlan, deletePlan };
