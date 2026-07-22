const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const upload = require("../middleware/upload");

// Single image — restaurant logo/cover, or one product photo
router.post(
  "/image",
  auth,
  role("admin"),
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    return res.status(201).json({
      success: true,
      url: `/uploads/${req.file.filename}`,
    });
  }
);

// Multiple images — product gallery (up to 6)
router.post(
  "/images",
  auth,
  role("admin"),
  upload.array("images", 6),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    return res.status(201).json({
      success: true,
      urls: req.files.map((f) => `/uploads/${f.filename}`),
    });
  }
);

module.exports = router;