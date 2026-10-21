// const AppConfig = require("../models/AppConfig"); // Correct model path

// /**
//  * Version Comparison Helper
//  * Returns:
//  * -1 if v1 < v2
//  *  1 if v1 > v2
//  *  0 if v1 === v2
//  */
// const compareVersions = (v1, v2) => {
//   const p1 = v1.split(".").map(Number);
//   const p2 = v2.split(".").map(Number);
//   const len = Math.max(p1.length, p2.length);

//   for (let i = 0; i < len; i++) {
//     const num1 = p1[i] || 0;
//     const num2 = p2[i] || 0;
//     if (num1 < num2) return -1;
//     if (num1 > num2) return 1;
//   }
//   return 0;
// };

// // ==========================================
// // Check App Version & Force Update Logic API
// // ==========================================
// exports.checkAppVersion = async (req, res) => {
//   try {
//     const { appType, currentVersion, platform = "android" } = req.query;

//     if (!appType || !currentVersion) {
//       return res.status(400).json({
//         success: false,
//         message: "appType and currentVersion are required",
//       });
//     }

//     const config = await AppConfig.findOne({ appType: appType.toLowerCase() });

//     // Fallback: Agar DB mein config Entry na bane toh app stop na ho
//     if (!config) {
//       return res.status(200).json({
//         success: true,
//         updateType: "none",
//         isUpdateRequired: false,
//         message: "App is up to date",
//       });
//     }

//     // 1. Check Maintenance Mode
//     if (config.isMaintenanceMode) {
//       return res.status(200).json({
//         success: true,
//         updateType: "maintenance",
//         isUpdateRequired: true,
//         title: "Under Maintenance",
//         message: "System is undergoing scheduled maintenance. Please check back shortly.",
//       });
//     }

//     const { latestVersion, minRequiredVersion, storeUrls } = config;
//     const storeUrl = platform.toLowerCase() === "ios" ? storeUrls.ios : storeUrls.android;

//     // 2. Check Force Update: currentVersion < minRequiredVersion
//     if (compareVersions(currentVersion, minRequiredVersion) < 0) {
//       return res.status(200).json({
//         success: true,
//         updateType: "force", // MANDATORY BLOCKING UPDATE
//         isUpdateRequired: true,
//         title: "Critical Update Required",
//         message: config.forceUpdateMessage,
//         latestVersion,
//         storeUrl,
//       });
//     }

//     // 3. Check Normal / Optional Update: currentVersion < latestVersion
//     if (compareVersions(currentVersion, latestVersion) < 0) {
//       return res.status(200).json({
//         success: true,
//         updateType: "normal", // OPTIONAL DISMISSABLE UPDATE
//         isUpdateRequired: false,
//         title: config.updateTitle,
//         message: config.updateMessage,
//         latestVersion,
//         storeUrl,
//       });
//     }

//     // 4. No Update Required
//     return res.status(200).json({
//       success: true,
//       updateType: "none",
//       isUpdateRequired: false,
//       message: "You are on the latest version",
//     });

//   } catch (err) {
//     console.error("CHECK APP VERSION ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // ==========================================
// // Admin: Set or Update App Version Config
// // ==========================================
// exports.updateAppVersionConfig = async (req, res) => {
//   try {
//     const {
//       appType,              // "user" | "rider" | "vendor"
//       latestVersion,        // e.g. "1.1.0"
//       minRequiredVersion,   // e.g. "1.0.0" (Optional update) ya "1.1.0" (Force update)
//       updateTitle,          // e.g. "New Feature Released!"
//       updateMessage,        // Message for normal updates
//       forceUpdateMessage,   // Message for force updates
//       androidStoreUrl,
//       iosStoreUrl,
//       isMaintenanceMode,    // true | false
//     } = req.body;

//     if (!appType || !latestVersion || !minRequiredVersion) {
//       return res.status(400).json({
//         success: false,
//         message: "appType, latestVersion, and minRequiredVersion are required fields",
//       });
//     }

//     // Upsert (Update if exists, Create if not)
//     const updatedConfig = await AppConfig.findOneAndUpdate(
//       { appType: appType.toLowerCase() },
//       {
//         appType: appType.toLowerCase(),
//         latestVersion,
//         minRequiredVersion,
//         ...(updateTitle && { updateTitle }),
//         ...(updateMessage && { updateMessage }),
//         ...(forceUpdateMessage && { forceUpdateMessage }),
//         ...(isMaintenanceMode !== undefined && { isMaintenanceMode }),
//         storeUrls: {
//           android: androidStoreUrl || "",
//           ios: iosStoreUrl || "",
//         },
//       },
//       { new: true, upsert: true }
//     );

//     return res.status(200).json({
//       success: true,
//       message: `App version config for '${appType}' updated successfully!`,
//       data: updatedConfig,
//     });
//   } catch (err) {
//     console.error("UPDATE APP VERSION CONFIG ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


////////////////////////////////////////////////////////////////////

const AppConfig = require("../models/AppConfig");
const { APP_TYPES, PLATFORMS } = AppConfig;
const { isStrictVersion, parseVersion, compareVersions } = require("../utils/version");

const asCleanString = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const upToDate = (res, message = "You are on the latest version") =>
  res.status(200).json({
    success: true,
    updateType: "none",
    isUpdateRequired: false,
    // currentVersion: currentVersion,
    message,
  });

