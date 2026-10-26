// const RiderSession = require("../models/RiderSession");
// const RiderSessionParticipation = require("../models/RiderSessionParticipation");
// const User = require("../models/User");
// const { getFirestore } = require("firebase-admin/firestore");

// function isFullyVerified(rider) {
//   return (
//     rider.riderProfile?.cnicVerification?.status === "verified" &&
//     rider.riderProfile?.faceVerification?.status === "verified"
//   );
// }

// // Helper for Firebase sync safely
// const syncToFirestore = async (collectionName, docId, data) => {
//   try {
//     const db = getFirestore();

//     // 1. Convert Mongoose Document to plain object
//     const plainObject = data.toObject ? data.toObject() : data;

//     // 2. Safely serialize ObjectIds & complex types to plain JSON format
//     const cleanData = JSON.parse(JSON.stringify(plainObject));

//     // 3. Sync clean data to Firestore
//     await db
//       .collection(collectionName)
//       .doc(docId.toString())
//       .set(
//         {
//           ...cleanData,
//           updatedAt: new Date().toISOString(),
//         },
//         { merge: true },
//       );
//   } catch (fbErr) {
//     console.error(`Firebase Sync Error (${collectionName}):`, fbErr.message);
//   }
// };

// const deleteFromFirestore = async (collectionName, docId) => {
//   try {
//     const db = getFirestore();
//     await db.collection(collectionName).doc(docId.toString()).delete();
//   } catch (fbErr) {
//     console.error(`Firebase Delete Error (${collectionName}):`, fbErr.message);
//   }
// };

// // =====================================
// // ADMIN: CREATE SESSION
// // =====================================
// exports.createSession = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       requiredOrders,
//       bonusAmount,
//       minWalletBalance,
//       timeLimitHours,
//       startDate,
//       endDate,
//       isActive,
//     } = req.body;

//     if (!title)
//       return res
//         .status(400)
//         .json({ success: false, message: "Title is required" });
//     if (!requiredOrders || requiredOrders < 1) {
//       return res
//         .status(400)
//         .json({ success: false, message: "requiredOrders must be at least 1" });
//     }
//     if (bonusAmount === undefined || bonusAmount < 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "bonusAmount is required" });
//     }
//     if (!startDate) {
//       return res.status(400).json({
//         success: false,
//         message: "startDate and endDate are required",
//       });
//     }

//     const session = await RiderSession.create({
//       title,
//       description,
//       requiredOrders,
//       bonusAmount,
//       minWalletBalance: minWalletBalance || 0,
//       timeLimitHours: timeLimitHours || null,
//       startDate,
//       endDate,
//       isActive,
//     });

//     // 🔥 Real-time sync with Firebase Firestore
//     await syncToFirestore("rider_sessions", session._id, session.toObject());

//     return res.status(201).json({
//       success: true,
//       message: "Session created successfully",
//       session,
//     });
//   } catch (err) {
//     console.log("CREATE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // GET ALL SESSIONS (admin sees all; riders see only currently joinable ones)
// // =====================================
// exports.getAllSessions = async (req, res) => {
//   try {
//     const { isActive, page = 1, limit = 20 } = req.query;
//     const query = {};

//     // if (req.user.role !== "admin") {
//     //   const now = new Date();
//     //   query.isActive = true;
//     //   query.startDate = { $lte: now };
//     //   query.endDate = { $gte: now };
//     // } else if (isActive !== undefined) {
//     //   query.isActive = isActive === "true";
//     // }

//     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//     const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
//     const skip = (pageNum - 1) * limitNum;

//     const [sessions, total] = await Promise.all([
//       RiderSession.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum),
//       RiderSession.countDocuments(query),
//     ]);

//     return res.status(200).json({
//       success: true,
//       count: sessions.length,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum) || 1,
//       sessions,
//     });
//   } catch (err) {
//     console.log("GET SESSIONS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getSessionById = async (req, res) => {
//   try {
//     const session = await RiderSession.findById(req.params.id);
//     if (!session)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });
//     return res.status(200).json({ success: true, session });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // ADMIN: UPDATE SESSION
// // =====================================
// exports.updateSession = async (req, res) => {
//   try {
//     const session = await RiderSession.findById(req.params.id);
//     if (!session)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });

//     const fields = [
//       "title",
//       "description",
//       "requiredOrders",
//       "bonusAmount",
//       "minWalletBalance",
//       "timeLimitHours",
//       "startDate",
//       "endDate",
//       "isActive",
//     ];
//     fields.forEach((field) => {
//       if (req.body[field] !== undefined) session[field] = req.body[field];
//     });

//     await session.save();
//     // 🔥 Real-time sync with Firebase Firestore
//     await syncToFirestore("rider_sessions", session._id, session.toObject());

//     return res.status(200).json({
//       success: true,
//       message: "Session updated successfully",
//       session,
//     });
//   } catch (err) {
//     console.log("UPDATE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // ADMIN: DELETE SESSION
// // =====================================
// exports.deleteSession = async (req, res) => {
//   try {
//     const activeParticipants = await RiderSessionParticipation.countDocuments({
//       sessionId: req.params.id,
//       status: "in_progress",
//     });
//     if (activeParticipants > 0) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Can't delete a session with riders currently in progress. Deactivate it instead.",
//       });
//     }

//     const session = await RiderSession.findByIdAndDelete(req.params.id);
//     if (!session)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });

//     // 🔥 Delete from Firebase Firestore
//     await deleteFromFirestore("rider_sessions", req.params.id);

//     return res
//       .status(200)
//       .json({ success: true, message: "Session deleted successfully" });
//   } catch (err) {
//     console.log("DELETE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // RIDER: JOIN / BOOK SESSION
// // =====================================
// exports.joinSession = async (req, res) => {
//   try {
//     const rider = await User.findOne({ _id: req.user.id, role: "rider" });
//     if (!rider)
//       return res
//         .status(404)
//         .json({ success: false, message: "Rider not found" });

//     if (rider.isBlocked) {
//       return res
//         .status(403)
//         .json({ success: false, message: "Your account is blocked" });
//     }
//     // if (!isFullyVerified(rider)) {
//     //   return res.status(403).json({
//     //     success: false,
//     //     message: "Complete CNIC and face verification before joining a session",
//     //   });
//     // }

