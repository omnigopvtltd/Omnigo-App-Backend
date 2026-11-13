// require("../config/firebase");
// const admin = require("firebase-admin");
// const Notification = require("../models/Notification");
// const User = require("../models/User");
// const { getMessaging } = require("firebase-admin/messaging");
// const Vendor = require("../models/Vendor");

// const notificationMessages = require("../utils/notificationMessages");

// exports.sendNotification = async ({
//   userId,
//   role,
//   orderId = null,
//   type = "order_placed",
//   title,
//   message,
//   extraData = {},
// }) => {
//   try {
//     const user = await User.findById(userId);

//     const template = notificationMessages[type];

//     title = title || template?.title || "OmniGo";
//     message =
//       message ||
//       template?.message ||
//       "You have a new notification from OmniGo.";

//     const newNotification = await Notification.create({
//       userId,
//       orderId,
//       title,
//       message,
//       type,
//       role: role || "user",
//       extraData,
//     });

//     if (!user?.fcmToken) {
//       console.log(
//         `User ${userId} does not have an FCM token. Saved in DB only.`,
//       );

//       return newNotification;
//     }

//     const fcmPayload = {
//       token: user.fcmToken,

//       notification: {
//         title,
//         body: message,
//       },

//       data: {
//         type,
//         orderId: orderId ? orderId.toString() : "",
//         notificationId: newNotification._id.toString(),
//         ...Object.fromEntries(
//           Object.entries(extraData).map(([key, value]) => [
//             key,
//             String(value),
//           ]),
//         ),
//       },

//       android: {
//         priority: "high",

//         notification: {
//           sound: "default",

//           channelId:
//             type === "chat"
//               ? "chat_channel"
//               : type.includes("deal") ||
//                 type === "flash_deal"
//                 ? "promotion_channel"
//                 : "high_importance_channel",
//         },
//       },
//     };

//     const response = await getMessaging().send(fcmPayload);

//     console.log("🔥 Notification sent:", response);

//     return newNotification;
//   } catch (error) {
//     console.error("❌ Notification error:", error);
//     return null;
//   }
// };

// exports.sendNotificationToVendor = async ({
//   vendorId,
//   role,
//   orderId = null,
//   type = "order_placed",
//   title,
//   message,
//   extraData = {},
// }) => {
//   try {
//     const vendor = await Vendor.findById(vendorId);

//     const template = notificationMessages[type];

//     title = title || template?.title || "OmniGo";
//     message =
//       message ||
//       template?.message ||
//       "You have a new notification from OmniGo.";

//     const newNotification = await Notification.create({
//       vendorId,
//       orderId,
//       title,
//       message,
//       type,
//       role: role || "vendor",
//       extraData,
//     });
     
//     if (!vendor?.fcmToken) {
//       console.log(
//         `Vendor ${vendorId} does not have an FCM token. Saved in DB only.`,
//       );

//       return newNotification;
//     }

//     const fcmPayload = {
//       token: vendor.fcmToken,

//       notification: {
//         title,
//         body: message,
//       },

//       data: {
//         type,
//         orderId: orderId ? orderId.toString() : "",
//         notificationId: newNotification._id.toString(),
//         ...Object.fromEntries(
//           Object.entries(extraData).map(([key, value]) => [
//             key,
//             String(value),
//           ]),
//         ),
//       },

//       android: {
//         priority: "high",

//         notification: {
//           sound: "default",

//           channelId:
//             type === "chat"
//               ? "chat_channel"
//               : type.includes("deal") ||
//                 type === "flash_deal"
//                 ? "promotion_channel"
//                 : "high_importance_channel",
//         },
//       },
//     };

//     const response = await getMessaging().send(fcmPayload);

//     console.log("🔥 Notification sent:", response);

//     return newNotification;
//   } catch (error) {
//     console.error("❌ Notification error:", error);
//     return null;
//   }
// };

// =================================================================================

require("../config/firebase");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const { getMessaging } = require("firebase-admin/messaging");
const notificationMessages = require("../utils/notificationMessages");

