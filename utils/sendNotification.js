require("../config/firebase");

// const { getMessaging } = require("firebase-admin/messaging");

// const getNotification = async (req, res) => {
//   try {
//     const notification = await Notification.find().sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       users,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       notification
//     });
//   }
// };

// const sendNotification = async (token, title, body, data = {}) => {
//   try {
//     // FCM data payload must contain string values only
//     const stringData = {};

//     Object.keys(data).forEach((key) => {
//       stringData[key] = String(data[key] ?? "");
//     });

//     const message = {
//       token,
//       notification: {
//         title,
//         body,
//       },
//       data: stringData,
//     };

//     const response = await getMessaging().send(message);

//     console.log("Firebase Response:", response);

//     return response;
//   } catch (error) {
//     console.error("Notification Error:", error);
//     throw error;
//   }
// };

// module.exports = {sendNotification, getNotification};

const admin = require("firebase-admin");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { getMessaging } = require("firebase-admin/messaging");
const Vendor = require("../models/Vendor");
/**
 * General System & Order Push Notification
 */
exports.sendNotification = async ({
  userId,
  orderId = null,
  title,
  message,
  type = "order_placed",
  extraData = {},
}) => {
  try {
    const user = await User.findById(userId);

    const newNotification = await Notification.create({
      recipient: userId,
      orderId,
      title,
      message,
      type,
      role,
    });

    if (!user || !user.fcmToken) {
      console.log(`User ${userId} does not have an FCM Token. Saved in DB only.`);
      return newNotification;
    }

    const fcmPayload = {
      token: user.fcmToken,
      notification: {
        title: title,
        body: message,
      },
      data: {
        type: type,
        orderId: orderId ? orderId.toString() : "",
        notificationId: newNotification._id.toString(),
        ...extraData,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: type === "chat" ? "chat_channel" : "order_channel",
        },
      },
    };

    const response = await getMessaging().send(fcmPayload);
    console.log("🔥 Notification sent successfully:", response);

    return newNotification;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
  }
};

/**
 * General System & Order Push Notification
 */
exports.sendNotificationToVendor = async ({
  vendorId,
  orderId = null,
  title,
  message,
  type = "order_placed",
  extraData = {},
}) => {
  try {
    const vendor = await Vendor.findById(vendorId);

    const newNotification = await Notification.create({
      recipient: vendorId,
      orderId,
      title,
      message,
      type,
      extraData,
    });

    if (!vendor || !vendor.fcmToken) {
      console.log(`Vendor ${vendorId} does not have an FCM Token. Saved in DB only.`);
      return newNotification;
    }

    const fcmPayload = {
      token: vendor.fcmToken,
      notification: {
        title: title,
        body: message,
      },
      data: {
        type: type,
        orderId: orderId ? orderId.toString() : "",
        notificationId: newNotification._id.toString(),
        ...extraData,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: type === "chat" ? "chat_channel" : "order_channel",
        },
      },
    };

    const response = await getMessaging().send(fcmPayload);
    console.log("🔥 Notification sent successfully:", response);

    return newNotification;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
  }
};

/**
 * Send Chat Notification via Firebase FCM (Dynamic Token from User Model)
 */
exports.sendChatNotification = async ({
  receiverId,
  senderId,
  senderName,
  text,
  conversationId,
}) => {
  try {
    // console.log('Try notification:');
    const user = await User.findById(receiverId).select("fcmToken");
    // console.log('Try notification user:', user);

    if (!user || !user.fcmToken) {
      console.log(`[FCM Skip]: No FCM Token found for Receiver: ${receiverId}`);
      return;
    }

    const payload = {
      token: user.fcmToken,
      notification: {
        title: senderName || "New Message Received",
        body: text || "Sent an attachment 📎",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "chat",
        conversationId: String(conversationId),
        senderId: String(senderId),
      },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    };

    const response = await getMessaging().send(payload);
    // console.log("FCM Chat Notification Sent Successfully:", response);
    return response;
  } catch (error) {
    console.error("FCM Notification Error:", error.message);
  }
};

// GET /notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const recipientModel = req.user?.role
      ? req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
      : "User";

    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

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

// PATCH /update/notifications/read/:notificationId
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

// PATCH /update/notifications/read-all
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