//     // 1. Check for active or already booked session
//     const existingActive = await RiderSessionParticipation.findOne({
//       riderId: rider._id,
//       status: "in_progress",
//     });

//     const existingBooked = await RiderSessionParticipation.findOne({
//       riderId: rider._id,
//       status: "booked",
//     });

//     const completedSession = await RiderSessionParticipation.findOne({
//       sessionId: req.params?.id,
//       riderId: rider._id,
//       status: "completed",
//     });

//     // Prevent booking more than 1 session in advance
//     if (existingActive && existingBooked) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "You already have an active session AND a booked session queued up.",
//       });
//     }

//     if (completedSession) {
//       return res.status(400).json({
//         success: false,
//         message: "You already completed this session",
//       });
//     }
//     const session = await RiderSession.findById(req.params.id);
//     console.log(session);
//     if (!session)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });

//     // if (!session.isCurrentlyJoinable()) {
//     //   return res.status(400).json({ success: false, message: "This session isn't currently open to join" });
//     // }

//     const walletBalance = rider.wallet?.balance || 0;
//     if (walletBalance < session.minWalletBalance) {
//       return res.status(400).json({
//         success: false,
//         message: `You need at least ${session.minWalletBalance} in your wallet to join this session`,
//         requiredAmount: session.minWalletBalance,
//         currentBalance: walletBalance,
//       });
//     }

//     // Prevent booking the exact same session twice
//     const alreadyParticipating = await RiderSessionParticipation.findOne({
//       sessionId: session._id,
//       riderId: rider._id,
//       status: { $in: ["in_progress", "booked"] },
//     });
//     if (alreadyParticipating) {
//       return res.status(400).json({
//         success: false,
//         message: "You are already in or have booked this exact session.",
//       });
//     }

//     // 2. Determine initial status & start time
//     const isBookedMode = !!existingActive; // If actively in a session, mark this one as 'booked'
//     const status = isBookedMode ? "booked" : "in_progress";
//     const startedAt = isBookedMode ? null : new Date();

//     // Timer only calculates if it starts immediately
//     const expiresAt =
//       !isBookedMode && session.timeLimitHours
//         ? new Date(Date.now() + session.timeLimitHours * 60 * 60 * 1000)
//         : null;

//     const now = new Date();
//     // Calculate individual expiration time (e.g., Now + 8 Hours)
//     const timeLimitHours = session.timeLimitHours || 8;
//     const sessionEndTime = new Date(
//       now.getTime() + timeLimitHours * 60 * 60 * 1000,
//     );

//     const participation = await RiderSessionParticipation.create({
//       sessionId: session._id,
//       riderId: rider._id,
//       status,
//       timeLimitHours: session.timeLimitHours,
//       bonusAmount: session.bonusAmount,
//       requiredOrders: session.requiredOrders,
//       startedAt,
//       sessionEndTime,
//       expiresAt,
//     });

//     // 🔥 Real-time sync participation with Firebase Firestore
//     await syncToFirestore(
//       "rider_session_participations",
//       participation._id,
//       participation.toObject(),
//     );

//     return res.status(201).json({
//       success: true,
//       message: isBookedMode
//         ? `Session booked successfully! It will automatically start once your current session ends.`
//         : `Joined session — complete ${session.requiredOrders} orders to earn ${session.bonusAmount}`,
//       participation,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: "You already have a participation record for this session.",
//       });
//     }
//     console.log("JOIN SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // helpers/sessionHelper.js
// exports.activateNextBookedSession = async (riderId) => {
//   const bookedSession = await RiderSessionParticipation.findOne({
//     riderId,
//     status: "booked",
//   }).populate("sessionId");

//   if (!bookedSession) return null;

//   const session = bookedSession.sessionId;
//   const now = new Date();

//   // Calculate expiry based on the activation time
//   const expiresAt = session?.timeLimitHours
//     ? new Date(now.getTime() + session.timeLimitHours * 60 * 60 * 1000)
//     : null;

//   bookedSession.status = "in_progress";
//   bookedSession.startedAt = now;
//   bookedSession.expiresAt = expiresAt;

//   await bookedSession.save();

//   // 🔥 Sync updated status to Firebase
//   await syncToFirestore(
//     "rider_session_participations",
//     bookedSession._id,
//     bookedSession.toObject(),
//   );

//   return bookedSession;
// };

// // =====================================
// // RIDER: COMPLETE SESSION
// // =====================================
// exports.completeSession = async (req, res) => {
//   try {
//     // 1. Verify rider existence and status
//     const rider = await User.findOne({ _id: req.user.id, role: "rider" });
//     if (!rider) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Rider not found" });
//     }

//     if (rider.isBlocked) {
//       return res
//         .status(403)
//         .json({ success: false, message: "Your account is blocked" });
//     }

//     // 2. Find current active session
//     const currentParticipation = await RiderSessionParticipation.findOne({
//       riderId: rider._id,
//       status: "in_progress",
//     });

//     if (!currentParticipation) {
//       return res.status(404).json({
//         success: false,
//         message: "No active session found to complete.",
//       });
//     }

//     // 3. Check for expiration
//     if (
//       currentParticipation.expiresAt &&
//       new Date() > new Date(currentParticipation.expiresAt)
//     ) {
//       currentParticipation.status = "expired";
//       await currentParticipation.save();

//       await syncToFirestore(
//         "rider_session_participations",
//         currentParticipation._id,
//         currentParticipation.toObject(),
//       );
//       // Even if expired, try activating the next booked session
//       const nextSession = await activateNextBookedSession(rider._id);

//       return res.status(400).json({
//         success: false,
//         message: "Session time limit has expired. Bonus cannot be claimed.",
//         nextSessionStarted: !!nextSession,
//       });
//     }

//     // 4. Verify completion condition (Required orders met)
//     if (
//       currentParticipation.completedOrders < currentParticipation.requiredOrders
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `You haven't reached the required orders yet. (${currentParticipation.completedOrders}/${currentParticipation.requiredOrders})`,
//         completedOrders: currentParticipation.completedOrders,
//         requiredOrders: currentParticipation.requiredOrders,
//       });
//     }

