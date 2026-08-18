const User = require("../models/User");
const Order = require("../models/Order");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");
const jwt = require("jsonwebtoken");

// =====================================
// ADMIN: CREATE RIDER ACCOUNT
// =====================================
exports.createRider = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      vehicleType,
      vehiclePlate,
      vehicleModel,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone, and password are required",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Agar pre-save hook password hash karta hai to password ko aise hi rehne do
    const rider = await User.create({
      name,
      email,
      phone,
      password,
      role: "rider",
      wallet: { balance: 0 },
      riderProfile: {
        vehicleType: vehicleType || "bike",
        vehiclePlate: vehiclePlate || "",
        vehicleModel: vehicleModel || "",
        isOnline: false,
        cnicVerification: {
          status: "not_submitted",
        },
        faceVerification: {
          status: "not_submitted",
        },
      },
    });

    // JWT Token Generate
    const token = jwt.sign(
      {
        id: rider._id,
        role: rider.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    const riderSafe = rider.toObject();
    delete riderSafe.password;

    return res.status(201).json({
      success: true,
      message: "Rider created successfully",
      token,
      rider: riderSafe,
    });
  } catch (err) {
    console.log("CREATE RIDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: GET SINGLE RIDER (full profile)
// =====================================
exports.getRiderById = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: "rider" }).select("-password");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    const [currentOrders, deliveryHistory, sessionHistory] = await Promise.all([
      Order.find({ riderId: rider._id, status: "ongoing" }).populate("userId", "name phone"),
      Order.find({ riderId: rider._id, status: "delivered" }).sort({ updatedAt: -1 }).limit(20),
      RiderSessionParticipation.find({ riderId: rider._id })
        .populate("sessionId", "title requiredOrders bonusAmount")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    return res.status(200).json({
      success: true,
      rider,
      currentOrders,
      deliveryHistory,
      sessionHistory,
    });
  } catch (err) {
    console.log("GET RIDER DETAILS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getRiderAutoAcceptOrders = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" }).select("riderProfile.autoAcceptOrders");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    return res.status(200).json({
      success: true,
      rider,
    });
  } catch (err) {
    console.log("GET RIDER DETAILS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// =====================================
// ADMIN: GET ALL RIDERS
// =====================================
exports.getAllRiders = async (req, res) => {
  try {
    const riders = await User.find({ role: "rider" }).select("-password");
    if (!riders.length) return res.status(404).json({ success: false, message: "No riders found" });

    const [currentOrders, deliveryHistory, sessionHistory] = await Promise.all([
      Order.find({ riderId: rider._id, status: "ongoing" }).populate("userId", "name phone"),
      Order.find({ riderId: rider._id, status: "delivered" }).sort({ updatedAt: -1 }).limit(20),
      RiderSessionParticipation.find({ riderId: rider._id })
        .populate("sessionId", "title requiredOrders bonusAmount")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    return res.status(200).json({
      success: true,
      riders,
      currentOrders,
      deliveryHistory,
      sessionHistory,
    });
  } catch (err) {
    console.log("GET RIDERS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: UPDATE RIDER PROFILE
// =====================================
exports.updateRider = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    const { name, phone, vehicleType, vehiclePlate, vehicleModel } = req.body;

    if (name) rider.name = name;
    if (phone) rider.phone = phone;

    rider.riderProfile = {
      ...(rider.riderProfile?.toObject?.() ?? rider.riderProfile ?? {}),
      ...(vehicleType && { vehicleType }),
      ...(vehiclePlate !== undefined && { vehiclePlate }),
      ...(vehicleModel !== undefined && { vehicleModel }),
    };

    await rider.save();

    const riderSafe = rider.toObject();
    delete riderSafe.password;

    return res.status(200).json({ success: true, message: "Rider updated successfully", rider: riderSafe });
  } catch (err) {
    console.log("UPDATE RIDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: BLOCK / UNBLOCK RIDER
// =====================================
exports.updateRiderBlockStatus = async (req, res) => {
  try {
    const { isBlocked } = req.body;

    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: "rider" },
      {
        isBlocked: !!isBlocked,
        ...(isBlocked && { "riderProfile.isOnline": false }),
      },
      { new: true }
    ).select("-password");

    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    return res.status(200).json({
      success: true,
      message: `Rider ${isBlocked ? "blocked" : "unblocked"} successfully`,
      rider,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: DELETE RIDER
// =====================================
exports.deleteRider = async (req, res) => {
  try {
    const rider = await User.findOneAndDelete({ _id: req.params.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    return res.status(200).json({ success: true, message: "Rider deleted successfully" });
  } catch (err) {
    console.log("DELETE RIDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};