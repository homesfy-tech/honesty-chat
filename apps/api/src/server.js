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

    // Initialize database connection (MySQL)
    let storageType = "file";
    const hasDatabaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;
    const hasIndividualVars = process.env.MYSQL_HOST && process.env.MYSQL_USER;
    
    if (hasDatabaseUrl || hasIndividualVars) {
      try {
        logger.log("🔗 Attempting to connect to MySQL...");
        const { connectMySQL, initializeSchema } = await import("./db/mysql.js");
        await connectMySQL();
        
        // Initialize schema if needed (only in development or first run)
        if (process.env.INIT_DB_SCHEMA === 'true' || process.env.NODE_ENV !== 'production') {
          try {
            await initializeSchema();
          } catch (schemaError) {
            // Schema might already exist, that's okay
            logger.log("📋 Schema check completed");
          }
        }
        
        storageType = "mysql";
        // Update config to use MySQL storage
        config.setDataStore("mysql");
        logger.log("✅ Using MySQL for data storage");
        logger.log("✅ Config updated to use MySQL storage");
        
        // Initialize Redis cache (optional)
        try {
          const { initRedis } = await import("./storage/redisCache.js");
          await initRedis();
        } catch (error) {
          logger.log("ℹ️  Redis caching not available (optional)");
        }
      } catch (error) {
        logger.error("❌ Failed to connect to MySQL:", error);
        if (process.env.NODE_ENV === 'production') {
          logger.error("⚠️ Production mode requires MySQL - some features may not work");
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
    
    // Trust proxy for correct IP detection (needed for Vite proxy and rate limiting)
    // This allows Express to correctly identify localhost requests when behind a proxy
    app.set('trust proxy', 1);
    
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

    // HTTPS enforcement (production only, skip localhost and direct IP access)
    // Note: This server runs on HTTP only. SSL is handled by nginx reverse proxy.
    // Only redirect if behind a proxy (nginx) that handles SSL termination.
    if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
      app.use((req, res, next) => {
        // Skip HTTPS enforcement for localhost (local development)
        const hostname = req.headers.host?.split(':')[0] || req.hostname || '';
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        
        // Skip HTTPS enforcement for direct IP access (server doesn't have SSL certificates)
        // Only enforce when behind nginx proxy (detected by x-forwarded-* headers)
        const isBehindProxy = req.headers['x-forwarded-proto'] || req.headers['x-forwarded-for'];
        
        if (isLocalhost || !isBehindProxy) {
          return next(); // Skip HTTPS enforcement for localhost or direct access
        }
        
        // Check if request is already HTTPS or behind a proxy
        const isSecure = req.secure || 
                        req.headers['x-forwarded-proto'] === 'https' ||
                        req.headers['x-forwarded-ssl'] === 'on';
        
        if (!isSecure && req.method === 'GET') {
          // Redirect to HTTPS (only when behind proxy)
          const httpsUrl = `https://${req.headers.host}${req.url}`;
          return res.redirect(301, httpsUrl);
        }
        next();
      });
      logger.log('✅ HTTPS enforcement enabled (only when behind proxy, skipping direct access)');
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
      
      // Apply general rate limiter, but exclude specific routes that have their own limiters
      // or shouldn't be rate limited (like uploads in development)
      const isDevelopment = process.env.NODE_ENV !== 'production';
      app.use('/api/', (req, res, next) => {
        // Skip rate limiting for upload route in development (file uploads can be frequent)
        if (isDevelopment && req.path.startsWith('/upload')) {
          return next();
        }
        // Skip rate limiting for GET requests to widget-config (reading config)
        if (req.path.startsWith('/widget-config') && req.method === 'GET') {
          return next();
        }
        // Apply general rate limiter to all other routes
        return apiLimiter(req, res, next);
      });
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
    
    // Apply rate limiting only to POST requests (updates) on widget-config
    // GET requests (reading config) should not be rate limited
    app.use("/api/widget-config", (req, res, next) => {
      if (req.method === 'POST' && strictLimiter) {
        return strictLimiter(req, res, next);
      }
      next();
    });
    
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
      
      // Add /api/health endpoint for dashboard and other clients
      app.get("/api/health", (req, res) => {
        res.json(getHealthCheck());
      });
      
      // Add /api endpoint for API info
      app.get("/api", (req, res) => {
        res.json({
          status: "ok",
          message: "Homesfy Chat API",
          version: "1.0.0",
          endpoints: {
            health: "/api/health",
            leads: "/api/leads",
            widgetConfig: "/api/widget-config/:projectId",
            events: "/api/events",
            chatSessions: "/api/chat-sessions",
            users: "/api/users",
            upload: "/api/upload"
          }
        });
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
      
      // Add /api/health endpoint even if monitoring middleware fails
      app.get("/api/health", (req, res) => {
        res.json({ status: "ok", mode: "keyword-matching" });
      });
      
      // Add /api endpoint
      app.get("/api", (req, res) => {
        res.json({
          status: "ok",
          message: "Homesfy Chat API",
          endpoints: {
            health: "/api/health",
            leads: "/api/leads",
            widgetConfig: "/api/widget-config/:projectId"
          }
        });
      });
    }
    
    // Serve widget files from widget dist folder
    const widgetDistPath = path.join(process.cwd(), "..", "widget", "dist");
    app.get("/apps/widget/dist/:filename", (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(widgetDistPath, filename);
        
        // Security: ensure the file is within the widget dist directory
        const resolvedPath = path.resolve(filePath);
        const resolvedWidgetPath = path.resolve(widgetDistPath);
        if (!resolvedPath.startsWith(resolvedWidgetPath)) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Set proper content type
        if (filename.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filename.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
        
        // Send the file
        res.sendFile(resolvedPath);
      } catch (error) {
        logger.error("Failed to serve widget file", error);
        res.status(404).json({ error: "File not found" });
      }
    });

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
    // Bind to 0.0.0.0 to listen on all interfaces (allows connections from localhost and network)
    server.listen(config.port, '0.0.0.0', () => {
      logger.log(`✅ API server listening on http://0.0.0.0:${config.port}`);
      logger.log(`   Local:   http://localhost:${config.port}`);
      logger.log(`   Network: http://127.0.0.1:${config.port}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} is already in use. Please stop the other process or change API_PORT.`);
      } else {
        logger.error(`❌ Server error:`, error);
      }
      process.exit(1);
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

