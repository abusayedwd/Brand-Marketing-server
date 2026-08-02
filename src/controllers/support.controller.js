const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const supportService = require('../services/support.service');

const optionalUserId = (req) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded?.sub || decoded?.id || null;
  } catch (_) {
    return null;
  }
};

const createTicket = catchAsync(async (req, res) => {
  const { name, email, topic, message } = req.body;
  if (!name || !email || !message) {
    return res.status(httpStatus.BAD_REQUEST).json(
      response({
        message: 'Name, email and message are required',
        statusCode: httpStatus.BAD_REQUEST,
      })
    );
  }

  const userId = optionalUserId(req);
  const data = await supportService.createTicket(
    { name, email, topic, message },
    userId
  );

  res.status(httpStatus.CREATED).json(
    response({
      message: 'Support request submitted successfully',
      statusCode: httpStatus.CREATED,
      data,
    })
  );
});

const listTickets = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status', 'topic', 'email']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const data = await supportService.listTickets(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: 'Support tickets',
      statusCode: httpStatus.OK,
      data,
    })
  );
});

const getTicket = catchAsync(async (req, res) => {
  const data = await supportService.getTicketById(req.params.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Support ticket',
      statusCode: httpStatus.OK,
      data,
    })
  );
});

const updateTicket = catchAsync(async (req, res) => {
  const data = await supportService.updateTicket(
    req.params.id,
    pick(req.body, ['status', 'adminReply']),
    req.user.id
  );
  res.status(httpStatus.OK).json(
    response({
      message: 'Support ticket updated',
      statusCode: httpStatus.OK,
      data,
    })
  );
});

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
};
