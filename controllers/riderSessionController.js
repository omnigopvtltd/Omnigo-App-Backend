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

    // if (req.user.role !== "admin") {
    //   const now = new Date();
    //   query.isActive = true;
    //   query.startDate = { $lte: now };
    //   query.endDate = { $gte: now };
    // } else if (isActive !== undefined) {
    //   query.isActive = isActive === "true";
    // }

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

// // =====================================
// // RIDER: JOIN SESSION
// // =====================================
// exports.joinSession = async (req, res) => {
//   try {
//     const rider = await User.findOne({ _id: req.user.id, role: "rider" });
//     if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

//     if (rider.isBlocked) {
//       return res.status(403).json({ success: false, message: "Your account is blocked" });
//     }
//     if (!isFullyVerified(rider)) {
//       return res.status(403).json({
//         success: false,
//         message: "Complete CNIC and face verification before joining a session",
//       });
//     }

//     const existingActive = await RiderSessionParticipation.findOne({
//       riderId: rider._id,
//       status: "in_progress",
//     });
//     if (existingActive) {
//       return res.status(400).json({
//         success: false,
//         message: "You're already in an active session. Finish or leave it before joining another.",
//       });
//     }

//     const session = await RiderSession.findById(req.params.id);
//     if (!session) return res.status(404).json({ success: false, message: "Session not found" });
//     if (!session.isCurrentlyJoinable()) {
//       return res.status(400).json({ success: false, message: "This session isn't currently open to join" });
//     }

//     const walletBalance = rider.wallet?.balance || 0;
//     if (walletBalance < session.minWalletBalance) {
//       return res.status(400).json({
//         success: false,
//         message: `You need at least ${session.minWalletBalance} in your wallet to join this session`,
//         requiredAmount: session.minWalletBalance,
//         currentBalance: walletBalance,
//       });
//     }

//     const expiresAt = session.timeLimitHours
//       ? new Date(Date.now() + session.timeLimitHours * 60 * 60 * 1000)
//       : null;

//     const participation = await RiderSessionParticipation.create({
//       sessionId: session._id,
//       riderId: rider._id,
//       bonusAmount: session.bonusAmount,
//       requiredOrders: session.requiredOrders,
//       expiresAt,
//     });

