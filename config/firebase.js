// const admin = require("firebase-admin");
// const path = require("path");
// // const { initializeApp, cert, getApps } = require("firebase-admin/app");
// const serviceAccountPath = path.join(__dirname, "..", "../serviceAccountKey.json");

// if (admin.apps?.length === 0) {
//   try {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccountPath),
//     });
//     console.log("Firebase Admin SDK Initialized Successfully via Config!");
//   } catch (error) {
//     console.error("Firebase Initialization Error in Config:", error.message);
//   }
// }

// module.exports = admin;

const { initializeApp, cert, getApps } = require("firebase-admin/app");

const serviceAccount = require("../serviceAccountKey.json");

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

    console.log("Firebase Initialized");

module.exports = app;