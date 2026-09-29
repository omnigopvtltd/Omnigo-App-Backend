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
// const Notification = require("../models/Notification");
const User = require("../models/User");

exports.sendNotification = async ({ userId, orderId = null, title, message, type = "order_placed", extraData = {} }) => {
  try {
    // 1. User ka FCM Token Database se nikaalein
    const user = await User.findById(userId);
    
    // 2. Database me notification history entry save karein
    const newNotification = await Notification.create({
      userId,
      orderId,
      title,
      message,
      type,
    });

    if (!user || !user.fcmToken) {
      console.log(`User ${userId} does not have an FCM Token. Saved in DB only.`);
      return newNotification;
    }

    // 3. FCM Payload Construct karein
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





    // 4. Firebase Messaging se send karein
    const response = await admin.messaging().send(fcmPayload);
    console.log("🔥 Notification sent successfully:", response);

    return newNotification;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
  }
};

/**
 * Send Chat Notification via Firebase FCM
 */
exports.sendChatNotification = async ({ receiverId, senderId, senderName, text, conversationId }) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(receiverId).select("fcmToken");

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

    const response = await admin.messaging().send(payload);
    console.log("FCM Chat Notification Sent Successfully:", response);
    return response;
  } catch (error) {
    console.error("FCM Notification Error:", error.message);
  }
};




// const admin = require("../config/firebase");

// /**
//  * Send Notification to Single Device or Multiple Devices
//  * @param {string|string[]} fcmTokens - Single token string OR array of tokens
//  * @param {string} title - Notification Header Title
//  * @param {string} body - Main Notification Message Text
//  * @param {object} customData - Extra payload data (e.g. { type: 'chat', senderId: '123' })
//  */
// exports.sendNotification = async (fcmTokens, title, body, customData = {}) => {
//   try {
//     if (!fcmTokens || (Array.isArray(fcmTokens) && fcmTokens.length === 0)) {
//       console.warn("FCM Notification Skipped: No FCM Token provided.");
//       return false;
//     }

//     // Convert all custom data values to Strings (Firebase FCM Requirement)
//     const stringifiedData = {};
//     for (const key in customData) {
//       stringifiedData[key] = String(customData[key]);
//     }

//     // MULTICAST (Array of tokens)
//     if (Array.isArray(fcmTokens)) {
//       const validTokens = fcmTokens.filter(Boolean);
//       if (validTokens.length === 0) return false;

//       const message = {
//         tokens: validTokens,
//         notification: { title, body },
//         data: stringifiedData,
//       };

//       const response = await admin.messaging().sendEachForMulticast(message);
//       console.log(`FCM Multicast Sent: ${response.successCount} successful, ${response.failureCount} failed.`);
//       return response;
//     } 
    
//     // SINGLE TOKEN
//     else {
//       const message = {
//         token: fcmTokens,
//         notification: { title, body },
//         data: stringifiedData,
//       };

//       const response = await admin.messaging().send(message);
//       console.log("FCM Notification Sent Successfully:", response);
//       return response;
//     }
//   } catch (error) {
//     console.error("FCM Notification Error:", error.message);
//     return false;
//   }
// };