exports.sendNotification = async (firstArg, argTitle, argMessage, argExtraData = {}) => {
  try {
    let token = null;
    let userId = null;
    let role = "user";
    let orderId = null;
    let type = "order_placed";
    let title = typeof argTitle === "string" ? argTitle : undefined;
    let message = typeof argMessage === "string" ? argMessage : undefined;
    let extraData = argExtraData || {};

    if (typeof firstArg === "string") {
      if (
        firstArg.length > 50 ||
        firstArg.includes(":") ||
        firstArg.startsWith("e") ||
        firstArg.startsWith("f")
      ) {
        token = firstArg;
        try {
          const foundUser = await User.findOne({ fcmToken: token }).select("_id").lean();
          if (foundUser) userId = foundUser._id;
        } catch (_) {}
      } else {
        userId = firstArg;
      }

      if (extraData?.orderId) orderId = extraData.orderId;
      if (extraData?.type) type = extraData.type;
      else if (title && title.toLowerCase().includes("deliver")) type = "order_delivered";
      else if (title && title.toLowerCase().includes("pick")) type = "picked_up";
      else if (title && title.toLowerCase().includes("rider")) type = "rider_assigned";
      else if (title && title.toLowerCase().includes("accept")) type = "order_confirmed";
      else if (title && title.toLowerCase().includes("confirm")) type = "order_confirmed";
      else if (title && title.toLowerCase().includes("ready")) type = "order_ready";
      else if (title && title.toLowerCase().includes("cancel")) type = "order_cancelled";
    } else if (typeof firstArg === "object" && firstArg !== null) {
      const opts = argTitle && typeof argTitle === "object" ? argTitle : firstArg;
      userId = opts.userId || opts.recipientId;
      role = opts.role || "user";
      orderId = opts.orderId || opts.data?.orderId || opts.extraData?.orderId || null;
      type = opts.type || "order_placed";
      title = opts.title;
      message = opts.message;
      extraData = opts.extraData || opts.data || {};
      if (opts.token) token = opts.token;
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId).select("fcmToken");
      if (!token && user?.fcmToken) {
        token = user.fcmToken;
      }
    }

    const template = notificationMessages[type];
    title = title || template?.title || "OmniGo";
    message = message || template?.message || "You have a new notification from OmniGo.";

    let newNotification = null;
    if (userId) {
      try {
        newNotification = await Notification.create({
          userId,
          orderId,
          title,
          message,
          type,
          role: role.toLowerCase(),
          extraData,
        });
      } catch (dbErr) {
        console.error("DB Notification create error:", dbErr.message);
      }
    }

    if (!token) {
      console.log(`⚠️ ${role} (${userId || "unknown"}) has no FCM token. Saved in DB only.`);
      return newNotification;
    }

    const stringData = {
      type: String(type || "order"),
      status: String(extraData.status || type || ""),
      orderId: orderId ? String(orderId) : extraData.orderId ? String(extraData.orderId) : "",
      orderNumber: extraData.orderNumber ? String(extraData.orderNumber) : "",
      notificationId: newNotification ? newNotification._id.toString() : "",
      title: String(title),
      body: String(message),
    };

    if (extraData && typeof extraData === "object") {
      Object.entries(extraData).forEach(([key, val]) => {
        stringData[key] = String(val ?? "");
      });
    }

    const channelId =
      type === "chat"
        ? "chat_channel"
        : type.includes("deal") || type === "flash_deal"
          ? "promotion_channel"
          : "order_channel";

    const fcmPayload = {
      token,
      notification: {
        title,
        body: message,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId,
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            contentAvailable: true,
          },
        },
      },
    };

    const response = await getMessaging().send(fcmPayload);
    console.log(`🔥 [${role.toUpperCase()}] FCM Sent:`, response);
    return newNotification;
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    return null;
  }
};

exports.sendNotificationToVendor = async (firstArg, secondArg) => {
  try {
    // Support both sendNotificationToVendor({ vendorId, ... }) AND sendNotificationToVendor(req.app, { vendorId, ... })
    const opts = secondArg && typeof secondArg === "object" ? secondArg : firstArg;
    const {
      vendorId,
      role = "vendor",
      orderId = null,
      type = "order_placed",
      title: rawTitle,
      message: rawMessage,
      extraData = {},
      data = {},
    } = opts || {};

    const mergedData = { ...extraData, ...data };
    const resolvedOrderId = orderId || mergedData.orderId || null;

    if (!vendorId) {
      console.error("❌ sendNotificationToVendor called without vendorId");
      return null;
    }

    const vendor = await Vendor.findById(vendorId).select("fcmToken");
    const template = notificationMessages[type];

    const title = rawTitle || template?.title || "OmniGo Vendor";
    const message =
      rawMessage || template?.message || "You have a new notification from OmniGo.";

    const newNotification = await Notification.create({
      vendorId,
      orderId: resolvedOrderId,
      title,
      message,
      type,
      role: role.toLowerCase(),
      extraData: mergedData,
    });

    if (!vendor?.fcmToken) {
      console.log(`⚠️ Vendor ${vendorId} does not have an FCM token. Saved in DB only.`);
      return newNotification;
    }

    const stringData = {
      type: String(type || "order"),
      status: String(mergedData.status || type || ""),
      orderId: resolvedOrderId ? String(resolvedOrderId) : "",
      orderNumber: mergedData.orderNumber ? String(mergedData.orderNumber) : "",
      notificationId: newNotification._id.toString(),
      title: String(title),
      body: String(message),
    };

    Object.entries(mergedData).forEach(([key, val]) => {
      stringData[key] = String(val ?? "");
    });

    const fcmPayload = {
      token: vendor.fcmToken,
      notification: {
        title,
        body: message,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: type === "chat" ? "chat_channel" : "order_channel",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            contentAvailable: true,
          },
        },
      },
    };

    const response = await getMessaging().send(fcmPayload);
    console.log("🔥 [VENDOR] FCM Sent:", response);
    return newNotification;
  } catch (error) {
    console.error("❌ Vendor Notification error:", error.message);
    return null;
  }
};

