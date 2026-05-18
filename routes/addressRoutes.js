const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  addAddress,
  getAddress
} = require("../controllers/addressController");

router.post("/add", auth, addAddress);
router.get("/my", auth, getAddress);

module.exports = router;