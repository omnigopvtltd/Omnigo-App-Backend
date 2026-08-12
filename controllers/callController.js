// const CallLog = require("../models/callLog");
const CallLog = require("../models/callLog");
const User = require("../models/User");

function roleOf(req) {
  return req.user.role;
}

// =====================================
// INITIATE CALL (creates the log entry; actual audio is signaled over sockets)
// =====================================
exports.initiateCall = async (req, res) => {
  try {
    const { receiverId, conversationId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: "receiverId is required" });
    }

    const receiver = await User.findById(receiverId).select("role name");
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Receiver not found" });
    }

    const call = await CallLog.create({
      conversationId: conversationId || null,
      callerId: req.user.id,
      callerRole: roleOf(req),
      receiverId,
      receiverRole: receiver.role,
      status: "ringing",
      startedAt: new Date(),
    });

    // Ring the receiver over sockets — see SOCKET_CHAT_CALL_INTEGRATION.md
    try {
      const { getIO } = require("../socket");
      getIO().to(`user_${receiverId}`).emit("call:incoming", {
        callId: call._id,
        callerId: req.user.id,
        callerRole: roleOf(req),
      });
    } catch (socketErr) {
      console.log("SOCKET BROADCAST SKIPPED:", socketErr.message);
    }

    return res.status(201).json({ success: true, call });
  } catch (err) {
    console.log("INITIATE CALL ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// UPDATE CALL STATUS (accepted / rejected / ended)
// =====================================
exports.updateCallStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["ongoing", "completed", "missed", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: "Call not found" });

    if (status === "ongoing" && !call.connectedAt) {
      call.connectedAt = new Date();
    }
    if (["completed", "missed", "rejected"].includes(status)) {
      call.endedAt = new Date();
      if (call.connectedAt) {
        call.durationSeconds = Math.max(0, Math.round((call.endedAt - call.connectedAt) / 1000));
      }
    }
    call.status = status;
    await call.save();

    try {
      const { getIO } = require("../socket");
      const io = getIO();
      [call.callerId, call.receiverId].forEach((uid) =>
        io.to(`user_${uid}`).emit("call:statusUpdated", { callId: call._id, status })
      );
    } catch (socketErr) {
      console.log("SOCKET BROADCAST SKIPPED:", socketErr.message);
    }

    return res.status(200).json({ success: true, call });
  } catch (err) {
    console.log("UPDATE CALL STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET CALL LOGS (admin: everyone; user: their own)
// =====================================
exports.getCallLogs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (roleOf(req) !== "admin") {
      query.$or = [{ callerId: req.user.id }, { receiverId: req.user.id }];
    }
    if (status && status !== "all") query.status = status;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [calls, total] = await Promise.all([
      CallLog.find(query)
        .populate("callerId", "name phone")
        .populate("receiverId", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CallLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: calls.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      calls,
    });
  } catch (err) {
    console.log("GET CALL LOGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};