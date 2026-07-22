const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/rolemiddleware");
const {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} = require("../controllers/campaignController");

router.get("/", auth, role("admin"), getAllCampaigns);
router.post("/create", auth, role("admin"), createCampaign);
router.get("/:id", auth, role("admin"), getCampaignById);
router.put("/update/:id", auth, role("admin"), updateCampaign);
router.delete("/delete/:id", auth, role("admin"), deleteCampaign);

module.exports = router;