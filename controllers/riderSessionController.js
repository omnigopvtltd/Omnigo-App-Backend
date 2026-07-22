const RiderSession = require("../models/RiderSession");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");
const User = require("../models/User");

function isFullyVerified(rider) {
  return (
    rider.riderProfile?.cnicVerification?.status === "verified" &&
    rider.riderProfile?.faceVerification?.status === "verified"
  );
}

// =====================================
// ADMIN: CREATE SESSION
// =====================================
exports.createSession = async (req, res) => {
  try {
    const {
      title, description, requiredOrders, bonusAmount,
      minWalletBalance, timeLimitHours, startDate, endDate, isActive,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!requiredOrders || requiredOrders < 1) {
      return res.status(400).json({ success: false, message: "requiredOrders must be at least 1" });
    }
    if (bonusAmount === undefined || bonusAmount < 0) {
      return res.status(400).json({ success: false, message: "bonusAmount is required" });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const session = await RiderSession.create({
      title, description, requiredOrders, bonusAmount,
      minWalletBalance: minWalletBalance || 0,
      timeLimitHours: timeLimitHours || null,
      startDate, endDate, isActive,
    });

    return res.status(201).json({ success: true, message: "Session created successfully", session });
  } catch (err) {
    console.log("CREATE SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET ALL SESSIONS (admin sees all; riders see only currently joinable ones)
// =====================================
exports.getAllSessions = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role !== "admin") {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      RiderSession.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      RiderSession.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: sessions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      sessions,
    });
  } catch (err) {
    console.log("GET SESSIONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const session = await RiderSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    return res.status(200).json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: UPDATE SESSION
// =====================================
exports.updateSession = async (req, res) => {
  try {
    const session = await RiderSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const fields = [
      "title", "description", "requiredOrders", "bonusAmount",
      "minWalletBalance", "timeLimitHours", "startDate", "endDate", "isActive",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) session[field] = req.body[field];
    });

    await session.save();

    return res.status(200).json({ success: true, message: "Session updated successfully", session });
  } catch (err) {
    console.log("UPDATE SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: DELETE SESSION
// =====================================
exports.deleteSession = async (req, res) => {
  try {
    const activeParticipants = await RiderSessionParticipation.countDocuments({
      sessionId: req.params.id,
      status: "in_progress",
    });
    if (activeParticipants > 0) {
      return res.status(400).json({
        success: false,
        message: "Can't delete a session with riders currently in progress. Deactivate it instead.",
      });
    }

    const session = await RiderSession.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    return res.status(200).json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    console.log("DELETE SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: JOIN SESSION
// =====================================
exports.joinSession = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (rider.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked" });
    }
    if (!isFullyVerified(rider)) {
      return res.status(403).json({
        success: false,
        message: "Complete CNIC and face verification before joining a session",
      });
    }

    const existingActive = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: "You're already in an active session. Finish or leave it before joining another.",
      });
    }

    const session = await RiderSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (!session.isCurrentlyJoinable()) {
      return res.status(400).json({ success: false, message: "This session isn't currently open to join" });
    }

    const walletBalance = rider.wallet?.balance || 0;
    if (walletBalance < session.minWalletBalance) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${session.minWalletBalance} in your wallet to join this session`,
        requiredAmount: session.minWalletBalance,
        currentBalance: walletBalance,
      });
    }

    const expiresAt = session.timeLimitHours
      ? new Date(Date.now() + session.timeLimitHours * 60 * 60 * 1000)
      : null;

    const participation = await RiderSessionParticipation.create({
      sessionId: session._id,
      riderId: rider._id,
      bonusAmount: session.bonusAmount,
      requiredOrders: session.requiredOrders,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: `Joined session — complete ${session.requiredOrders} orders to earn ${session.bonusAmount}`,
      participation,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "You're already in an active session" });
    }
    console.log("JOIN SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: LEAVE SESSION (forfeits the bonus)
// =====================================
exports.leaveSession = async (req, res) => {
  try {
    const participation = await RiderSessionParticipation.findOne({
      riderId: req.user.id,
      status: "in_progress",
    });
    if (!participation) {
      return res.status(404).json({ success: false, message: "You don't have an active session" });
    }

    participation.status = "abandoned";
    participation.abandonedAt = new Date();
    participation.abandonReason = req.body.reason || "Left by rider";
    await participation.save();

    return res.status(200).json({
      success: true,
      message: "You've left the session. No bonus will be paid for this attempt.",
      participation,
    });
  } catch (err) {
    console.log("LEAVE SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: GET MY CURRENT SESSION STATUS
// =====================================
exports.getMySessionStatus = async (req, res) => {
  try {
    const participation = await RiderSessionParticipation.findOne({
      riderId: req.user.id,
      status: "in_progress",
    }).populate("sessionId", "title description requiredOrders bonusAmount");

    if (!participation) {
      return res.status(200).json({ success: true, active: false, participation: null });
    }

    // Auto-expire if a time limit was set and has passed
    if (participation.expiresAt && new Date() > participation.expiresAt) {
      participation.status = "abandoned";
      participation.abandonedAt = new Date();
      participation.abandonReason = "Time limit expired";
      await participation.save();
      return res.status(200).json({ success: true, active: false, participation, expired: true });
    }

    return res.status(200).json({ success: true, active: true, participation });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: GET SESSION PARTICIPANTS
// =====================================
exports.getSessionParticipants = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { sessionId: req.params.id };
    if (status && status !== "all") query.status = status;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [participants, total] = await Promise.all([
      RiderSessionParticipation.find(query)
        .populate("riderId", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      RiderSessionParticipation.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: participants.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      participants,
    });
  } catch (err) {
    console.log("GET SESSION PARTICIPANTS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};