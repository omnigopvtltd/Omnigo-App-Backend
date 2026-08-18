const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    country: { type: String, default: "Pakistan", trim: true,},
    city: { type: String, default: "Chakwal", trim: true,},
    zone: { type: String, required: true, unique: true, trim: true, },
    areas: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);