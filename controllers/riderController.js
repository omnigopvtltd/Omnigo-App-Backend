const User = require("../models/User");
const Order = require("../models/Order");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");

// =====================================
// ADMIN: CREATE RIDER ACCOUNT
// =====================================
exports.createRider = async (req, res) => {
  try {
    const { name, email, phone, password, vehicleType, vehiclePlate, vehicleModel } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone, and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "A user with this email already exists" });
    }

    // Relies on your existing User pre-save hook to hash `password`.
    // If your schema doesn't hash on save, hash it here before creating.
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
        cnicVerification: { status: "not_submitted" },
        faceVerification: { status: "not_submitted" },
      },
    });

    const riderSafe = rider.toObject();
    delete riderSafe.password;

    return res.status(201).json({ success: true, message: "Rider created successfully", rider: riderSafe });
  } catch (err) {
    console.log("CREATE RIDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: GET ALL RIDERS (filter, search, paginate)
// =====================================
exports.getAllRiders = async (req, res) => {
  try {
    const {
      search,
      isBlocked,
      isOnline,
      cnicStatus,
      faceStatus,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { role: "rider" };
    if (isBlocked !== undefined) query.isBlocked = isBlocked === "true";
    if (isOnline !== undefined) query["riderProfile.isOnline"] = isOnline === "true";
    if (cnicStatus) query["riderProfile.cnicVerification.status"] = cnicStatus;
    if (faceStatus) query["riderProfile.faceVerification.status"] = faceStatus;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [riders, total] = await Promise.all([
      User.find(query).select("-password").sort(sort).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    const riderIds = riders.map((r) => r._id);
    const [activeStats, deliveredStats] = await Promise.all([
      Order.aggregate([
        { $match: { riderId: { $in: riderIds }, status: "ongoing" } },
        { $group: { _id: "$riderId", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { riderId: { $in: riderIds }, status: "delivered" } },
        { $group: { _id: "$riderId", count: { $sum: 1 } } },
      ]),
    ]);
    const activeMap = new Map(activeStats.map((s) => [String(s._id), s.count]));
    const deliveredMap = new Map(deliveredStats.map((s) => [String(s._id), s.count]));

    const enriched = riders.map((r) => ({
      ...r.toObject(),
      activeOrders: activeMap.get(String(r._id)) || 0,
      deliveredCount: deliveredMap.get(String(r._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      count: enriched.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      riders: enriched,
    });
  } catch (err) {
    console.log("GET RIDERS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
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