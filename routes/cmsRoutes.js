const express = require("express");
const router = express.Router();
const {
  createFAQ,
  getFAQs,
  updateFAQ,
  deleteFAQ,
  createOrUpdateTerms,
  getTerms,
  deleteTerms,
  getAdminFAQs,
  getAdminTerms,
} = require("../controllers/cmsController");

// FAQ Routes
router.post("/faqs", createFAQ);
router.get("/faqs", getFAQs);
router.put("/faqs/:id", updateFAQ);
router.delete("/faqs/:id", deleteFAQ);

// Terms & Conditions Routes
router.post("/terms", createOrUpdateTerms);
router.get("/terms", getTerms);
router.delete("/terms/:id", deleteTerms);

// FAQs
router.get("/admin/faqs", getAdminFAQs);
router.post("/admin/faqs", createFAQ);
router.put("/admin/faqs/:id", updateFAQ);
router.delete("/admin/faqs/:id", deleteFAQ);

// Terms & Conditions
router.get("/admin/terms", getAdminTerms);
router.post("/admin/terms", createOrUpdateTerms);
router.delete("/admin/terms/:id", deleteTerms);

module.exports = router;