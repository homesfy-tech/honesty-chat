import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { requireApiKey } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store uploads in apps/api/uploads directory
    const uploadDir = path.resolve(__dirname, "../../uploads");
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    // Remove spaces and special characters to avoid URL encoding issues
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9\-_]/g, ''); // Remove special characters except hyphens and underscores
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload profile picture
router.post("/profile-picture", requireApiKey, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate URL for the uploaded file
    // For local development, use localhost
    // For production, use the request host
    const isLocal = req.get('host')?.includes('localhost') || req.get('host')?.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : req.protocol;
    const host = req.get('host') || 'localhost:4000';
    // URL encode the filename to handle special characters
    const encodedFilename = encodeURIComponent(req.file.filename);
    const fileUrl = `/uploads/${encodedFilename}`;
    const fullUrl = `${protocol}://${host}${fileUrl}`;

    logger.log(`Profile picture uploaded: ${req.file.filename}`);

    res.json({
      success: true,
      url: fullUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    logger.error("Failed to upload profile picture", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

// Note: Static file serving is handled in server.js via express.static
// This route is kept for backward compatibility but may not be needed

export default router;

