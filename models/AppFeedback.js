const mongoose = require("mongoose");

const appFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    deviceInfo: { type: String, default: "" }, // Optional: e.g., "Android 14, Samsung S23"
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppFeedback", appFeedbackSchema);