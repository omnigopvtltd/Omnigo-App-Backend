const Order = require("../models/Order"); // Adjust path to match your structure
const User = require("../models/User");
const Restaurant = require("../models/Restaurant"); // Adjust path if using separate Restaurant model
const Notification = require("../models/adminNotification");
const bcrypt = require("bcryptjs");

// GET /api/search?q=term
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, results: { orders: [], riders: [], restaurants: [] } });
    }

    const regex = new RegExp(q, "i");

    const [orders, riders, restaurants] = await Promise.all([
      Order.find({ $or: [{ orderId: regex }, { "customer.name": regex }] }).limit(5).lean(),
      User.find({ role: "rider", $or: [{ name: regex }, { phone: regex }] }).limit(5).lean(),
      User.find({ role: "restaurant", name: regex }).limit(5).lean(),
    ]);

    return res.json({
      success: true,
      results: { orders, riders, restaurants },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/read-all
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/profile
exports.getProfile = async (req, res) => {
  try {
    const {id} = req.params;
    const user = await User.findById(id).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile
exports.updateProfile = async (req, res) => {
  try {
    const {id} = req.params;
    const { name, phone, currentPassword, newPassword, avatarUrl } = req.body;
    const user = await User.findById(id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatarUrl) user.avatarUrl = avatarUrl;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Current password incorrect" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    return res.json({ success: true, message: "Profile updated successfully", user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};