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
} = require("../controllers/riderSessionController");

// Rider self-service — specific paths first so they aren't shadowed by "/:id"
router.get("/my/status", auth, role("rider"), getMySessionStatus);
router.post("/my/leave", auth, role("rider"), leaveSession);
router.post("/:id/join", auth, role("rider"), joinSession);

// Shared list/detail (role-aware inside the controller)
router.get("/", auth, getAllSessions);
router.get("/:id", auth, getSessionById);

// Admin management
router.post("/", auth, role("admin"), createSession);
router.put("/:id", auth, role("admin"), updateSession);
router.delete("/:id", auth, role("admin"), deleteSession);
router.get("/:id/participants", auth, role("admin"), getSessionParticipants);

module.exports = router;