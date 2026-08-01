const mongoose = require("mongoose");
const config = require("./config/config");
const logger = require("./config/logger");
const app = require("./app");

let server;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log("Using cached database connection");
    return cachedDb;
  }

  try {
    console.log("Creating new database connection...");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 5000,
      maxIdleTimeMS: 60000,
      minPoolSize: 0,
      heartbeatFrequencyMS: 30000,
      retryWrites: true,
      retryReads: true,
    };

    const db = await mongoose.connect(config.mongoose.url, opts);
    cachedDb = db;
    console.log("Connected to MongoDB Atlas successfully");
    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    cachedDb = null;
    throw error;
  }
}

if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  module.exports = async (req, res) => {
    try {
      console.log(`${req.method} ${req.url} - Starting`);

      if (req.url.startsWith("/v1/")) {
        if (!process.env.MONGODB_URL) {
          return res.status(500).json({ error: "MONGODB_URL not configured" });
        }

        console.log("Connecting to DB for", req.url);
        try {
          const dbTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("DB timeout")), 5000)
          );
          await Promise.race([connectToDatabase(), dbTimeout]);
          console.log("DB connected");
        } catch (dbError) {
          console.error("DB error:", dbError.message);
          return res.status(500).json({
            error: "Database connection failed",
            message: dbError.message,
          });
        }
      }

      const serverless = require("serverless-http");
      const handler = serverless(app);
      console.log("Passing to Express:", req.method, req.url);
      return await handler(req, res);
    } catch (error) {
      console.error("Error:", error.message);

      if (!res.headersSent) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          url: req.url,
          method: req.method,
          env_check: {
            has_mongodb_url: !!process.env.MONGODB_URL,
            mongodb_url_preview: process.env.MONGODB_URL
              ? process.env.MONGODB_URL.substring(0, 30) + "..."
              : "NOT SET",
          },
        });
      }
    }
  };
} else {
  const myIp = process.env.BACKEND_IP || "0.0.0.0";
  const port = config.port || 3050;

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

      server = app.listen(port, myIp, () => {
        logger.info(`Listening on http://${myIp}:${port}`);
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
}