//     // 5. Update session status
//     currentParticipation.status = "completed";
//     currentParticipation.completedAt = new Date();
//     await currentParticipation.save();

//     // 6. Credit bonus to rider's wallet
//     const bonusAmount = currentParticipation.bonusAmount || 0;
//     if (bonusAmount > 0) {
//       if (!rider.wallet) {
//         rider.wallet = { balance: 0 };
//       }
//       rider.wallet.balance = (rider.wallet.balance || 0) + bonusAmount;
//       await rider.save();
//     }

//     // 7. Activate the next queued/booked session
//     const newActiveSession = await activateNextBookedSession(rider._id);

//     return res.status(200).json({
//       success: true,
//       message: `Session completed successfully! Added ${bonusAmount} to your wallet.`,
//       bonusEarned: bonusAmount,
//       updatedWalletBalance: rider.wallet.balance,
//       completedSession: currentParticipation,
//       nextSessionStarted: !!newActiveSession,
//       nextSession: newActiveSession || null,
//     });
//   } catch (err) {
//     console.error("COMPLETE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // RIDER: LEAVE SESSION (forfeits the bonus)
// // =====================================
// exports.leaveSession = async (req, res) => {
//   try {
//     const participation = await RiderSessionParticipation.findOne({
//       riderId: req.user.id,
//       status: "in_progress" || "booked",
//     });
//     if (!participation) {
//       return res
//         .status(404)
//         .json({ success: false, message: "You don't have an active session" });
//     }

//     participation.status = "abandoned";
//     participation.abandonedAt = new Date();
//     participation.abandonReason = req.body.reason || "Left by rider";
//     await participation.save();

//     await syncToFirestore(
//       "rider_session_participations",
//       participation._id,
//       participation.toObject(),
//     );

//     return res.status(200).json({
//       success: true,
//       message:
//         "You've left the session. No bonus will be paid for this attempt.",
//       participation,
//     });
//   } catch (err) {
//     console.log("LEAVE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // RIDER: GET MY CURRENT SESSION STATUS
// // =====================================
// exports.getMySessionStatus = async (req, res) => {
//   try {
//     const participation = await RiderSessionParticipation.findOne({
//       riderId: req.user.id,
//       status: "in_progress" || "booked",
//     }).populate("sessionId", "title description requiredOrders bonusAmount");

//     if (!participation) {
//       return res
//         .status(200)
//         .json({ success: true, active: false, participation: null });
//     }

//     // Auto-expire if a time limit was set and has passed
//     if (participation.expiresAt && new Date() > participation.expiresAt) {
//       participation.status = "abandoned";
//       participation.abandonedAt = new Date();
//       participation.abandonReason = "Time limit expired";
//       await participation.save();

//       await syncToFirestore(
//         "rider_session_participations",
//         participation._id,
//         participation.toObject(),
//       );

//       return res
//         .status(200)
//         .json({ success: true, active: false, participation, expired: true });
//     }

//     return res.status(200).json({ success: true, active: true, participation });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // ADMIN: GET SESSION PARTICIPANTS
// // =====================================
// exports.getSessionParticipants = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 20 } = req.query;
//     const query = { sessionId: req.params.id };
//     if (status && status !== "all") query.status = status;

//     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//     const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
//     const skip = (pageNum - 1) * limitNum;

//     const [participants, total] = await Promise.all([
//       RiderSessionParticipation.find(query)
//         .populate("riderId", "name phone")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum),
//       RiderSessionParticipation.countDocuments(query),
//     ]);

//     return res.status(200).json({
//       success: true,
//       count: participants.length,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum) || 1,
//       participants,
//     });
//   } catch (err) {
//     console.log("GET SESSION PARTICIPANTS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // RIDER: GET BOOKED SESSIONS
// // =====================================
// exports.getBookedSessions = async (req, res) => {
//   try {
//     const riderId = req.user.id;

