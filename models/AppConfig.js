// const mongoose = require("mongoose");

// const appConfigSchema = new mongoose.Schema(
//   {
//     appType: {
//       type: String,
//       enum: ["user", "rider", "vendor"],
//       required: true,
//       unique: true,
//     },
//     latestVersion: {
//       type: String,
//       required: true, // e.g. "1.1.0"
//     },
//     minRequiredVersion: {
//       type: String,
//       required: true, // e.g. "1.0.0" (Is se neeche wale sab force-update block ho jayenge)
//     },
//     updateTitle: {
//       type: String,
//       default: "New Update Available",
//     },
//     updateMessage: {
//       type: String,
//       default: "A new version of the app is available with bug fixes and improvements.",
//     },
//     forceUpdateMessage: {
//       type: String,
//       default: "This version is no longer supported. Please update to continue using the app.",
//     },
//     storeUrls: {
//       android: { type: String, default: "" }, // Play Store Link
//       ios: { type: String, default: "" },     // App Store Link
//     },
//     isMaintenanceMode: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("AppConfig", appConfigSchema);

const mongoose = require("mongoose");

const APP_TYPES = ["user", "rider", "vendor"];
const PLATFORMS = ["android", "ios"];

const versionField = {
  type: String,
  trim: true,
  match: [/^\d+\.\d+\.\d+$/, "Version must look like 1.2.3"],
};

// Android and iOS are released separately, so each has its own versions and store link.
const platformSchema = new mongoose.Schema(
  {
    latestVersion: versionField, // newest version live on this store
    minRequiredVersion: versionField, // anything below this is force-blocked
    storeUrl: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const appConfigSchema = new mongoose.Schema(
  {
    appType: {
      type: String,
      enum: APP_TYPES,
      required: true,
      unique: true, // also creates the index used by findOne({ appType })
      lowercase: true,
      trim: true,
    },
    platforms: {
      android: { type: platformSchema, default: () => ({}) },
      ios: { type: platformSchema, default: () => ({}) },
    },
    updateTitle: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "New Update Available",
    },
    updateMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "A new version of the app is available with bug fixes and improvements.",
    },
    forceUpdateMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "This version is no longer supported. Please update to continue using the app.",
    },
    // type: {
    //   type: String,
    //   enum: ["normal", "force"],
    //   default: "normal",
    // },
    isMaintenanceMode: { type: Boolean, default: false },
    maintenanceTitle: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Under Maintenance",
    },
    maintenanceMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "System is undergoing scheduled maintenance. Please check back shortly.",
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId }, // which admin changed it last
  },
  { timestamps: true },
);

module.exports = mongoose.model("AppConfig", appConfigSchema);
module.exports.APP_TYPES = APP_TYPES;
module.exports.PLATFORMS = PLATFORMS;
