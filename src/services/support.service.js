const SupportTicket = require('../models/supportTicket.model');
const { User } = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('./notification.service');
const { sendEmail } = require('./email.service');

const createTicket = async (payload, userId = null) => {
  const ticket = await SupportTicket.create({
    name: payload.name,
    email: payload.email,
    topic: payload.topic || 'Other',
    message: payload.message,
    userId: userId || null,
  });

  // Notify all admins in-app
  try {
    const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } }).select('_id email');
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          title: 'New support ticket',
          message: `${payload.name} · ${payload.topic}: ${payload.message.slice(0, 120)}`,
          type: 'support',
          link: '/dashboard/support',
          email: false,
        })
      )
    );

    // Optional email to first admin / configured inbox
    if (admins[0]?.email) {
      await sendEmail(
        admins[0].email,
        `[Support] ${payload.topic} — ${payload.name}`,
        `<div style="font-family:Arial,sans-serif;padding:16px">
          <h2>New support request</h2>
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Topic:</strong> ${payload.topic}</p>
          <p><strong>Message:</strong></p>
          <p>${payload.message}</p>
        </div>`
      );
    }
  } catch (err) {
    console.warn('Support notify failed:', err.message);
  }

  return ticket;
};

const listTickets = async (filter = {}, options = {}) => {
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.topic) query.topic = filter.topic;
  if (filter.email) query.email = { $regex: filter.email, $options: 'i' };

  return SupportTicket.paginate(query, {
    ...options,
    sortBy: options.sortBy || 'createdAt:desc',
    populate: 'userId,repliedBy',
  });
};

const getTicketById = async (id) => {
  const ticket = await SupportTicket.findById(id).populate('userId', 'fullName email role').populate('repliedBy', 'fullName email');
  if (!ticket) throw new ApiError(httpStatus.NOT_FOUND, 'Support ticket not found');
  return ticket;
};

const updateTicket = async (id, { status, adminReply }, adminId) => {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) throw new ApiError(httpStatus.NOT_FOUND, 'Support ticket not found');

  if (status) ticket.status = status;
  if (adminReply !== undefined && adminReply !== '') {
    ticket.adminReply = adminReply;
    ticket.repliedBy = adminId;
    ticket.repliedAt = new Date();
    if (!status) ticket.status = 'in_progress';

    try {
      await sendEmail(
        ticket.email,
        `Re: Your Brivio support request (${ticket.topic})`,
        `<div style="font-family:Arial,sans-serif;padding:16px">
          <h2>Support reply</h2>
          <p>Hi ${ticket.name},</p>
          <p>${adminReply}</p>
          <hr/>
          <p style="color:#64748b;font-size:12px">Original message:<br/>${ticket.message}</p>
        </div>`
      );
    } catch (err) {
      console.warn('Support reply email failed:', err.message);
    }

    if (ticket.userId) {
      try {
        await createNotification({
          userId: ticket.userId,
          title: 'Support reply',
          message: adminReply.slice(0, 160),
          type: 'support',
          link: '/support',
          email: false,
        });
      } catch (_) {}
    }
  }

  await ticket.save();
  return ticket;
};

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  updateTicket,
};
