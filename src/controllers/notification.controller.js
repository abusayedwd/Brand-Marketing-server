const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const notificationService = require('../services/notification.service');

const getMyNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type', 'isRead']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (filter.isRead !== undefined) filter.isRead = filter.isRead === 'true';
  const data = await notificationService.getMyNotifications(req.user.id, filter, options);
  res.status(httpStatus.OK).json(
    response({ message: 'Notifications', statusCode: httpStatus.OK, data })
  );
});

const unreadCount = catchAsync(async (req, res) => {
  const data = await notificationService.unreadCount(req.user.id);
  res.status(httpStatus.OK).json(
    response({ message: 'Unread count', statusCode: httpStatus.OK, data })
  );
});

const markAsRead = catchAsync(async (req, res) => {
  const data = await notificationService.markAsRead(req.user.id, req.params.id);
  res.status(httpStatus.OK).json(
    response({ message: 'Marked as read', statusCode: httpStatus.OK, data })
  );
});

const markAllAsRead = catchAsync(async (req, res) => {
  const data = await notificationService.markAllAsRead(req.user.id);
  res.status(httpStatus.OK).json(
    response({ message: 'All marked as read', statusCode: httpStatus.OK, data })
  );
});

module.exports = { getMyNotifications, unreadCount, markAsRead, markAllAsRead };
