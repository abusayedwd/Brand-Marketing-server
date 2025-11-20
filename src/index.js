 

// const mongoose = require("mongoose");
// const config = require("./config/config");
// const logger = require("./config/logger");
// const app = require("./app");

// let server;

// if (process.env.VERCEL) {
//   // === Vercel serverless mode ===
//   const serverless = require("serverless-http"); 
//   let isConnected = false;

//   async function connectToDatabase() {
//     if (isConnected) return;
//     await mongoose.connect(config.mongoose.url, config.mongoose.options);
//     isConnected = true;
//     logger.info("Connected to MongoDB Atlas");
//   }

// module.exports = async (req, res) => { 
//   try {
//     console.log('Serverless function called:', req.url); 
//     await connectToDatabase();
//     const handler = serverless(app);
//     return handler(req, res);
//   } catch (error) {
//     console.error('Serverless error:', error);
//     return res.status(500).json({ error: 'Internal Server Errorrr' });
//   }
// };

// } else {
//   // === Local development mode ===
//   const myIp = process.env.BACKEND_IP;

//   mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
//     logger.info("Connected to MongoDB Atlas");

//     server = app.listen(config.port, myIp, () => {
//       logger.info(`Listening on http://${myIp}:${config.port}`);
//     });

//     // Socket.IO for local dev
//     const socketIo = require("socket.io");
//     const socketIO = require("./utils/socketIO");
//     const io = socketIo(server, {
//       cors: { origin: "*" },
//     });
//     socketIO(io);
//     global.io = io;
//   });

//   const exitHandler = () => {
//     if (server) {
//       server.close(() => {
//         logger.info("Server closed");
//         process.exit(1);
//       });
//     } else {
//       process.exit(1);
//     }
//   };

//   const unexpectedErrorHandler = (error) => {
//     logger.error(error);
//     exitHandler();
//   };

//   process.on("uncaughtException", unexpectedErrorHandler);
//   process.on("unhandledRejection", unexpectedErrorHandler);

//   process.on("SIGTERM", () => {
//     logger.info("SIGTERM received");
//     if (server) {
//       server.close();
//     }
//   });
// }



const mongoose = require("mongoose");
const config = require("./config/config");
const logger = require("./config/logger");
const app = require("./app");

let server;
let cachedDb = null;

// Database connection function for serverless
async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log("Using cached database connection");
    return cachedDb;
  }

  try {
    console.log("Creating new database connection...");
    
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 1, // Keep connection pool minimal for serverless
      serverSelectionTimeoutMS: 5000, // 5 seconds for Vercel free tier
      socketTimeoutMS: 45000, // 45 seconds for socket operations
      connectTimeoutMS: 5000, // 5 seconds for connection
      maxIdleTimeMS: 60000, // 60 seconds idle time
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

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  // === Vercel serverless mode ===

  // Create serverless handler once, outside the request handler
  const serverless = require("serverless-http");
  const handler = serverless(app);

  module.exports = async (req, res) => {
    try {
      console.log(`${req.method} ${req.url} - Starting serverless request`);

      // Connect to database for ALL requests (except special endpoints)
      // This ensures DB is ready before Express handles any /v1/* routes
      const skipDBRoutes = ['/', '/health', '/test', '/diagnostic', '/test-db', '/favicon.ico'];
      const needsDatabase = !skipDBRoutes.includes(req.url) && !req.url.includes('/favicon');

      if (needsDatabase) {
        // Check if required environment variables are set
        if (!process.env.MONGODB_URL) {
          console.error('MONGODB_URL is not set!');
          return res.status(500).json({
            error: 'Configuration Error',
            message: 'Database connection string is not configured.',
            timestamp: new Date().toISOString()
          });
        }

        // Connect to database
        console.log('Connecting to database for', req.url);
        try {
          const dbTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          );
          await Promise.race([connectToDatabase(), dbTimeout]);
          console.log('Database connected for', req.url);
        } catch (dbError) {
          console.error('Database connection error:', dbError.message);
          return res.status(500).json({
            error: 'Database Connection Failed',
            message: dbError.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Pass ALL requests to Express via serverless-http
      // Express will handle routing, including /, /health, /test, /v1/*, etc.
      console.log('Passing to Express:', req.method, req.url);
      return await handler(req, res);

    } catch (error) {
      console.error("Serverless handler error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          url: req.url,
          method: req.method,
          env_check: {
            has_mongodb_url: !!process.env.MONGODB_URL,
            mongodb_url_preview: process.env.MONGODB_URL ? process.env.MONGODB_URL.substring(0, 30) + '...' : 'NOT SET'
          }
        });
      }
    }
  };

} else {
  // === Local development mode ===
  const myIp = process.env.BACKEND_IP || '0.0.0.0';
  const port = config.port || 3050;

  // Connect to MongoDB for local development
  mongoose.connect(config.mongoose.url, config.mongoose.options || {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    logger.info("Connected to MongoDB Atlas");

    server = app.listen(port, myIp, () => {
      logger.info(`Listening on http://${myIp}:${port}`);
    });

    // Socket.IO setup for local development only
    try {
      const socketIo = require("socket.io");
      const socketIO = require("./utils/socketIO");
      const io = socketIo(server, {
        cors: { 
          origin: "*",
          methods: ["GET", "POST"]
        },
      });
      socketIO(io);
      global.io = io;
      logger.info("Socket.IO initialized");
    } catch (error) {
      logger.warn("Socket.IO setup failed:", error.message);
    }
  }).catch((error) => {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  });

  // Graceful shutdown handlers
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
    if (server) {
      server.close();
    }
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received");
    if (server) {
      server.close();
    }
  });
}