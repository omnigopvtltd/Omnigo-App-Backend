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

const sendNotification = async ({ userId, orderId = null, title, message, type = "order_placed", extraData = {} }) => {
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


module.exports = { sendNotification };
