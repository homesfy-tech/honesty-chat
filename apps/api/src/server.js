import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config.js";
import leadsRouter from "./routes/leads.js";
import widgetConfigRouter from "./routes/widgetConfig.js";
import eventsRouter from "./routes/events.js";
import chatSessionsRouter from "./routes/chatSessions.js";
import chatRouter from "./routes/chat.js";
import usersRouter from "./routes/users.js";
import uploadRouter from "./routes/upload.js";

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
    try {
      const { validateEnvironment } = await import("./utils/validateEnv.js");
      validateEnvironment();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        logger.error("❌ Environment validation failed:", error);
      }
    }

    // Initialize database connection (PostgreSQL)
    let storageType = "file";
    if (process.env.DATABASE_URL || process.env.POSTGRESQL_URI) {
      try {
        const { connectPostgreSQL, initializeSchema } = await import("./db/postgresql.js");
        await connectPostgreSQL();
        
        // Initialize schema if needed (only in development or first run)
        if (process.env.INIT_DB_SCHEMA === 'true' || process.env.NODE_ENV !== 'production') {
          try {
            await initializeSchema();
          } catch (schemaError) {
            // Schema might already exist, that's okay
            logger.log("📋 Schema check completed");
          }
        }
        
        storageType = "postgresql";
        logger.log("✅ Using PostgreSQL for data storage");
        
        // Initialize Redis cache (optional)
        try {
          const { initRedis } = await import("./storage/redisCache.js");
          await initRedis();
        } catch (error) {
          logger.log("ℹ️  Redis caching not available (optional)");
        }
      } catch (error) {
        logger.error("❌ Failed to connect to PostgreSQL:", error);
        if (process.env.NODE_ENV === 'production') {
          logger.error("⚠️ Production mode requires PostgreSQL - some features may not work");
        } else {
          logger.log("⚠️ Falling back to file-based storage");
        }
        storageType = "file";
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.warn("⚠️ DATABASE_URL not set in production - using file storage (not recommended)");
      } else {
        logger.log("📁 Using file-based storage (DATABASE_URL not set)");
      }
    }
    
    // Use logger for environment info (only in development)
    logger.log("🌍 Environment: Local");
    logger.log("📂 Working directory:", process.cwd());

    const app = express();
    const expandedOrigins = config.allowedOrigins.includes("*")
      ? ["*"]
      : expandAllowedOrigins(config.allowedOrigins);
    const socketOrigin = expandedOrigins.includes("*") ? "*" : expandedOrigins;

    // Create Socket.IO server
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: socketOrigin,
      },
    });

    try {
      const { requestIdMiddleware } = await import('./middleware/requestId.js');
      app.use(requestIdMiddleware);
    } catch (error) {
      logger.warn('⚠️  Request ID middleware not available');
    }

    try {
      const { requestTimeout } = await import('./middleware/requestTimeout.js');
      app.use(requestTimeout);
    } catch (error) {
      logger.warn('⚠️  Request timeout middleware not available');
    }

    // Response compression (Gzip) for better performance
    try {
      const compression = (await import('compression')).default;
      app.use(compression({
        level: 6, // Compression level (1-9, 6 is good balance)
        filter: (req, res) => {
          // Don't compress if client doesn't support it
          if (req.headers['x-no-compression']) {
            return false;
          }
          // Use compression for all text-based responses
          return compression.filter(req, res);
        }
      }));
      logger.log('✅ Response compression enabled (Gzip)');
    } catch (error) {
      logger.warn('⚠️  Compression not available (compression not installed)');
      logger.warn('   Install with: npm install compression');
    }

    // HTTPS enforcement (production only)
    if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
      app.use((req, res, next) => {
        // Check if request is already HTTPS or behind a proxy
        const isSecure = req.secure || 
                        req.headers['x-forwarded-proto'] === 'https' ||
                        req.headers['x-forwarded-ssl'] === 'on';
        
        if (!isSecure && req.method === 'GET') {
          // Redirect to HTTPS
          const httpsUrl = `https://${req.headers.host}${req.url}`;
          return res.redirect(301, httpsUrl);
        }
        next();
      });
      logger.log('✅ HTTPS enforcement enabled');
    }

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    try {
      const helmet = (await import('helmet')).default;
      app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      }));
      logger.log('✅ Security headers enabled (Helmet)');
    } catch (error) {
      logger.warn('⚠️  Helmet not available');
    }
    
    let apiLimiter, leadLimiter, strictLimiter;
    try {
      const rateLimitModule = await import('./middleware/rateLimit.js');
      apiLimiter = rateLimitModule.apiLimiter;
      leadLimiter = rateLimitModule.leadLimiter;
      strictLimiter = rateLimitModule.strictLimiter;
      
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
    
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (expandedOrigins.includes("*")) {
        res.header('Access-Control-Allow-Origin', '*');
      } else {
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

    if (io) {
      io.on("connection", (socket) => {
        const { microsite } = socket.handshake.query;
        if (microsite) {
          socket.join(microsite);
        }
      });
    }

    // Health endpoint is now handled by monitoring middleware above

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
    app.use("/api/upload", uploadRouter);
    
    try {
      const { getHealthCheck, getMonitoringStats } = await import('./middleware/monitoring.js');
      
      app.get("/health", (req, res) => {
        res.json(getHealthCheck());
      });
      
      app.get("/api/monitoring/stats", (req, res) => {
        if (process.env.NODE_ENV === 'production') {
          const apiKey = req.headers['x-api-key'];
          if (apiKey !== process.env.WIDGET_CONFIG_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
        }
        res.json(getMonitoringStats());
      });
    } catch (error) {
      app.get("/health", (req, res) => {
        res.json({ status: "ok", mode: "keyword-matching" });
      });
    }
    
    // Serve static files (uploads)
    // Custom route to handle URL-encoded filenames properly
    // This must be registered BEFORE any other /uploads routes
    // process.cwd() is already in apps/api, so just use 'uploads'
    const uploadsPath = path.join(process.cwd(), "uploads");
    app.get("/uploads/*", (req, res) => {
      try {
        // Get the filename from the request path (everything after /uploads/)
        const requestedPath = req.path.replace('/uploads/', '');
        const decodedFilename = decodeURIComponent(requestedPath);
        const filePath = path.join(uploadsPath, decodedFilename);
        
        // Security: ensure the file is within the uploads directory
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsPath = path.resolve(uploadsPath);
        if (!resolvedPath.startsWith(resolvedUploadsPath)) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Set proper content type
        if (decodedFilename.endsWith('.gif')) {
          res.setHeader('Content-Type', 'image/gif');
        } else if (decodedFilename.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (decodedFilename.endsWith('.jpg') || decodedFilename.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (decodedFilename.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
        
        // Send the file
        res.sendFile(resolvedPath);
      } catch (error) {
        logger.error("Failed to serve upload file", error);
        res.status(404).json({ error: "File not found" });
      }
    });

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

    // Start the server
    server.listen(config.port, () => {
      logger.log(`API server listening on port ${config.port}`);
    });
    
    return app;
  } catch (error) {
    const { logger } = await import('./utils/logger.js');
    logger.error("❌ Fatal error in bootstrap:", error);
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

// Start the server
bootstrap().catch(async (error) => {
  const { logger } = await import('./utils/logger.js');
  logger.error("Failed to start API server", error);
  process.exit(1);
});

