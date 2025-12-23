import express from "express";
import { authLimiter } from "../middleware/authRateLimit.js";
import { logger } from "../utils/logger.js";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";

const router = express.Router();

// Get all users (without passwords)
router.get("/", async (req, res) => {
  try {
    // Check if using MySQL or fallback to env
    let users;
    try {
      users = await User.findAll();
      const userList = users.map(({ id, username, email, role, created_at }) => ({
        id,
        username,
        email,
        role,
        created_at
      }));
      return res.json({ users: userList });
    } catch (dbError) {
      // Fallback to env-based users for backward compatibility
      logger.warn("Database not available, using env-based users");
      const usersEnv = process.env.DASHBOARD_USERS || "";
      if (usersEnv.trim()) {
        const userList = usersEnv.split(",").map((userStr) => {
          const [username] = userStr.trim().split(":");
          return { username: username?.trim() };
        }).filter(Boolean);
        return res.json({ users: userList });
      }
      return res.json({ users: [] });
    }
  } catch (error) {
    logger.error("Failed to fetch users", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create new user (admin only - add auth middleware later)
router.post("/", async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Check if user exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const user = await User.create({ username, password, email, role: role || 'user' });
    
    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    
    res.status(201).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    logger.error("Failed to create user", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Authenticate user (with rate limiting to prevent brute force)
router.post("/auth", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    let user;
    let isValid = false;

    try {
      // Try MySQL first
      user = await User.findByUsername(username.trim());
      if (user) {
        isValid = await User.verifyPassword(password, user.password_hash);
      }
    } catch (dbError) {
      // Fallback to env-based authentication for backward compatibility
      logger.warn("Database not available, using env-based auth");
      const usersEnv = process.env.DASHBOARD_USERS || "";
      const fallbackUsername = process.env.VITE_DASHBOARD_USERNAME || "admin";
      const fallbackPassword = process.env.VITE_DASHBOARD_PASSWORD || "admin";
      
      if (username === fallbackUsername && password === fallbackPassword) {
        isValid = true;
        user = { username: fallbackUsername };
      } else if (usersEnv.trim()) {
        const users = usersEnv.split(",").map((userStr) => {
          const [u, p] = userStr.trim().split(":");
          return { username: u?.trim(), password: p?.trim() };
        }).filter(Boolean);
        
        const envUser = users.find((u) => u.username === username.trim());
        if (envUser && envUser.password === password) {
          isValid = true;
          user = { username: envUser.username };
        }
      }
    }

    if (!user || !isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    let session;
    
    try {
      session = await Session.create(user.id || 1, expiresAt);
    } catch (sessionError) {
      // If session creation fails, generate token anyway (backward compatibility)
      logger.warn("Session creation failed, using simple token");
      const token = require('crypto').randomBytes(32).toString('hex');
      return res.json({
        success: true,
        token,
        username: user.username,
        expiresAt: expiresAt.getTime(),
      });
    }

    res.json({
      success: true,
      token: session.token,
      username: user.username,
      expiresAt: new Date(session.expires_at).getTime(),
    });
  } catch (error) {
    logger.error("Authentication error", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Verify token (for protected routes)
router.post("/verify", async (req, res) => {
  try {
    const { token, username } = req.body;

    if (!token || !username) {
      return res.status(400).json({ valid: false });
    }

    try {
      // Try MySQL session verification
      const session = await Session.findByToken(token);
      if (session && session.username === username) {
        return res.json({ 
          valid: true, 
          username: session.username,
          role: session.role 
        });
      }
    } catch (dbError) {
      // Fallback: just check if username exists (backward compatibility)
      logger.warn("Database not available, using simple verification");
      const usersEnv = process.env.DASHBOARD_USERS || "";
      if (usersEnv.includes(username)) {
        return res.json({ valid: true, username });
      }
    }

    res.json({ valid: false });
  } catch (error) {
    logger.error("Token verification error", error);
    res.status(500).json({ valid: false });
  }
});

// Logout (delete session)
router.post("/logout", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token) {
      try {
        await Session.deleteByToken(token);
      } catch (error) {
        // Ignore if session doesn't exist
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error("Logout error", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
