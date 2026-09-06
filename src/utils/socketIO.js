const logger = require("../config/logger");

const socketIO = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // User-scoped room for real-time notifications
    socket.on("join-user", (userId, callback) => {
      if (!userId) {
        if (typeof callback === "function") callback("userId required");
        return;
      }
      const room = `user:${userId}`;
      socket.join(room);
      if (typeof callback === "function") callback("ok");
    });

    socket.on("user_connected", (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on("join_chat", (chatId, callback) => {
      if (chatId) {
        socket.join(`chat:${chatId}`);
        if (typeof callback === "function") callback("ok");
      }
    });

    socket.on("send_message", (data) => {
      const chatId = data?.chatId;
      if (chatId && data?.message) {
        io.to(`chat:${chatId}`).emit(`messages::${chatId}`, data.message);
      }
    });

    // Chat rooms (legacy)
    socket.on("join-room", (data, callback) => {
      if (data?.roomId) {
        socket.join("room" + data.roomId);
        if (typeof callback === "function") callback("Join room successful");
      } else if (typeof callback === "function") {
        callback("Must provide a valid user id");
      }
    });

    socket.on("leave-room", (data) => {
      if (data?.roomId) {
        socket.leave("room" + data.roomId);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

/** Emit a notification event to a specific user room */
const emitToUser = (userId, event, payload) => {
  try {
    if (global.io && userId) {
      global.io.to(`user:${userId}`).emit(event, payload);
    }
  } catch (err) {
    logger.warn(`Socket emit failed: ${err.message}`);
  }
};

const emitToChat = (chatId, event, payload) => {
  try {
    if (global.io && chatId) {
      global.io.to(`chat:${chatId}`).emit(event, payload);
    }
  } catch (err) {
    logger.warn(`Socket chat emit failed: ${err.message}`);
  }
};

module.exports = socketIO;
module.exports.emitToUser = emitToUser;
module.exports.emitToChat = emitToChat;
