import cors from "cors";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config.js";
import leadsRouter from "./routes/leads.js";
import widgetConfigRouter from "./routes/widgetConfig.js";
import eventsRouter from "./routes/events.js";
import chatSessionsRouter from "./routes/chatSessions.js";
import chatRouter from "./routes/chat.js";
import usersRouter from "./routes/users.js";

function expandAllowedOrigins(origins) {
  const expanded = new Set(origins);

  origins.forEach((origin) => {
    try {
      const url = new URL(origin);

      if (!url.protocol || !url.hostname) {
        return;
      }

      const portSegment = url.port ? `:${url.port}` : "";

      if (url.hostname === "localhost") {
        expanded.add(`${url.protocol}//127.0.0.1${portSegment}`);
      }

      if (url.hostname === "127.0.0.1") {
        expanded.add(`${url.protocol}//localhost${portSegment}`);
      }
    } catch {
      // Ignore entries that are not valid URLs (e.g. "null")
    }
  });

  return Array.from(expanded);
}

async function bootstrap() {
  // Import logger early
  const { logger } = await import('./utils/logger.js');
  
  try {
    // Validate environment variables (warnings only, don't block startup)
    try {
      const { validateEnvironment } = await import("./utils/validateEnv.js");
      validateEnvironment();
    } catch (error) {
      // Only throw if in production and critical vars are missing
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        logger.error("❌ Environment validation failed:", error);
        // Don't throw - allow graceful degradation
      }
    }

    // Initialize database connection if MongoDB URI is provided
    let storageType = "file";
    if (process.env.MONGODB_URI) {
      try {
        const { connectMongoDB } = await import("./db/mongodb.js");
        await connectMongoDB();
        storageType = "mongodb";
        logger.log("✅ Using MongoDB for data storage");
      } catch (error) {
        logger.error("❌ Failed to connect to MongoDB:", error);
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          // In production, MongoDB is required - log error but continue
          logger.error("⚠️ Production mode requires MongoDB - some features may not work");
        } else {
          logger.log("⚠️ Falling back to file-based storage");
        }
        storageType = "file";
      }
    } else {
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        logger.warn("⚠️ MONGODB_URI not set in production - using file storage (not recommended)");
      } else {
        logger.log("📁 Using file-based storage (MONGODB_URI not set)");
      }
    }
    
    // Use logger for environment info (only in development)
    logger.log("🌍 Environment:", process.env.VERCEL ? "Vercel" : "Local");
    logger.log("📂 Working directory:", process.cwd());

    const app = express();
    const expandedOrigins = config.allowedOrigins.includes("*")
      ? ["*"]
      : expandAllowedOrigins(config.allowedOrigins);
    const socketOrigin = expandedOrigins.includes("*") ? "*" : expandedOrigins;

    // Only create Socket.IO server for non-serverless environments
    let server = null;
    let io = null;
    
    if (!process.env.VERCEL) {
      server = http.createServer(app);
      io = new SocketIOServer(server, {
        cors: {
          origin: socketOrigin,
        },
      });
    }

    // Request ID middleware for tracing
    try {
      const { requestIdMiddleware } = await import('./middleware/requestId.js');
      app.use(requestIdMiddleware);
    } catch (error) {
      logger.warn('⚠️  Request ID middleware not available');
    }

    // Request timeout middleware
    try {
      const { requestTimeout } = await import('./middleware/requestTimeout.js');
      app.use(requestTimeout);
    } catch (error) {
      logger.warn('⚠️  Request timeout middleware not available');
    }

    // Reduced request body size limits for security (prevent DoS)
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // Security headers with Helmet (configured for widget embedding)
    try {
      const helmet = (await import('helmet')).default;
      app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP to allow widget embedding
        crossOriginEmbedderPolicy: false, // Allow cross-origin embedding
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow widget resources
        // Additional security headers
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true, // Prevent MIME type sniffing
        xssFilter: true, // Enable XSS filter
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      }));
      logger.log('✅ Security headers enabled (Helmet)');
    } catch (error) {
      logger.warn('⚠️  Helmet not available (helmet not installed)');
      logger.warn('   Install with: npm install helmet');
    }
    
    // Rate limiting
    let apiLimiter, leadLimiter, strictLimiter;
    try {
      const rateLimitModule = await import('./middleware/rateLimit.js');
      apiLimiter = rateLimitModule.apiLimiter;
      leadLimiter = rateLimitModule.leadLimiter;
      strictLimiter = rateLimitModule.strictLimiter;
      
      // Apply general API rate limiting
      app.use('/api/', apiLimiter);
      logger.log('✅ Rate limiting enabled');
    } catch (error) {
      logger.warn('⚠️  Rate limiting not available (express-rate-limit not installed)');
      logger.warn('   Install with: npm install express-rate-limit');
    }
    
    const corsOptions = expandedOrigins.includes("*")
      ? {
          origin: (_origin, callback) => {
            callback(null, true);
          },
          credentials: false, // Must be false when using wildcard origin
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        }
      : {
          origin: expandedOrigins,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        };

    // Handle OPTIONS preflight requests FIRST - before CORS middleware
    app.options("*", (req, res) => {
    const origin = req.headers.origin;
    if (expandedOrigins.includes("*")) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (origin && expandedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
  });

    app.use(cors(corsOptions));
    
    // Additional CORS headers for all responses
    app.use((req, res, next) => {
    const origin = req.headers.origin;
    // If using wildcard, don't set credentials (browser doesn't allow both)
    if (expandedOrigins.includes("*")) {
      res.header('Access-Control-Allow-Origin', '*');
      // CRITICAL: Never set Access-Control-Allow-Credentials when using wildcard
      // This causes CORS errors in browsers
    } else {
      // Use specific origin and allow credentials
      if (origin && expandedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
    }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
      next();
    });

    app.use((req, res, next) => {
      if (io) {
        req.io = io;
      }
      next();
    });

    app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      message:
        "Homesfy API is running. See /health for a simple check or /api/widget-config/:projectId for widget config.",
    });
  });

    app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
      res.type("application/json").send("{}");
    });

    // Socket.IO only works in non-serverless environments
    if (io) {
      io.on("connection", (socket) => {
        const { microsite } = socket.handshake.query;
        if (microsite) {
          socket.join(microsite);
        }
      });
    }

    app.get("/health", async (_req, res) => {
      res.json({ 
        status: "ok",
        mode: "keyword-matching"
      });
    });

    // Apply route-specific rate limiters if available
    if (leadLimiter) {
      app.use("/api/leads", leadLimiter);
    }
    if (strictLimiter) {
      app.use("/api/widget-config", strictLimiter);
    }
    
    app.use("/api/leads", leadsRouter);
    app.use("/api/widget-config", widgetConfigRouter);
    app.use("/api/events", eventsRouter);
    app.use("/api/chat-sessions", chatSessionsRouter);
    app.use("/api/chat", chatRouter);
    app.use("/api/users", usersRouter);

    logger.log("✅ Chat API using keyword matching for responses");

    // Handle favicon requests
    app.get("/favicon.ico", (_req, res) => {
      res.status(204).end();
    });

    // Error handling middleware - MUST set CORS headers before sending response
    app.use((err, req, res, next) => {
    logger.error("Error:", err);
    
      // Set CORS headers even for errors
      const origin = req.headers.origin;
      if (expandedOrigins.includes("*")) {
        res.header('Access-Control-Allow-Origin', '*');
      } else if (origin && expandedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
      
      res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
        status: "error"
      });
    });

    // 404 handler - MUST set CORS headers
    app.use((req, res) => {
      // Set CORS headers even for 404
      const origin = req.headers.origin;
      if (expandedOrigins.includes("*")) {
        res.header('Access-Control-Allow-Origin', '*');
      } else if (origin && expandedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
      
      res.status(404).json({
        error: "Not Found",
        status: "error",
        path: req.path
      });
    });

    // For Vercel serverless, export the app
    if (process.env.VERCEL) {
      logger.log("✅ Express app configured for Vercel serverless");
      return app;
    }

    // For local development, start the server
    if (server) {
      server.listen(config.port, () => {
        logger.log(`API server listening on port ${config.port}`);
      });
    }
    
    return app;
  } catch (error) {
    // Always log fatal errors (even in production)
    const { logger } = await import('./utils/logger.js');
    logger.error("❌ Fatal error in bootstrap:", error);
    // Create a minimal Express app that returns errors
    const errorApp = express();
    errorApp.use((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(500).json({
        error: "Server initialization failed: " + error.message,
        status: "error"
      });
    });
    return errorApp;
  }
}

// For local development
if (!process.env.VERCEL) {
  bootstrap().catch(async (error) => {
    const { logger } = await import('./utils/logger.js');
    logger.error("Failed to start API server", error);
    process.exit(1);
  });
}

// Export bootstrap function for Vercel serverless
export default bootstrap;

