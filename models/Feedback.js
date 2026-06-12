const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    feedbackType: {
      type: String,
      enum: [
        "very_bad",
        "bad",
        "average",
        "good",
        "excellent",
      ],
    },

    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);