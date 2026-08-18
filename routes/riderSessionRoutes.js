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
} = require("../controllers/riderSessionController");

router.get("/", auth, getAllSessions);
router.get("/today", auth, getTodaySessions);
router.get("/coming", auth, getComingSoonSessions);
router.get("/booked", auth, getBookedSessions);
router.get("/:id", auth, getSessionById);

// Rider self-service — specific paths first so they aren't shadowed by "/:id"
router.get("/my/status", auth, role("rider"), getMySessionStatus);
router.post("/my/leave", auth, role("rider"), leaveSession);
router.post("/:id/join", auth, role("rider"), joinSession);

// Shared list/detail (role-aware inside the controller)

// Admin management
router.post("/create", auth, role("admin"), createSession);
router.put("/update/:id", auth, role("admin"), updateSession);
router.put("/extend/:id", auth, extendSession);
router.delete("/delete/:id", auth, role("admin"), deleteSession);
router.get("/:id/participants", auth, role("admin"), getSessionParticipants);

module.exports = router;