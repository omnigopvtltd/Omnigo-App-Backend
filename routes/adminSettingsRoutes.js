const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const { getSettings, updateSettings } = require("../controllers/adminSettingsController");

router.get("/", auth, role("admin"), getSettings);
router.put("/", auth, role("admin"), updateSettings);

module.exports = router;