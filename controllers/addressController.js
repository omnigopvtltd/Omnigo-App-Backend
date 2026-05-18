const Address = require("../models/Address");
const { getIO } = require("../socket");


// ================= ADD ADDRESS =================
exports.addAddress = async (req, res) => {
  try {
    const io = getIO();

    const { street, city, country, zip } = req.body;

    if (!street || !city || !country) {
      return res.status(400).json({ msg: "Required fields missing" });
    }

    const address = await Address.create({
      street,
      city,
      country,
      zip,
      userId: req.user.id
    });

    // 🔥 REAL TIME EVENT (USER ROOM)
    io.to(`user_${req.user.id}`).emit("address_added", {
      userId: req.user.id,
      address
    });

    res.json({
      msg: "Address added",
      address
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
  }
};


// ================= GET USER ADDRESSES =================
exports.getAddress = async (req, res) => {
  try {
    const addresses = await Address.find({
      userId: req.user.id
    });

    res.json({
      addresses
    });

  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};