const Notification = require('../models/notification.model');
const { User } = require('../models');
const { sendEmail } = require('./email.service');

const createNotification = async ({
  userId,
  title,
  message,
  type = 'general',
  link = '',
  meta = {},
  email = false,
}) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    link,
    meta,
  });

  if (email) {
    try {
      const user = await User.findById(userId).select('email fullName');
      if (user?.email) {
        await sendEmail(
          user.email,
          title,
          `<div style="font-family:Arial,sans-serif;padding:16px">
            <h2>${title}</h2>
            <p>${message}</p>
            ${link ? `<p><a href="${link}">Open in app</a></p>` : ''}
          </div>`
        );
      }
    } catch (err) {
      console.warn('Notification email failed:', err.message);
    }
  }

  return notification;
};

const getMyNotifications = async (userId, filter = {}, options = {}) => {
  const query = { userId, ...filter };
  return Notification.paginate(query, {
    ...options,
    sortBy: options.sortBy || 'createdAt:desc',
  });
};

const markAsRead = async (userId, notificationId) => {
  const item = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
  return item;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return { success: true };
};

const unreadCount = async (userId) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return { count };
};

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  unreadCount,
};