// ==========================================
// PUBLIC: Check app version (called by the app on every launch)
// GET /app/version-check?appType=user&platform=android&currentVersion=1.0.0
// ==========================================
exports.checkAppVersion = async (req, res) => {
  try {
    const appType = asCleanString(req.query.appType);
    const platform = asCleanString(req.query.platform) || "android";
    const currentVersion =
      typeof req.query.currentVersion === "string" ? req.query.currentVersion.trim() : "";

    if (
      !APP_TYPES.includes(appType) ||
      !PLATFORMS.includes(platform) ||
      !parseVersion(currentVersion)
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: "appType, platform and currentVersion are invalid or missing",
      });
    }

    const config = await AppConfig.findOne({ appType }).lean();

    // Fail-open: if nothing is configured yet, never block the app.
    if (!config) {
      console.warn(`APP CONFIG MISSING for appType='${appType}'`);
      return upToDate(res, "App is up to date");
    }

    // Short cache: the app calls this on every launch.
    res.set("Cache-Control", "public, max-age=60");

    // 1. Maintenance mode
    if (config.isMaintenanceMode) {
      return res.status(200).json({
        success: true,
        updateType: "maintenance",
        isUpdateRequired: true,
        title: config.maintenanceTitle,
        message: config.maintenanceMessage,
      });
    }

    const platformConfig = (config.platforms && config.platforms[platform]) || {};
    const { latestVersion, minRequiredVersion, storeUrl = "" } = platformConfig;

    // 2. Force update: currentVersion < minRequiredVersion
    if (minRequiredVersion && compareVersions(currentVersion, minRequiredVersion) === -1) {
      return res.status(200).json({
        success: true,
        updateType: "force",
        isUpdateRequired: true,
        title: "Update Required",
        message: config.forceUpdateMessage,
        latestVersion: latestVersion || minRequiredVersion,
        minRequiredVersion,
        storeUrl,
      });
    }

    // 3. Optional update: currentVersion < latestVersion
    if (latestVersion && compareVersions(currentVersion, latestVersion) === -1) {
      return res.status(200).json({
        success: true,
        updateType: "normal",
        isUpdateRequired: false,
        title: config.updateTitle,
        message: config.updateMessage,
        latestVersion,
        minRequiredVersion: minRequiredVersion || null,
        storeUrl,
      });
    }

    // 4. Nothing to do
    return upToDate(res);
  } catch (err) {
    console.error("CHECK APP VERSION ERROR:", err);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ==========================================
// ADMIN: Set or update app config (partial update, only sent fields change)
// PUT /admin/app-config
//
// Example body:
// {
//   "appType": "user",
//   "android": { "latestVersion": "1.2.0", "minRequiredVersion": "1.1.0", "storeUrl": "https://play.google.com/store/apps/details?id=com.example.app" },
//   "ios":     { "latestVersion": "1.2.0", "minRequiredVersion": "1.1.0", "storeUrl": "https://apps.apple.com/app/id123456789" },
//   "updateTitle": "New Feature Released!",
//   "isMaintenanceMode": false
// }
// ==========================================
exports.updateAppVersionConfig = async (req, res) => {
  try {
    const body = req.body || {};
    const appType = asCleanString(body.appType);

    if (!APP_TYPES.includes(appType)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_APP_TYPE",
        message: `appType must be one of: ${APP_TYPES.join(", ")}`,
      });
    }

    const set = {};

    // Platform blocks: both versions are required when a platform is sent.
    for (const platform of PLATFORMS) {
      const data = body[platform];
      if (data === undefined) continue;

      const { latestVersion, minRequiredVersion, storeUrl } = data || {};

      if (!isStrictVersion(latestVersion) || !isStrictVersion(minRequiredVersion)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_VERSION",
          message: `${platform}: latestVersion and minRequiredVersion must look like 1.2.3`,
        });
      }

      if (compareVersions(minRequiredVersion, latestVersion) === 1) {
        return res.status(400).json({
          success: false,
          code: "MIN_GREATER_THAN_LATEST",
          message: `${platform}: minRequiredVersion cannot be higher than latestVersion`,
        });
      }

      if (storeUrl !== undefined) {
        if (typeof storeUrl !== "string" || (storeUrl && !/^https:\/\//i.test(storeUrl.trim()))) {
          return res.status(400).json({
            success: false,
            code: "INVALID_STORE_URL",
            message: `${platform}: storeUrl must start with https://`,
          });
        }
        set[`platforms.${platform}.storeUrl`] = storeUrl.trim();
      }

      set[`platforms.${platform}.latestVersion`] = latestVersion.trim();
      set[`platforms.${platform}.minRequiredVersion`] = minRequiredVersion.trim();
    }

    // Optional text fields: only changed when sent.
    const textFields = [
      "updateTitle",
      "updateMessage",
      "forceUpdateMessage",
      "maintenanceTitle",
      "maintenanceMessage",
    ];
    for (const field of textFields) {
      if (typeof body[field] === "string" && body[field].trim()) {
        set[field] = body[field].trim();
      }
    }

    if (body.isMaintenanceMode !== undefined) {
      if (typeof body.isMaintenanceMode !== "boolean") {
        return res.status(400).json({
          success: false,
          code: "INVALID_MAINTENANCE_FLAG",
          message: "isMaintenanceMode must be true or false",
        });
      }
      set.isMaintenanceMode = body.isMaintenanceMode;
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({
        success: false,
        code: "NOTHING_TO_UPDATE",
        message: "No valid fields were sent",
      });
    }

    if (req.user && req.user._id) set.updatedBy = req.user._id;

    const updatedConfig = await AppConfig.findOneAndUpdate(
      { appType },
      { $set: set },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `App config for '${appType}' updated successfully`,
      data: updatedConfig,
    });
  } catch (err) {
    console.error("UPDATE APP VERSION CONFIG ERROR:", err);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
  }
};