exports.sendChatNotification = async ({
  receiverId,
  senderId,
  senderName,
  text,
  conversationId,
}) => {
  try {
    const user = await User.findById(receiverId).select("fcmToken");
    if (!user || !user.fcmToken) return;

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
      android: {
        priority: "high",
        notification: {
          channelId: "chat_channel",
          sound: "default",
        },
      },
      apns: { payload: { aps: { sound: "default" } } },
    };

    return await getMessaging().send(payload);
  } catch (error) {
    console.error("FCM Chat Notification Error:", error.message);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const recipientModel = (req.user?.role || "user").toLowerCase();
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query =
      recipientModel === "vendor"
        ? { vendorId: userId }
        : { userId, role: recipientModel };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments({ ...query, isRead: false }),
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

exports.markNotificationsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, $or: [{ userId }, { vendorId: userId }, { recipient: userId }] },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
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

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    await Notification.updateMany(
      { $or: [{ userId }, { vendorId: userId }, { recipient: userId }], isRead: false },
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

// =================================================================================


// /**
//  * Send Chat Notification via Firebase FCM (Dynamic Token from User Model)
//  */
// exports.sendChatNotification = async ({
//   receiverId,
//   senderId,
//   senderName,
//   text,
//   conversationId,
// }) => {
//   try {
//     // console.log('Try notification:');
//     const user = await User.findById(receiverId).select("fcmToken");
//     // console.log('Try notification user:', user);

//     if (!user || !user.fcmToken) {
//       console.log(`[FCM Skip]: No FCM Token found for Receiver: ${receiverId}`);
//       return;
//     }

//     const payload = {
//       token: user.fcmToken,
//       notification: {
//         title: senderName || "New Message Received",
//         body: text || "Sent an attachment 📎",
//       },
//       data: {
//         click_action: "FLUTTER_NOTIFICATION_CLICK",
//         type: "chat",
//         conversationId: String(conversationId),
//         senderId: String(senderId),
//       },
//       android: { priority: "high" },
//       apns: { payload: { aps: { sound: "default" } } },
//     };

//     const response = await getMessaging().send(payload);
//     // console.log("FCM Chat Notification Sent Successfully:", response);
//     return response;
//   } catch (error) {
//     console.error("FCM Notification Error:", error.message);
//   }
// };

// // GET /notifications
// exports.getNotifications = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.user?._id;

//     console.log(userId)
//     const recipientModel = req.user?.role || "user";
//     console.log(recipientModel)

//     const { page = 1, limit = 30 } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // const id = role == "vendor" ? vendorId = userId : userId;
//     const [notifications, unreadCount] = await Promise.all([
//       Notification.find({
//         userId,
//         role: recipientModel,
//       })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean(),

//       Notification.countDocuments({
//         recipient: userId,
//         recipientModel: recipientModel,
//         isRead: false,
//       }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       recipientModel,
//       unreadCount,
//       count: notifications.length,
//       notifications,
//     });
//   } catch (err) {
//     console.error("GET NOTIFICATIONS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // PATCH /update/notifications/read/:notificationId
// exports.markNotificationsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.user?.id || req.user?._id;

//     const notification = await Notification.findOneAndUpdate(
//       { _id: notificationId, recipient: userId },
//       { isRead: true },
//       { new: true }
//     );

//     if (!notification) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Notification not found" });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Notification marked as read",
//       notification,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // PATCH /update/notifications/read-all
// exports.markAllNotificationsRead = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.user?._id;

//     await Notification.updateMany(
//       { recipient: userId, isRead: false },
//       { $set: { isRead: true } }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "All notifications marked as read",
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };