const mongoose = require("mongoose");

const userSearchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    search: [{ type: String, required: true, trim: true }],

    // Optional: useful for analytics and tracking
    resultCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Compound index to quickly fetch recent searches per user
userSearchHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SearchHistory", userSearchHistorySchema);
