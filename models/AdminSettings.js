const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    // --- Core Platform ---
    commissionRate: { type: Number, default: 15, min: 0, max: 100 },
    deliveryCharge: { type: Number, default: 2.5, min: 0 },
    serviceArea: { type: String, default: "" },
    supportEmail: { type: String, default: "" },

    // --- Taxes & Surge ---
    salesTaxRate: { type: Number, default: 13, min: 0, max: 100 }, // e.g. Sindh Sales Tax
    isSurgePricingActive: { type: Boolean, default: false },
    surgeMultiplier: { type: Number, default: 1.2, min: 1, max: 3 },

    // --- Payment Gateways ---
    paymentGateways: {
      codEnabled: { type: Boolean, default: true },
      stripeEnabled: { type: Boolean, default: true },
      stripePublicKey: { type: String, default: "" },
      easypaisaEnabled: { type: Boolean, default: false },
      jazzcashEnabled: { type: Boolean, default: false },
    },

    // --- Localization ---
    localization: {
      currencySymbol: { type: String, default: "PKR" },
      defaultLanguage: { type: String, default: "en" },
      timeZone: { type: String, default: "Asia/Karachi" },
    },

    // --- Roles & Permissions Matrix ---
    rolesConfig: [
      {
        roleName: { type: String, required: true }, // e.g., 'manager', 'support', 'finance'
        permissions: [{ type: String }], // e.g., ['manage_orders', 'view_analytics', 'payout_vendors']
      },
    ],

    // --- System Control ---
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);