const mongoose = require("mongoose");
const config = require("./config/config");
const logger = require("./config/logger");
const app = require("./app");

let server;

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || config.port || 3050;

mongoose
  .connect(
    config.mongoose.url,
    config.mongoose.options || {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    logger.info("Connected to MongoDB Atlas");

    server = app.listen(port, host, () => {
      logger.info(`Listening on http://localhost:${port}`);
    });

    try {
      const socketIo = require("socket.io");
      const socketIO = require("./utils/socketIO");
      const io = socketIo(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
      });
      socketIO(io);
      global.io = io;
      logger.info("Socket.IO initialized");
    } catch (error) {
      logger.warn("Socket.IO setup failed:", error.message);
    }
  })
  .catch((error) => {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      mongoose.connection.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error("Unexpected error:", error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) server.close();
});
process.on("SIGINT", () => {
  logger.info("SIGINT received");
  if (server) server.close();
});
