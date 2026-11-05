const mongoose = require("mongoose");

const accountDeleteRequestSchema = new mongoose.Schema({
  appName: String,
  name: String,
  email: String,
  request: { type: String, default: "" },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("AccountDeleteRequest", accountDeleteRequestSchema);
