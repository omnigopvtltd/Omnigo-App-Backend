const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  initiateCall,
  updateCallStatus,
  getCallLogs,
} = require("../controllers/callController");

router.get("/", auth, getCallLogs);
router.post("/", auth, initiateCall);
router.patch("/:id", auth, updateCallStatus);

module.exports = router;