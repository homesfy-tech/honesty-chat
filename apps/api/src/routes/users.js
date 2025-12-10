import express from "express";
import crypto from "crypto";
import { authLimiter } from "../middleware/authRateLimit.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Parse users from environment variable
// Format: username1:passwordHash1,username2:passwordHash2
// Or: username1:password1,username2:password2 (plain text for initial setup)
function parseUsersFromEnv() {
  const usersEnv = process.env.DASHBOARD_USERS || "";
  
  if (!usersEnv.trim()) {
    // Fallback to single user from old env vars
    const username = process.env.VITE_DASHBOARD_USERNAME || "admin";
    const password = process.env.VITE_DASHBOARD_PASSWORD || "admin";
    return [{ username, password: hashPassword(password) }];
  }

  return usersEnv.split(",").map((userStr) => {
    const [username, password] = userStr.trim().split(":");
    if (!username || !password) {
      return null;
    }
    // If password looks like a hash (64 chars hex), use it directly
    // Otherwise, hash it
    const passwordHash = password.length === 64 && /^[a-f0-9]+$/i.test(password)
      ? password
      : hashPassword(password);
    return { username: username.trim(), password: passwordHash };
  }).filter(Boolean);
}

// Hash password using SHA-256 (for production, use bcrypt or similar)
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Verify password (timing-safe comparison)
function verifyPassword(password, hash) {
  const passwordHash = hashPassword(password);
  
  // Ensure both buffers are the same length (timing-safe comparison requirement)
  if (passwordHash.length !== hash.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(passwordHash, 'utf8'),
      Buffer.from(hash, 'utf8')
    );
  } catch (error) {
    // If comparison fails, passwords don't match
    return false;
  }
}

// Get all users (without passwords)
router.get("/", async (req, res) => {
  try {
    const users = parseUsersFromEnv();
    const userList = users.map(({ username }) => ({ username }));
    res.json({ users: userList });
  } catch (error) {
    logger.error("Failed to fetch users", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Authenticate user (with rate limiting to prevent brute force)
router.post("/auth", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = parseUsersFromEnv();
    const user = users.find((u) => u.username === username.trim());

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValid = verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    res.json({
      success: true,
      token,
      username: user.username,
      expiresAt,
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

    // In a real implementation, you'd store tokens in a database
    // For now, we'll just verify the username exists
    const users = parseUsersFromEnv();
    const user = users.find((u) => u.username === username);

    if (user) {
      res.json({ valid: true, username: user.username });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    logger.error("Token verification error", error);
    res.status(500).json({ valid: false });
  }
});

export default router;

