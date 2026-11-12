// services/userNotifier.js
// !! Yahan APNA existing user-notification function lagayen (FCM/push + DB notification, jo bhi aap ke project mein ha).
// createOrder mein vendors ke liye aap sendNotificationToVendor(req.app, {...}) use karte han; user ke liye bhi usi jesa function ho to yahan call karein.
//
// async function notifyUser(app, userId, { title, message, type, data, link }) { ... }
module.exports = async function notifyUser(app, userId, payload) {
  // MISAAL (apne function ke naam/shakal ke mutabiq badlein):
  // const { sendNotificationToUser } = require("../utils/notifications");
  // return sendNotificationToUser(app, { userId, role: "User", ...payload });
  console.log(`[userNotifier] (STUB - asli function lagayen) user=${userId}`, payload.title, "-", payload.message);
};