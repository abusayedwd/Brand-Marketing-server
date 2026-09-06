const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const response = require('../config/response');
const chatService = require('../services/chat.service');

const createChat = catchAsync(async (req, res) => {
  const otherUserId = req.body.receiver || req.body.participantId || req.body.userId;
  const data = await chatService.createOrGetChat(req.user.id, otherUserId);
  res.status(httpStatus.OK).json(response({ message: 'Chat ready', statusCode: httpStatus.OK, data }));
});

const getChatList = catchAsync(async (req, res) => {
  const data = await chatService.getChatList(req.user.id);
  res.status(httpStatus.OK).json(response({ message: 'Chat list', statusCode: httpStatus.OK, data }));
});

const getMessages = catchAsync(async (req, res) => {
  const data = await chatService.getMessages(req.user.id, req.params.chatId);
  res.status(httpStatus.OK).json(response({ message: 'Messages', statusCode: httpStatus.OK, data }));
});

const sendMessage = catchAsync(async (req, res) => {
  const data = await chatService.sendMessage(req.user.id, req.body);
  res.status(httpStatus.CREATED).json(
    response({ message: 'Message sent', statusCode: httpStatus.CREATED, data })
  );
});

module.exports = { createChat, getChatList, getMessages, sendMessage };
