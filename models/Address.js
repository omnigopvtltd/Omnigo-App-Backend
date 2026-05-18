const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  address: String,
  street: String,
  city: String,
  country: String
});

module.exports = mongoose.model("Address", addressSchema);