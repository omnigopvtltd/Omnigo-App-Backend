const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  address: String,
  street: String,
  zone: String,
  area: String,
  city: String,
  country: String,
 coordinates: {
  lat: {
    type: Number,
    default: null
  },
  lng: {
    type: Number,
    default: null
  }
}
});

module.exports = mongoose.model("Address", addressSchema);