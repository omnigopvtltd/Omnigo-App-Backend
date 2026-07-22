const Settings = require("../models/AdminSettings");

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        rolesConfig: [
          { roleName: "manager", permissions: ["manage_orders", "view_analytics", "manage_riders"] },
          { roleName: "support", permissions: ["view_orders", "chat_support"] },
          { roleName: "finance", permissions: ["payout_vendors", "view_reports"] },
        ],
      });
    }

    return res.status(200).json({ success: true, settings });
  } catch (err) {
    console.error("GET SETTINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Omnigo Configuration updated successfully",
      settings,
    });
  } catch (err) {
    console.error("UPDATE SETTINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};