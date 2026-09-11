const Order = require("../models/Order"); // Adjust path to match your structure
const User = require("../models/User");
// const Restaurant = require("../models/Restaurant"); // Adjust path if using separate Restaurant model
const Notification = require("../models/adminNotification");
const bcrypt = require("bcryptjs");;
const Vendor = require("../models/Vendor");

// GET /api/search?q=term
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        results: { orders: [], riders: [], restaurants: [] },
      });
    }

    const regex = new RegExp(q, "i");

    const [orders, riders, vendors] = await Promise.all([
      Order.find({ $or: [{ orderId: regex }, { "customer.name": regex }] })
        .limit(5)
        .lean(),
      User.find({ role: "rider", $or: [{ name: regex }, { phone: regex }] })
        .limit(5)
        .lean(),
      Vendor.find({ role: "vendor", name: regex }).limit(5).lean(),
    ]);

    return res.json({
      success: true,
      results: { orders, riders, vendors },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Send and Save Real Notification for User, Vendor, Rider, or Admin
 */
exports.createAndSendNotification = async (app, {
  recipientId,
  recipientModel = "User", // "User", "Vendor", "Rider", "Admin"
  title,
  message,
  type = "system",
  data = {},
  link = "",
}) => {
  try {
    // 1. Save Real Notification in Database
    const newNotification = await Notification.create({
      recipient: recipientId,
      recipientModel,
      title,
      message,
      type,
      data,
      link,
    });

    // 2. Emit Socket IO Real-Time Event to specific target room
    const io = app.get("io");
    if (io) {
      const roomName = `${recipientModel.toLowerCase()}:${recipientId}`;
      io.to(roomName).emit("newNotification", {
        notification: newNotification,
        unreadCountIncrement: 1,
      });
    }
console.log(newNotification);

    return newNotification;
  } catch (error) {
    console.error("CREATE REAL NOTIFICATION ERROR:", error);
    return null;
  }
};


// How to use this in your Controllers:
// Order Confirm (Notify Customer):
// JavaScript
// await createAndSendNotification(req.app, {
//   recipientId: order.userId,
//   recipientModel: "User",
//   title: "Order Confirmed",
//   message: `Your order #${order.orderNumber} has been confirmed!`,
//   type: "order",
//   data: { orderId: order._id },
// });
// New Order Received (Notify Vendor):
// JavaScript
// await createAndSendNotification(req.app, {
//   recipientId: vendorId,
//   recipientModel: "Vendor",
//   title: "New Order Alert",
//   message: `You received a new order #${order.orderNumber}`,
//   type: "vendor",
//   data: { orderId: order._id },
// });
// Order Ready for Pickup (Notify Rider):
// JavaScript
// await createAndSendNotification(req.app, {
//   recipientId: riderId,
//   recipientModel: "Rider",
//   title: "Order Ready",
//   message: `Order #${order.orderNumber} is ready for pickup at vendor location.`,
//   type: "rider",
//   data: { orderId: order._id },
// });

// Get notifications separately for User, Rider, Vendor, or Admin
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    // Auto-detect recipient role (defaulting to User if not passed)
    const recipientModel = req.user?.role 
      ? req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
      : "User";

    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch Notifications matching current recipient & role
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({
        recipient: userId,
        recipientModel: recipientModel,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),

      Notification.countDocuments({
        recipient: userId,
        recipientModel: recipientModel,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      recipientModel,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mark single notification as read
exports.markNotificationsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mark ALL notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// // PATCH /api/notifications/read/:id
// exports.markNotificationsRead = async (req, res) => {
//   try {
//     await await Notification.findOneAndUpdate(
//       { _id: req.params.id, recipient: req.user.id },
//       { isRead: true },
//       { new: true },
//     );
//     return res.json({ success: true, message: "Notifications marked as read" });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
// // PATCH /api/notifications/read-all
// exports.markAllNotificationsRead = async (req, res) => {
//   try {
//     await Notification.updateMany(
//       { recipient: req.user._id, isRead: false },
//       { isRead: true },
//     );
//     return res.json({
//       success: true,
//       message: "All notifications marked as read",
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// GET /api/profile
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, currentPassword, newPassword, avatarUrl } = req.body;
    const user = await User.findById(id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatarUrl) user.avatarUrl = avatarUrl;

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ success: false, message: "Current password required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Current password incorrect" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    return res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