//     // Fetch all participation records where status is 'booked' (queued)
//     const bookedSessions = await RiderSessionParticipation.find({
//       riderId,
//       status: "booked",
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     return res.status(200).json({
//       success: true,
//       count: bookedSessions.length,
//       data: bookedSessions,
//     });
//   } catch (err) {
//     console.error("GET BOOKED SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// // =====================================
// // RIDER: GET COMPLETED SESSIONS
// // =====================================
// exports.getRiderCompletedSessions = async (req, res) => {
//   try {
//     const riderId = req.user.id;

//     const { startDate } = req.query;

//     // Fetch all participation records where status is 'Completed' (queued)
//     const completedSessions = await RiderSessionParticipation.find({
//       riderId,
//       status: "completed",
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     return res.status(200).json({
//       success: true,
//       count: completedSessions.length,
//       data: completedSessions,
//     });
//   } catch (err) {
//     console.error("GET COMPLETED SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// // =====================================
// // RIDER: GET Cancelled SESSIONS
// // =====================================
// exports.getRiderCancelledSessions = async (req, res) => {
//   try {
//     const riderId = req.user.id;

//     // Fetch all participation records where status is 'Cancelled' (queued)
//     const cancelledSession = await RiderSessionParticipation.find({
//       riderId,
//       status: "cancelled",
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     return res.status(200).json({
//       success: true,
//       count: cancelledSession.length,
//       data: cancelledSession,
//     });
//   } catch (err) {
//     console.error("GET COMPLETED SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // =====================================
// // RIDER: GET SESSIONS HISTORY
// // =====================================
// exports.getRiderSessionHistory = async (req, res) => {
//   try {
//     const riderId = req.user.id;

//     // Fetch all participation records where status is 'Completed' (queued)
//     const completedSessions = await RiderSessionParticipation.find({
//       riderId,
//       status: "completed",
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     // Fetch all participation records where status is 'Cancelled' (queued)
//     const cancelledSession = await RiderSessionParticipation.find({
//       riderId,
//       status: { $in: ["abandoned", "cancelled"]},
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     const expiredSession = await RiderSessionParticipation.find({
//       riderId,
//       status: "expired",
//     })
//       .populate("sessionId")
//       .sort({ createdAt: 1 });

//     const getSessionHistory = [...completedSessions, ...cancelledSession, ...expiredSession];

//     return res.status(200).json({
//       success: true,
//       count: getSessionHistory.length,
//       data: getSessionHistory,
//     });
//   } catch (err) {
//     console.error("GET COMPLETED SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // =====================================
// // ADMIN: GET COMINNG SOON SESSIONS
// // =====================================
// exports.getComingSoonSessions = async (req, res) => {
//   try {
//     const riderId = req.user.id;
//     const now = new Date();

//     // 1. Get IDs of sessions the rider is actively in or has booked
//     const activeOrBookedParticipations = await RiderSessionParticipation.find({
//       riderId,
//       status: { $in: ["in_progress", "booked"] },
//     }).select("sessionId");

//     const excludeSessionIds = activeOrBookedParticipations.map(
//       (p) => p.sessionId,
//     );

//     // 2. Query upcoming sessions:
//     // - Not currently expired/ended
//     // - Start time is in the future (or marked status as 'upcoming'/'inactive')
//     // - Excludes sessions rider is already part of
//     const comingSoonSessions = await RiderSession.find({
//       _id: { $nin: excludeSessionIds },
//       isActive: false,
//       $or: [
//         { startDate: { $gt: now } }, // Sessions scheduled for the future
//         // { status: "upcoming" },      // Or explicit status flag if used
//       ],
//     }).sort({ startDate: 1 }); // Show nearest upcoming sessions first

//     return res.status(200).json({
//       success: true,
//       count: comingSoonSessions.length,
//       data: comingSoonSessions,
//     });
//   } catch (err) {
//     console.error("GET COMING SOON SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// // =====================================
// // ADMIN: GET TODAY's SESSIONS
// // =====================================
// exports.getTodaySessions = async (req, res) => {
//   try {
//     const now = new Date();

//     // 1. Calculate start and end of Today
//     const startOfToday = new Date();
//     startOfToday.setHours(0, 0, 0, 0);

//     const endOfToday = new Date();
//     endOfToday.setHours(23, 59, 59, 999);

//     // 2. (Optional) Automatically mark sessions as "completed" if their endDate has passed
//     // await RiderSession.updateMany(
//     //   {
//     //     isActive: true,
//     //      status: { $in: ["in_progress"] },
//     //     endDate: { $lt: now },
//     //   },
//     //   {
//     //     $set: {
//     //       status: "expired",
//     //       isActive: false,
//     //     },
//     //   }
//     // );

//     // 3. Fetch all sessions scheduled for today using a date range
//     const todaySessions = await RiderSession.find({
//       startDate: {
//         $gte: startOfToday,
//         $lte: endOfToday,
//       },
//       // Agar aapko sirf active ya pending sessions chahiyein toh in filters ko uncomment kar dein:
//       isActive: true,
//       status: "pending",
//     }).sort({ startDate: 1 });

//     return res.status(200).json({
//       success: true,
//       count: todaySessions.length,
//       data: todaySessions,
//     });
//   } catch (err) {
//     console.error("GET TODAY SESSIONS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // =====================================
// // RIDER: CANCEL BOOKED SESSION
// // =====================================
// exports.cancelBookedSession = async (req, res) => {
//   try {
//     const riderId = req.user.id;
//     const { id } = req.params; // Accepts participationId OR sessionId

//     // 1. Find participation record that belongs to this rider and is currently in 'booked' status
//     const bookedParticipation = await RiderSessionParticipation.findOne({
//       $or: [{ _id: id }, { sessionId: id }],
//       riderId,
//       status: "booked",
//     });

//     if (!bookedParticipation) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "No booked session found matching this ID, or the session is already active/completed.",
//       });
//     }

//     // 2. Update status to 'cancelled' (or delete the record)
//     bookedParticipation.status = "cancelled";
//     bookedParticipation.cancelledAt = new Date();
//     await bookedParticipation.save();

//     await syncToFirestore(
//       "rider_session_participations",
//       bookedParticipation._id,
//       bookedParticipation.toObject(),
//     );

//     // Option B: If you prefer completely removing the record from DB instead:
//     // await bookedParticipation.deleteOne();

//     return res.status(200).json({
//       success: true,
//       message: "Booked session cancelled successfully.",
//       cancelledSession: bookedParticipation,
//     });
//   } catch (err) {
//     console.error("CANCEL BOOKED SESSION ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // =====================================
// //  EXTEND SESSION
// // =====================================
// exports.extendSession = async (req, res) => {
//   try {
//      const riderId = req.user.id;
//     const { extendHours } = req.body;
//     const session = await RiderSession.findById(req.params.id).select(
//       "timeLimitHours bonusAmount requiredOrders status",
//     );

//      const currentParticipation = await RiderSessionParticipation.findOne({
//       riderId: riderId,
//       status: "in_progress",
//     });

//     if (!session && currentParticipation)
//       return res
//         .status(404)
//         .json({ success: false, message: "Session not found" });

//     if (extendHours !== undefined && currentParticipation.isExtend12 == false && extendHours == 4 ) {
//       currentParticipation.timeLimitHours += extendHours;
//       currentParticipation.requiredOrders = 23;
//       currentParticipation.bonusAmount = 230;
//       currentParticipation.extendHours = extendHours;
//       currentParticipation.isExtend12 = true;

//       // currentParticipation.status = "in_progress";
//       await currentParticipation.save();
//     } else if (extendHours !== undefined && currentParticipation.isExtend12 == true && currentParticipation.isExtend16 == false && extendHours == 4) {
//       currentParticipation.timeLimitHours += extendHours;
//       currentParticipation.requiredOrders = 27;
//       currentParticipation.bonusAmount = 486;
//       currentParticipation.extendHours = extendHours;
//       currentParticipation.isExtend16 = true;

//       // currentParticipation.status = "in_progress";
//       await currentParticipation.save();
//     } else {
//       return res
//         .status(400)
//         .json({ success: false, message: "Extend Hours must be 12 or 16" });
//     }

//     await syncToFirestore(
//       "rider_session_participations",
//       currentParticipation._id,
//       currentParticipation.toObject(),
//       );

//     return res.status(200).json({
//       success: true,
//       message: "Session updated successfully",
//       currentParticipation,
//     });
//   } catch (err) {
//     console.log("UPDATE SESSION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // AUTO EXPIRE SESSIONS
// // =====================================
// exports.autoExpireSessions = async (req, res) => {
//   try {
//     const now = new Date();

//     // In tamam ACTIVE sessions ko find karke EXPIRED kar do jinka time khatam ho chuka hai
//     const result = await RiderSession.updateMany(
//       {
//         status: "ACTIVE",
//         sessionEndTime: { $lt: now }, // sessionEndTime past mein chali gayi ho
//       },
//       {
//         $set: {
//           status: "EXPIRED",
//           isBonusEligible: false,
//         },
//       },
//     );

//     return res.status(200).json({
//       success: true,
//       message: `${result.modifiedCount} sessions automatically expired.`,
//       expiredCount: result.modifiedCount,
//     });
//   } catch (err) {
//     console.error("AUTO EXPIRE ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


/////////////////////////////////////////////////////////////////////////////////////


const mongoose = require("mongoose");
const RiderSession = require("../models/RiderSession");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");
const User = require("../models/User");
const { getFirestore } = require("firebase-admin/firestore");

const HOUR = 60 * 60 * 1000;
const isValidId = mongoose.isValidObjectId;
const REQUIRE_VERIFICATION = process.env.REQUIRE_RIDER_VERIFICATION === "true";

// Extension tiers (ek jagah config)
const EXTEND_TIERS = {
  12: { requiredOrders: 23, bonusAmount: 230 },
  16: { requiredOrders: 27, bonusAmount: 486 },
};

// ---------- helpers ----------
const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const serverError = (res, tag, err) => {
  console.error(`${tag}:`, err);
  return res.status(500).json({
    success: false,
    code: "SERVER_ERROR",
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
};

const pageParams = (q) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

function isFullyVerified(rider) {
  return (
    rider.riderProfile?.cnicVerification?.status === "verified" &&
    rider.riderProfile?.faceVerification?.status === "verified"
  );
}

// Pakistan (UTC+5, no DST) ke hisaab se aaj ki range
const PK_OFFSET = 5 * HOUR;
const getPkDayRange = (now = new Date()) => {
  const local = new Date(now.getTime() + PK_OFFSET);
  const startUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - PK_OFFSET;
  return { start: new Date(startUtc), end: new Date(startUtc + 24 * HOUR - 1) };
};

// ---------- Firestore sync (wallet kabhi sync nahi hota) ----------
const syncToFirestore = async (collectionName, docId, data) => {
  try {
    const plain = data.toObject ? data.toObject() : data;
    const clean = JSON.parse(JSON.stringify(plain));
    await getFirestore()
      .collection(collectionName)
      .doc(docId.toString())
      .set({ ...clean, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error(`Firebase Sync Error (${collectionName}):`, e.message);
  }
};
const deleteFromFirestore = async (collectionName, docId) => {
  try {
    await getFirestore().collection(collectionName).doc(docId.toString()).delete();
  } catch (e) {
    console.error(`Firebase Delete Error (${collectionName}):`, e.message);
  }
};
const syncP = (p) => syncToFirestore("rider_session_participations", p._id, p);

// =====================================================
// CORE LIFECYCLE (sab endpoints yahi use karte hain)
// =====================================================

// Queue se agla booked session start karo. Invalid/ended session skip hota hai.
const activateNextBookedSession = async (riderId) => {
  const alreadyActive = await RiderSessionParticipation.findOne({ riderId, status: "in_progress" });
  if (alreadyActive) return null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const booked = await RiderSessionParticipation.findOne({ riderId, status: "booked" })
      .sort({ createdAt: 1 })
      .populate("sessionId");
    if (!booked) return null;

    const now = new Date();
    const session = booked.sessionId;
    const unavailable = !session || !session.isActive || session.endDate < now;

    if (unavailable) {
      booked.status = "cancelled";
      booked.attemptLocked = false;
      booked.cancelledAt = now;
      booked.abandonReason = "Session no longer available";
      await booked.save();
      await syncP(booked);
      continue;
    }

    const hours = booked.timeLimitHours || session.timeLimitHours || 8;
    try {
      const activated = await RiderSessionParticipation.findOneAndUpdate(
        { _id: booked._id, status: "booked" },
        { $set: { status: "in_progress", startedAt: now, expiresAt: new Date(now.getTime() + hours * HOUR) } },
        { new: true },
      );
      if (activated) {
        await syncP(activated);
        return activated;
      }
    } catch (e) {
      if (e.code === 11000) return null; // koi aur request pehle activate kar chuki
      throw e;
    }
  }
};

// Time khatam => expired (atomic) + next booked start
const expireParticipation = async (participationId) => {
  const p = await RiderSessionParticipation.findOneAndUpdate(
    { _id: participationId, status: "in_progress", expiresAt: { $ne: null, $lte: new Date() } },
    { $set: { status: "expired", abandonReason: "Time limit expired" } },
    { new: true },
  );
  if (!p) return null;
  await syncP(p);
  await activateNextBookedSession(p.riderId);
  return p;
};

// Required orders poore + time baaki => bonus (sirf ek baar, atomic)
const finalizeCompletion = async (participationId) => {
  const now = new Date();
  const claimed = await RiderSessionParticipation.findOneAndUpdate(
    {
      _id: participationId,
      status: "in_progress",
      bonusPaid: false,
      $expr: { $gte: ["$ordersCompleted", "$requiredOrders"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    { $set: { status: "completed", completedAt: now, bonusPaid: true } },
    { new: true },
  );
  if (!claimed) return null;

  try {
    if (claimed.bonusAmount > 0) {
      await User.updateOne({ _id: claimed.riderId }, { $inc: { "wallet.balance": claimed.bonusAmount } });
      // TODO: yahan WalletTransaction record bhi banao (audit trail)
    }
  } catch (err) {
    // wallet fail => claim wapas karo taake rider retry kar sake
    await RiderSessionParticipation.updateOne(
      { _id: claimed._id },
      { $set: { status: "in_progress", bonusPaid: false, completedAt: null } },
    );
    throw err;
  }

  await syncP(claimed);
  const nextSession = await activateNextBookedSession(claimed.riderId);
  const rider = await User.findById(claimed.riderId).select("wallet");
  return { participation: claimed, nextSession, walletBalance: rider?.wallet?.balance ?? 0 };
};

// Rider ka current in_progress, expired ho to lazily expire kar do
const getLiveParticipation = async (riderId) => {
  const current = await RiderSessionParticipation.findOne({ riderId, status: "in_progress" });
  if (current && current.expiresAt && current.expiresAt <= new Date()) {
    await expireParticipation(current._id);
    return RiderSessionParticipation.findOne({ riderId, status: "in_progress" });
  }
  return current;
};

// ⭐ Order delivered hone par apne Order controller se call karo
exports.recordDeliveredOrder = async (riderId, orderId) => {
  const p = await RiderSessionParticipation.findOneAndUpdate(
    {
      riderId,
      status: "in_progress",
      orderIds: { $ne: orderId }, // same order dobara count nahi hoga
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
    { $inc: { ordersCompleted: 1 }, $addToSet: { orderIds: orderId } },
    { new: true },
  );
  if (!p) return null;
  await syncP(p);
  if (p.ordersCompleted >= p.requiredOrders) await finalizeCompletion(p._id); // auto bonus
  return p;
};

// Cron job: har minute chalao
exports.runExpiryJob = async () => {
  const now = new Date();
  const due = await RiderSessionParticipation.find({
    status: "in_progress",
    expiresAt: { $ne: null, $lte: now },
  }).select("_id").limit(500);
  for (const d of due) await expireParticipation(d._id).catch((e) => console.error("EXPIRE ERR", e));

  // Jin booked sessions ki window khatam ho gayi unhe cancel karo
  const bookings = await RiderSessionParticipation.find({ status: "booked" })
    .populate("sessionId", "isActive endDate").limit(500);
  for (const b of bookings) {
    const s = b.sessionId;
    if (!s || !s.isActive || s.endDate < now) {
      b.status = "cancelled"; b.attemptLocked = false; b.cancelledAt = now;
      b.abandonReason = "Session no longer available";
      await b.save(); await syncP(b);
    }
  }
};

// =====================================================
// ADMIN
// =====================================================
exports.createSession = async (req, res) => {
  try {
    const { title, description, requiredOrders, bonusAmount, minWalletBalance, timeLimitHours, startDate, endDate, isActive } = req.body;

    if (!title?.trim()) return fail(res, 400, "VALIDATION", "Title is required");
    if (!Number.isFinite(Number(requiredOrders)) || Number(requiredOrders) < 1)
      return fail(res, 400, "VALIDATION", "requiredOrders must be at least 1");
    if (!Number.isFinite(Number(bonusAmount)) || Number(bonusAmount) < 0)
      return fail(res, 400, "VALIDATION", "bonusAmount is required");
    if (startDate && endDate && new Date(endDate) <= new Date(startDate))
      return fail(res, 400, "VALIDATION", "endDate must be after startDate");

    const session = await RiderSession.create({
      title, description,
      requiredOrders: Number(requiredOrders),
      bonusAmount: Number(bonusAmount),
      minWalletBalance: Number(minWalletBalance) || 0,
      timeLimitHours: Number(timeLimitHours) || 8,
      startDate, endDate, isActive,
    });

    await syncToFirestore("rider_sessions", session._id, session);
    return res.status(201).json({ success: true, message: "Session created successfully", session });
  } catch (err) {
    return serverError(res, "CREATE SESSION ERROR", err);
  }
};

// Admin: sab. Rider: sirf joinable (isActive + window).
exports.getAllSessions = async (req, res) => {
  try {
    const { isActive } = req.query;
    const { page, limit, skip } = pageParams(req.query);
    const query = {};

    if (req.user.role !== "admin") {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const [sessions, total] = await Promise.all([
      RiderSession.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RiderSession.countDocuments(query),
    ]);
    return res.json({ success: true, count: sessions.length, total, page, totalPages: Math.ceil(total / limit) || 1, sessions });
  } catch (err) {
    return serverError(res, "GET SESSIONS ERROR", err);
  }
};

exports.getSessionById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, "INVALID_ID", "Invalid session id");
    const session = await RiderSession.findById(req.params.id);
    if (!session) return fail(res, 404, "NOT_FOUND", "Session not found");
    return res.json({ success: true, session });
  } catch (err) {
    return serverError(res, "GET SESSION ERROR", err);
  }
};

exports.updateSession = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, "INVALID_ID", "Invalid session id");
    const session = await RiderSession.findById(req.params.id);
    if (!session) return fail(res, 404, "NOT_FOUND", "Session not found");

    ["title", "description", "requiredOrders", "bonusAmount", "minWalletBalance",
     "timeLimitHours", "startDate", "endDate", "isActive"].forEach((f) => {
      if (req.body[f] !== undefined) session[f] = req.body[f];
    });

    await session.save(); // pre-validate hook chalta hai
    await syncToFirestore("rider_sessions", session._id, session);
    // Note: purane participations ke snapshot par asar nahi padta (by design)
    return res.json({ success: true, message: "Session updated successfully", session });
  } catch (err) {
    if (err.message === "endDate must be after startDate") return fail(res, 400, "VALIDATION", err.message);
    return serverError(res, "UPDATE SESSION ERROR", err);
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 400, "INVALID_ID", "Invalid session id");

    const inProgress = await RiderSessionParticipation.countDocuments({ sessionId: id, status: "in_progress" });
    if (inProgress > 0)
      return fail(res, 400, "SESSION_IN_USE", "Riders are currently in progress. Deactivate it instead.");

    const session = await RiderSession.findByIdAndDelete(id);
    if (!session) return fail(res, 404, "NOT_FOUND", "Session not found");

    // Booked participations orphan na hon
    const booked = await RiderSessionParticipation.find({ sessionId: id, status: "booked" });
    for (const b of booked) {
      b.status = "cancelled"; b.attemptLocked = false; b.cancelledAt = new Date();
      b.abandonReason = "Session deleted by admin";
      await b.save(); await syncP(b);
    }

    await deleteFromFirestore("rider_sessions", id);
    return res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    return serverError(res, "DELETE SESSION ERROR", err);
  }
};

exports.getSessionParticipants = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, "INVALID_ID", "Invalid session id");
    const { status } = req.query;
    const { page, limit, skip } = pageParams(req.query);
    const query = { sessionId: req.params.id };
    if (status && status !== "all") query.status = status;

    const [participants, total] = await Promise.all([
      RiderSessionParticipation.find(query).populate("riderId", "name phone").sort({ createdAt: -1 }).skip(skip).limit(limit),
      RiderSessionParticipation.countDocuments(query),
    ]);
    return res.json({ success: true, count: participants.length, total, page, totalPages: Math.ceil(total / limit) || 1, participants });
  } catch (err) {
    return serverError(res, "GET PARTICIPANTS ERROR", err);
  }
};

// =====================================================
// RIDER: LISTS
// =====================================================

// Aaj ke sessions jo rider abhi join kar sakta hai
exports.getTodaySessions = async (req, res) => {
  try {
    const now = new Date();
    const { end } = getPkDayRange(now);
    const query = { isActive: true, startDate: { $lte: end }, endDate: { $gte: now } };

    if (req.user.role !== "admin") {
      const taken = await RiderSessionParticipation.find({
        riderId: req.user.id,
        status: { $in: ["in_progress", "booked", "completed", "expired", "abandoned"] },
      }).select("sessionId");
      query._id = { $nin: taken.map((p) => p.sessionId) };
    }

    const sessions = await RiderSession.find(query).sort({ startDate: 1 });
    return res.json({ success: true, serverTime: now.toISOString(), count: sessions.length, data: sessions });
  } catch (err) {
    return serverError(res, "GET TODAY SESSIONS ERROR", err);
  }
};

// Aane wale sessions (start future mein), jo rider ne pehle nahi liye
exports.getComingSoonSessions = async (req, res) => {
  try {
    const now = new Date();
    const taken = await RiderSessionParticipation.find({
      riderId: req.user.id,
      status: { $in: ["in_progress", "booked", "completed", "expired", "abandoned"] },
    }).select("sessionId");

    const data = await RiderSession.find({
      _id: { $nin: taken.map((p) => p.sessionId) },
      isActive: true,
      startDate: { $gt: now },
    }).sort({ startDate: 1 });

    return res.json({ success: true, serverTime: now.toISOString(), count: data.length, data });
  } catch (err) {
    return serverError(res, "GET COMING SOON ERROR", err);
  }
};

exports.getBookedSessions = async (req, res) => {
  try {
    const data = await RiderSessionParticipation.find({ riderId: req.user.id, status: "booked" })
      .populate("sessionId").sort({ createdAt: 1 });
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    return serverError(res, "GET BOOKED ERROR", err);
  }
};

// History: ?status=completed|expired|abandoned|cancelled (optional) &page &limit
exports.getRiderSessionHistory = async (req, res) => {
  try {
    const allowed = ["completed", "expired", "abandoned", "cancelled"];
    const { status } = req.query;
    const { page, limit, skip } = pageParams(req.query);
    const query = { riderId: req.user.id, status: allowed.includes(status) ? status : { $in: allowed } };

    const [data, total] = await Promise.all([
      RiderSessionParticipation.find(query).populate("sessionId").sort({ updatedAt: -1 }).skip(skip).limit(limit),
      RiderSessionParticipation.countDocuments(query),
    ]);
    return res.json({ success: true, count: data.length, total, page, totalPages: Math.ceil(total / limit) || 1, data });
  } catch (err) {
    return serverError(res, "GET HISTORY ERROR", err);
  }
};

// =====================================================
// RIDER: ACTIONS
// =====================================================
exports.joinSession = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, "INVALID_ID", "Invalid session id");

    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return fail(res, 404, "RIDER_NOT_FOUND", "Rider not found");
    if (rider.isBlocked) return fail(res, 403, "BLOCKED", "Your account is blocked");
    if (REQUIRE_VERIFICATION && !isFullyVerified(rider))
      return fail(res, 403, "NOT_VERIFIED", "Complete CNIC and face verification before joining a session");

    const session = await RiderSession.findById(req.params.id);
    if (!session) return fail(res, 404, "NOT_FOUND", "Session not found");
    if (!session.isCurrentlyJoinable())
      return fail(res, 400, "SESSION_NOT_JOINABLE", "This session isn't currently open to join");

    const walletBalance = rider.wallet?.balance || 0;
    if (walletBalance < session.minWalletBalance)
      return fail(res, 400, "LOW_WALLET",
        `You need at least ${session.minWalletBalance} in your wallet to join this session`,
        { requiredAmount: session.minWalletBalance, currentBalance: walletBalance });

    // purana expired session pehle clear karo (queue chalne do)
    const active = await getLiveParticipation(rider._id);

    const [booked, already] = await Promise.all([
      RiderSessionParticipation.findOne({ riderId: rider._id, status: "booked" }),
      RiderSessionParticipation.findOne({
        riderId: rider._id,
        sessionId: session._id,
        status: { $in: ["in_progress", "booked", "completed", "expired", "abandoned"] },
      }),
    ]);

    if (already)
      return fail(res, 400, "ALREADY_PARTICIPATED",
        already.status === "completed" ? "You already completed this session"
          : ["in_progress", "booked"].includes(already.status) ? "You are already in or have booked this session"
          : "You have already used your attempt on this session");

    if (active && booked)
      return fail(res, 400, "BOOKING_LIMIT", "You already have an active session and a booked session queued up");

    const isBooked = !!active;
    const now = new Date();
    const hours = session.timeLimitHours || 8;

    const participation = await RiderSessionParticipation.create({
      sessionId: session._id,
      riderId: rider._id,
      status: isBooked ? "booked" : "in_progress",
      bonusAmount: session.bonusAmount,
      requiredOrders: session.requiredOrders,
      timeLimitHours: hours,
      startedAt: isBooked ? null : now,
      expiresAt: isBooked ? null : new Date(now.getTime() + hours * HOUR),
    });

    await syncP(participation);
    return res.status(201).json({
      success: true,
      code: isBooked ? "BOOKED" : "JOINED",
      message: isBooked
        ? "Session booked! It will start automatically once your current session ends."
        : `Joined session — complete ${session.requiredOrders} orders to earn ${session.bonusAmount}`,
      serverTime: now.toISOString(),
      participation,
    });
  } catch (err) {
    if (err.code === 11000)
      return fail(res, 409, "DUPLICATE", "You already have a participation record for this session");
    return serverError(res, "JOIN SESSION ERROR", err);
  }
};

// Manual claim (auto-complete fail/retry ke liye fallback)
exports.completeSession = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return fail(res, 404, "RIDER_NOT_FOUND", "Rider not found");
    if (rider.isBlocked) return fail(res, 403, "BLOCKED", "Your account is blocked");

    const current = await RiderSessionParticipation.findOne({ riderId: rider._id, status: "in_progress" });
    if (!current) return fail(res, 404, "NO_ACTIVE_SESSION", "No active session found to complete");

    if (current.expiresAt && current.expiresAt <= new Date()) {
      await expireParticipation(current._id);
      const next = await RiderSessionParticipation.findOne({ riderId: rider._id, status: "in_progress" });
      return fail(res, 400, "SESSION_EXPIRED", "Session time limit has expired. Bonus cannot be claimed.",
        { nextSessionStarted: !!next });
    }

    if (current.ordersCompleted < current.requiredOrders)
      return fail(res, 400, "ORDERS_PENDING",
        `You haven't reached the required orders yet. (${current.ordersCompleted}/${current.requiredOrders})`,
        { ordersCompleted: current.ordersCompleted, requiredOrders: current.requiredOrders });

    const result = await finalizeCompletion(current._id);
    if (!result) return fail(res, 409, "ALREADY_PROCESSED", "This session was already processed");

    return res.json({
      success: true,
      message: `Session completed! ${result.participation.bonusAmount} added to your wallet.`,
      bonusEarned: result.participation.bonusAmount,
      updatedWalletBalance: result.walletBalance,
      completedSession: result.participation,
      nextSessionStarted: !!result.nextSession,
      nextSession: result.nextSession,
    });
  } catch (err) {
    return serverError(res, "COMPLETE SESSION ERROR", err);
  }
};

// Active session chhodna (bonus forfeit) -> agla booked start
exports.leaveSession = async (req, res) => {
  try {
    const p = await RiderSessionParticipation.findOneAndUpdate(
      { riderId: req.user.id, status: "in_progress" },
      { $set: { status: "abandoned", abandonedAt: new Date(), abandonReason: req.body?.reason || "Left by rider" } },
      { new: true },
    );
    if (!p) return fail(res, 404, "NO_ACTIVE_SESSION", "You don't have an active session");

    await syncP(p);
    const next = await activateNextBookedSession(req.user.id);
    return res.json({
      success: true,
      message: "You've left the session. No bonus will be paid for this attempt.",
      participation: p,
      nextSessionStarted: !!next,
      nextSession: next,
    });
  } catch (err) {
    return serverError(res, "LEAVE SESSION ERROR", err);
  }
};

exports.getMySessionStatus = async (req, res) => {
  try {
    const now = new Date();
    const live = await getLiveParticipation(req.user.id);
    const bookedCount = await RiderSessionParticipation.countDocuments({ riderId: req.user.id, status: "booked" });

    if (!live) return res.json({ success: true, active: false, participation: null, bookedCount, serverTime: now.toISOString() });

    const participation = await live.populate("sessionId", "title description requiredOrders bonusAmount");
    return res.json({
      success: true,
      active: true,
      participation,
      bookedCount,
      progress: { ordersCompleted: live.ordersCompleted, requiredOrders: live.requiredOrders },
      remainingSeconds: live.expiresAt ? Math.max(0, Math.floor((live.expiresAt - now) / 1000)) : null,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    return serverError(res, "GET MY STATUS ERROR", err);
  }
};

exports.cancelBookedSession = async (req, res) => {
  try {
    const { id } = req.params; // participationId ya sessionId
    if (!isValidId(id)) return fail(res, 400, "INVALID_ID", "Invalid id");

    const p = await RiderSessionParticipation.findOneAndUpdate(
      { $or: [{ _id: id }, { sessionId: id }], riderId: req.user.id, status: "booked" },
      { $set: { status: "cancelled", cancelledAt: new Date(), attemptLocked: false } },
      { new: true },
    );
    if (!p) return fail(res, 404, "NOT_FOUND", "No booked session found, or it is already active/completed");

    await syncP(p);
    return res.json({ success: true, message: "Booked session cancelled successfully", cancelledSession: p });
  } catch (err) {
    return serverError(res, "CANCEL BOOKED ERROR", err);
  }
};

// Rider apna active session extend kare (12h / 16h). Template ko touch nahi karta.
exports.extendMySession = async (req, res) => {
  try {
    const hours = Number(req.body.extendHours);
    const tier = EXTEND_TIERS[hours];
    if (!tier) return fail(res, 400, "VALIDATION", "extendHours must be 12 or 16");

    const current = await getLiveParticipation(req.user.id);
    if (!current) return fail(res, 404, "NO_ACTIVE_SESSION", "No active session to extend");
    if (hours <= (current.timeLimitHours || 0))
      return fail(res, 400, "ALREADY_EXTENDED", "Your session already has an equal or longer time limit");

    const updated = await RiderSessionParticipation.findOneAndUpdate(
      { _id: current._id, status: "in_progress", timeLimitHours: { $lt: hours }, expiresAt: { $gt: new Date() } },
      {
        $set: {
          timeLimitHours: hours,
          extendHours: hours,
          requiredOrders: tier.requiredOrders,
          bonusAmount: tier.bonusAmount,
          expiresAt: new Date(current.startedAt.getTime() + hours * HOUR),
          isExtend12: hours === 12,
          isExtend16: hours === 16,
        },
      },
      { new: true },
    );
    if (!updated) return fail(res, 409, "CONFLICT", "Session changed, please retry");

    await syncP(updated);
    return res.json({ success: true, message: `Session extended to ${hours} hours`, participation: updated, serverTime: new Date().toISOString() });
  } catch (err) {
    return serverError(res, "EXTEND SESSION ERROR", err);
  }
};

exports.activateNextBookedSession = activateNextBookedSession;


