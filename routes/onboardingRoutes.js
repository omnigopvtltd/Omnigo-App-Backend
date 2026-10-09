const express = require("express");
const router = express.Router();

const {
  createOnboarding,
  getOnboardings,
  getOnboardingById,
  updateOnboarding,
  deleteOnboarding,
  toggleOnboardingStatus,
} = require("../controllers/onboardingController");
const upload = require("../middleware/upload");

router.post(
  "/",
  upload.diskUpload.single("image_url"),
  createOnboarding
);

router.get("/", getOnboardings);


router.put(
  "/:id", 
  upload.diskUpload.single("image_url"),
  updateOnboarding
);

router.delete("/:id", deleteOnboarding);

router.patch(
  "/status/:id",
  toggleOnboardingStatus
);

router.get("/:id", getOnboardingById);

module.exports = router;