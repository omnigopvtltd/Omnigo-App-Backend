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