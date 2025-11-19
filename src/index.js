 

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
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
      // Add these for better serverless performance
      minPoolSize: 0,
      heartbeatFrequencyMS: 30000,
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

  module.exports = async (req, res) => {
    try {
      console.log(`${req.method} ${req.url} - Starting serverless request`);

      // Set CORS headers for all requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle OPTIONS requests for CORS preflight
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Quick health check without DB connection
      if (req.url === '/' || req.url === '/health') {
        console.log('Health check endpoint - skipping DB connection');
        const serverless = require("serverless-http");
        const handler = serverless(app);
        return await handler(req, res);
      }

      // Connect to database with timeout
      console.log('Connecting to database...');
      const dbTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 8000)
      );
      await Promise.race([connectToDatabase(), dbTimeout]);
      console.log('Database connected successfully');

      // Import serverless-http here to avoid issues
      const serverless = require("serverless-http");
      const handler = serverless(app, {
        request: function(request, event, context) {
          // Add any request modifications here
          request.context = context;
          request.event = event;
        },
        response: function(response, event, context) {
          // Add any response modifications here
        }
      });

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
          method: req.method
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