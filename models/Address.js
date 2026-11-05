const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  address: String,
  street: String,
  city: String,
  country: String,
  coordinates: [{lat: 0}, {long: 0}]
});

module.exports = mongoose.model("Address", addressSchema);