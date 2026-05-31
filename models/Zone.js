const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true, unique: true },
    areas: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);