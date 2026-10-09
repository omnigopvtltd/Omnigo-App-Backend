const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  updateTransactionStatus,
  deleteTransaction,
} = require("../controllers/transactionController");

// Upload middleware added to POST and PUT routes
router.post("/", upload.diskUpload.single("transactionSlip"), createTransaction);
router.get("/", getTransactions);
router.get("/:id", getTransactionById);
router.put("/:id", upload.diskUpload.single("transactionSlip"), updateTransaction);
router.patch("/:id/status", updateTransactionStatus);
router.delete("/:id", deleteTransaction);

module.exports = router;