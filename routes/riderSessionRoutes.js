const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  joinSession,
  leaveSession,
  getMySessionStatus,
  getSessionParticipants,
  getComingSoonSessions,
  getBookedSessions,
  getTodaySessions,
  extendSession,
  getRiderCompletedSessions,
  getRiderCancelledSessions,
  getRiderSessionHistory,
  completeSession,
  extendMySession,
  cancelBookedSession,
} = require("../controllers/riderSessionController");

// router.get("/", auth, getAllSessions);
// router.get("/today", auth, getTodaySessions);
// router.get("/coming", auth, getComingSoonSessions);
// router.get("/booked", auth, getBookedSessions);
// router.get("/:id", auth, getSessionById);

// // Rider self-service — specific paths first so they aren't shadowed by "/:id"
// router.get("/my/status", auth, role("rider"), getMySessionStatus);
// router.post("/my/leave", auth, role("rider"), leaveSession);
// router.post("/:id/join", auth, role("rider"), joinSession);
// router.get("/my/completed", auth, role("rider"), getRiderCompletedSessions);
// router.get("/my/cancel", auth, role("rider"), getRiderCancelledSessions);
// router.get("/my/history", auth, role("rider"), getRiderSessionHistory);

// // Shared list/detail (role-aware inside the controller)

// // Admin management
// router.post("/create", auth, role("admin"), createSession);
// router.put("/update/:id", auth, role("admin"), updateSession);
// router.put("/extend/:id", auth, extendSession);
// router.delete("/delete/:id", auth, role("admin"), deleteSession);
// router.get("/:id/participants", auth, role("admin"), getSessionParticipants);

/////////////////////////////////////////

router.get("/today", auth, getTodaySessions);
router.get("/coming-soon", auth, getComingSoonSessions);
router.get("/my/status", auth, getMySessionStatus);
router.get("/my/booked", auth, getBookedSessions);
router.get("/my/history", auth, getRiderSessionHistory);   // ?status=completed|expired|abandoned|cancelled
router.post("/my/complete", auth, completeSession);
router.post("/my/leave", auth, leaveSession);
router.patch("/my/extend", auth, extendMySession);
router.delete("/my/booked/:id", auth, cancelBookedSession);
router.post("/:id/join", auth, joinSession);

// admin (adminOnly middleware zaroor lagao)
router.post("/create", auth, auth, createSession);
router.get("/", auth, getAllSessions);
router.get("/:id", auth, getSessionById);
router.put("/update/:id", auth, auth, role("admin"), updateSession);
router.delete("/delete/:id", auth, auth, role("admin"), deleteSession);
router.get("/:id/participants", auth, auth, role("admin"), getSessionParticipants);

module.exports = router;