const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createOnboarding,
  getOnboardings,
  getOnboardingById,
  updateOnboarding,
  deleteOnboarding,
  toggleOnboardingStatus,
} = require("../controllers/onboardingController");

router.post(
  "/",
  upload.single("image"),
  createOnboarding
);

router.get("/", getOnboardings);

router.get("/:id", getOnboardingById);

router.put(
  "/:id",
  upload.single("image"),
  updateOnboarding
);

router.delete("/:id", deleteOnboarding);

router.patch(
  "/status/:id",
  toggleOnboardingStatus
);

module.exports = router;