require("../config/firebase");

const { getMessaging } = require("firebase-admin/messaging");

const getNotification = async (req, res) => {
  try {
    const notification = await Notification.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      notification
    });
  }
};

const sendNotification = async (token, title, body, data = {}) => {
  try {
    // FCM data payload must contain string values only
    const stringData = {};

    Object.keys(data).forEach((key) => {
      stringData[key] = String(data[key] ?? "");
    });

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringData,
    };

    const response = await getMessaging().send(message);

    console.log("Firebase Response:", response);

    return response;
  } catch (error) {
    console.error("Notification Error:", error);
    throw error;
  }
};

module.exports = {sendNotification, getNotification};
