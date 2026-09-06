const httpStatus = require('http-status');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const socketIO = require('../utils/socketIO');

const participantSelect = 'fullName userName image role';

const findChatBetween = async (userA, userB) =>
  Chat.findOne({
    participants: { $all: [userA, userB], $size: 2 },
  });

const createOrGetChat = async (userId, otherUserId) => {
  if (!otherUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Participant is required');
  }
  if (String(userId) === String(otherUserId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot start a chat with yourself');
  }

  const otherUser = await User.findById(otherUserId).select('_id');
  if (!otherUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  let chat = await findChatBetween(userId, otherUserId);
  if (!chat) {
    chat = await Chat.create({ participants: [userId, otherUserId] });
  }

  return Chat.findById(chat._id).populate('participants', participantSelect);
};

const getChatList = async (userId) => {
  const chats = await Chat.find({ participants: userId })
    .populate('participants', participantSelect)
    .sort({ lastMessageAt: -1, updatedAt: -1 });
  return chats;
};

const getMessages = async (userId, chatId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat not found');
  }
  if (!chat.participants.some((id) => String(id) === String(userId))) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not in this chat');
  }

  return Message.find({ chatId })
    .populate('sender', participantSelect)
    .populate('receiver', participantSelect)
    .sort({ createdAt: 1 });
};

const sendMessage = async (userId, { receiver, text, chatId }) => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message text is required');
  }

  let chat;
  let receiverId = receiver;

  if (chatId) {
    chat = await Chat.findById(chatId);
    if (!chat) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Chat not found');
    }
    if (!chat.participants.some((id) => String(id) === String(userId))) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not in this chat');
    }
    receiverId =
      receiverId ||
      chat.participants.find((id) => String(id) !== String(userId));
  } else {
    if (!receiverId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Receiver is required');
    }
    chat = await findChatBetween(userId, receiverId);
    if (!chat) {
      chat = await Chat.create({ participants: [userId, receiverId] });
    }
  }

  const message = await Message.create({
    chatId: chat._id,
    sender: userId,
    receiver: receiverId,
    text: trimmed,
  });

  chat.lastMessage = trimmed;
  chat.lastMessageAt = new Date();
  await chat.save();

  const populated = await Message.findById(message._id)
    .populate('sender', participantSelect)
    .populate('receiver', participantSelect);

  const payload = populated.toJSON();
  payload._id = payload.id;
  payload.chatId = String(chat._id);

  if (typeof socketIO.emitToChat === 'function') {
    socketIO.emitToChat(chat._id, `messages::${chat._id}`, payload);
  }
  if (typeof socketIO.emitToUser === 'function') {
    socketIO.emitToUser(String(receiverId), 'message:new', payload);
  }

  try {
    const { createNotification } = require('./notification.service');
    const sender = await User.findById(userId).select('fullName userName');
    const name = sender?.fullName || sender?.userName || 'Someone';
    await createNotification({
      userId: receiverId,
      title: 'New message',
      message: `${name}: ${trimmed.slice(0, 80)}`,
      type: 'message',
      link: `/dashboard/messages?chatId=${chat._id}`,
      meta: { chatId: String(chat._id), senderId: String(userId) },
    });
  } catch (_) {}

  return populated;
};

module.exports = {
  createOrGetChat,
  getChatList,
  getMessages,
  sendMessage,
};