//     return res.status(201).json({
//       success: true,
//       message: `Joined session — complete ${session.requiredOrders} orders to earn ${session.bonusAmount}`,
//       participation,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ success: false, message: "You're already in an active session" });
//     }
//     console.log("JOIN SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// =====================================
// RIDER: JOIN / BOOK SESSION
// =====================================
exports.joinSession = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (rider.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked" });
    }
    // if (!isFullyVerified(rider)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Complete CNIC and face verification before joining a session",
    //   });
    // }

    // 1. Check for active or already booked session
    const existingActive = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });

    const existingBooked = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "booked",
    });

    // Prevent booking more than 1 session in advance
    if (existingActive && existingBooked) {
      return res.status(400).json({
        success: false,
        message: "You already have an active session AND a booked session queued up.",
      });
    }
    const session = await RiderSession.findById(req.params.id);
    console.log(session);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // if (!session.isCurrentlyJoinable()) {
    //   return res.status(400).json({ success: false, message: "This session isn't currently open to join" });
    // }

    const walletBalance = rider.wallet?.balance || 0;
    if (walletBalance < session.minWalletBalance) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${session.minWalletBalance} in your wallet to join this session`,
        requiredAmount: session.minWalletBalance,
        currentBalance: walletBalance,
      });
    }

    // Prevent booking the exact same session twice
    const alreadyParticipating = await RiderSessionParticipation.findOne({
      sessionId: session._id,
      riderId: rider._id,
      status: { $in: ["in_progress", "booked"] },
    });
    if (alreadyParticipating) {
      return res.status(400).json({
        success: false,
        message: "You are already in or have booked this exact session.",
      });
    }

    // 2. Determine initial status & start time
    const isBookedMode = !!existingActive; // If actively in a session, mark this one as 'booked'
    const status = isBookedMode ? "booked" : "in_progress";
    const startedAt = isBookedMode ? null : new Date();

    // Timer only calculates if it starts immediately
    const expiresAt = (!isBookedMode && session.timeLimitHours)
      ? new Date(Date.now() + session.timeLimitHours * 60 * 60 * 1000)
      : null;

    const participation = await RiderSessionParticipation.create({
      sessionId: session._id,
      riderId: rider._id,
      status,
      bonusAmount: session.bonusAmount,
      requiredOrders: session.requiredOrders,
      startedAt,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: isBookedMode
        ? `Session booked successfully! It will automatically start once your current session ends.`
        : `Joined session — complete ${session.requiredOrders} orders to earn ${session.bonusAmount}`,
      participation,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "You already have a participation record for this session." });
    }
    console.log("JOIN SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// helpers/sessionHelper.js
exports.activateNextBookedSession = async (riderId) => {
  const bookedSession = await RiderSessionParticipation.findOne({
    riderId,
    status: "booked",
  }).populate("sessionId");

  if (!bookedSession) return null;

  const session = bookedSession.sessionId;
  const now = new Date();
  
  // Calculate expiry based on the activation time
  const expiresAt = session?.timeLimitHours
    ? new Date(now.getTime() + session.timeLimitHours * 60 * 60 * 1000)
    : null;

  bookedSession.status = "in_progress";
  bookedSession.startedAt = now;
  bookedSession.expiresAt = expiresAt;

  await bookedSession.save();
  return bookedSession;
};

// =====================================
// RIDER: COMPLETE SESSION
// =====================================
exports.completeSession = async (req, res) => {
  try {
    // 1. Verify rider existence and status
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (rider.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked" });
    }

    // 2. Find current active session
    const currentParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });

    if (!currentParticipation) {
      return res.status(404).json({
        success: false,
        message: "No active session found to complete.",
      });
    }

    // 3. Check for expiration
    if (currentParticipation.expiresAt && new Date() > new Date(currentParticipation.expiresAt)) {
      currentParticipation.status = "expired";
      await currentParticipation.save();

      // Even if expired, try activating the next booked session
      const nextSession = await activateNextBookedSession(rider._id);

      return res.status(400).json({
        success: false,
        message: "Session time limit has expired. Bonus cannot be claimed.",
        nextSessionStarted: !!nextSession,
      });
    }

    // 4. Verify completion condition (Required orders met)
    if (currentParticipation.completedOrders < currentParticipation.requiredOrders) {
      return res.status(400).json({
        success: false,
        message: `You haven't reached the required orders yet. (${currentParticipation.completedOrders}/${currentParticipation.requiredOrders})`,
        completedOrders: currentParticipation.completedOrders,
        requiredOrders: currentParticipation.requiredOrders,
      });
    }

    // 5. Update session status
    currentParticipation.status = "completed";
    currentParticipation.completedAt = new Date();
    await currentParticipation.save();

    // 6. Credit bonus to rider's wallet
    const bonusAmount = currentParticipation.bonusAmount || 0;
    if (bonusAmount > 0) {
      if (!rider.wallet) {
        rider.wallet = { balance: 0 };
      }
      rider.wallet.balance = (rider.wallet.balance || 0) + bonusAmount;
      await rider.save();
    }

    // 7. Activate the next queued/booked session
    const newActiveSession = await activateNextBookedSession(rider._id);

    return res.status(200).json({
      success: true,
      message: `Session completed successfully! Added ${bonusAmount} to your wallet.`,
      bonusEarned: bonusAmount,
      updatedWalletBalance: rider.wallet.balance,
      completedSession: currentParticipation,
      nextSessionStarted: !!newActiveSession,
      nextSession: newActiveSession || null,
    });
  } catch (err) {
    console.error("COMPLETE SESSION ERROR:", err);
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

// =====================================
// RIDER: GET BOOKED SESSIONS
// =====================================
exports.getBookedSessions = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch all participation records where status is 'booked' (queued)
    const bookedSessions = await RiderSessionParticipation.find({
      riderId,
      status: "booked",
    })
      .populate("sessionId") 
      .sort({ createdAt: 1 }); 

    return res.status(200).json({
      success: true,
      count: bookedSessions.length,
      data: bookedSessions,
    });
  } catch (err) {
    console.error("GET BOOKED SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// =====================================
// RIDER: GET COMPLETED SESSIONS
// =====================================
exports.getRiderCompletedSessions = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch all participation records where status is 'Completed' (queued)
    const completedSessions = await RiderSessionParticipation.find({
      riderId,
      status: "completed",
    })
      .populate("sessionId") 
      .sort({ createdAt: 1 }); 

    return res.status(200).json({
      success: true,
      count: completedSessions.length,
      data: completedSessions,
    });
  } catch (err) {
    console.error("GET COMPLETED SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// =====================================
// RIDER: GET Cancelled SESSIONS
// =====================================
exports.getRiderCancelledSessions = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch all participation records where status is 'Cancelled' (queued)
    const cancelledSession = await RiderSessionParticipation.find({
      riderId,
      status: "cancelled",
    })
      .populate("sessionId") 
      .sort({ createdAt: 1 }); 

    return res.status(200).json({
      success: true,
      count: cancelledSession.length,
      data: cancelledSession,
    });
  } catch (err) {
    console.error("GET COMPLETED SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// RIDER: GET SESSIONS HISTORY
// =====================================
exports.getRiderSessionHistory = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch all participation records where status is 'Completed' (queued)
    const completedSessions = await RiderSessionParticipation.find({
      riderId,
      status: "completed",
    })
      .populate("sessionId") 
      .sort({ createdAt: 1 }); 

    // Fetch all participation records where status is 'Cancelled' (queued)
    const cancelledSession = await RiderSessionParticipation.find({
      riderId,
      status: "cancelled",
    })
      .populate("sessionId") 
      .sort({ createdAt: 1 }); 

      const getSessionHistory = [...completedSessions ,...cancelledSession];

    return res.status(200).json({
      success: true,
      count: getSessionHistory.length,
      data: getSessionHistory,
    });
  } catch (err) {
    console.error("GET COMPLETED SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: GET COMINNG SOON SESSIONS 
// =====================================
exports.getComingSoonSessions = async (req, res) => {
  try {
    const riderId = req.user.id;
    const now = new Date();

    // 1. Get IDs of sessions the rider is actively in or has booked
    const activeOrBookedParticipations = await RiderSessionParticipation.find({
      riderId,
      status: { $in: ["in_progress", "booked"] },
    }).select("sessionId");

    const excludeSessionIds = activeOrBookedParticipations.map(
      (p) => p.sessionId
    );

    // 2. Query upcoming sessions:
    // - Not currently expired/ended
    // - Start time is in the future (or marked status as 'upcoming'/'inactive')
    // - Excludes sessions rider is already part of
    const comingSoonSessions = await RiderSession.find({
      _id: { $nin: excludeSessionIds },
      isActive: false,
      $or: [
        { startDate: { $gt: now } }, // Sessions scheduled for the future
        // { status: "upcoming" },      // Or explicit status flag if used
      ],
    }).sort({ startDate: 1 }); // Show nearest upcoming sessions first

    return res.status(200).json({
      success: true,
      count: comingSoonSessions.length,
      data: comingSoonSessions,
    });
  } catch (err) {
    console.error("GET COMING SOON SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// =====================================
// ADMIN: GET TODAY's SESSIONS 
// =====================================
exports.getTodaySessions = async (req, res) => {
  try {
    const now = new Date();

    // 1. Calculate start and end of Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Automatically mark sessions as "completed" if their endDate has passed
    await RiderSession.updateMany(
      {
        isActive: true,
        endDate: { $lt: now },
      },
      {
        $set: {
          status: "completed",
          isActive: false,
        },
      }
    );

    // 3. Fetch active sessions scheduled for today that haven't ended yet
    const todaySessions = await RiderSession.find({
      isActive: true,
      startDate: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
      endDate: { $gte: now }, // Ensures only ongoing or upcoming sessions for today are returned
    }).sort({ startDate: 1 });

    return res.status(200).json({
      success: true,
      count: todaySessions.length,
      data: todaySessions,
    });
  } catch (err) {
    console.error("GET TODAY SESSIONS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// RIDER: CANCEL BOOKED SESSION
// =====================================
exports.cancelBookedSession = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { id } = req.params; // Accepts participationId OR sessionId

    // 1. Find participation record that belongs to this rider and is currently in 'booked' status
    const bookedParticipation = await RiderSessionParticipation.findOne({
      $or: [{ _id: id }, { sessionId: id }],
      riderId,
      status: "booked",
    });

    if (!bookedParticipation) {
      return res.status(404).json({
        success: false,
        message:
          "No booked session found matching this ID, or the session is already active/completed.",
      });
    }

    // 2. Update status to 'cancelled' (or delete the record)
    bookedParticipation.status = "cancelled";
    bookedParticipation.cancelledAt = new Date();
    await bookedParticipation.save();

    // Option B: If you prefer completely removing the record from DB instead:
    // await bookedParticipation.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Booked session cancelled successfully.",
      cancelledSession: bookedParticipation,
    });
  } catch (err) {
    console.error("CANCEL BOOKED SESSION ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
//  EXTEND SESSION
// =====================================
exports.extendSession = async (req, res) => {
  try {
    const { extendHours } = req.body
    const session = await RiderSession.findById(req.params.id).select("timeLimitHours");
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

   
    if (extendHours !== undefined) session.timeLimitHours = extendHours;

    await session.save();

    return res.status(200).json({ success: true, message: "Session updated successfully", session });
  } catch (err) {
    console.log("UPDATE SESSION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};