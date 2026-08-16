const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  globalSearch,
  getNotifications,
  markAllNotificationsRead,
  getProfile,
  updateProfile,
} = require("../controllers/adminController");

router.get("/search", auth, role("admin"), globalSearch);
router.get("/notifications", auth, getNotifications);
router.patch("/update/notifications/read-all", auth, role("admin"), markAllNotificationsRead);
router.get("/profile/:id", auth, role("admin"), getProfile);
router.put("/update/profile/:id", auth, role("admin"), updateProfile);

module.exports = router;