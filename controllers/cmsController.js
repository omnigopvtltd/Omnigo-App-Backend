const { FAQ, Terms } = require("../models/CMS");

// ==================== FAQ CONTROLLERS ====================

// Create FAQ
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category, targetRole } = req.body;
    const faq = await FAQ.create({ question, answer, category, targetRole });
    return res
      .status(201)
      .json({ success: true, message: "FAQ created successfully", data: faq });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get FAQs (Supports Filtering by role & category)
exports.getFAQs = async (req, res) => {
  try {
    const { role, category } = req.query;
    let query = { isActive: true };

    if (role) {
      query.targetRole = { $in: [role.toLowerCase(), "all"] };
    }
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    const faqs = await FAQ.find(query).sort({ category: 1, createdAt: -1 });
    return res
      .status(200)
      .json({ success: true, count: faqs.length, data: faqs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update FAQ
exports.updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!faq)
      return res.status(404).json({ success: false, message: "FAQ not found" });
    return res
      .status(200)
      .json({ success: true, message: "FAQ updated successfully", data: faq });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete FAQ
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq)
      return res.status(404).json({ success: false, message: "FAQ not found" });
    return res
      .status(200)
      .json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== TERMS & CONDITIONS CONTROLLERS ====================

// Create or Upsert Terms & Conditions
exports.createOrUpdateTerms = async (req, res) => {
  try {
    const { title, content, targetRole = "all", version } = req.body;

    const terms = await Terms.findOneAndUpdate(
      { targetRole: targetRole.toLowerCase() },
      { title, content, version, isActive: true },
      { new: true, upsert: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Terms & Conditions saved successfully",
      data: terms,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Terms & Conditions by Role
exports.getTerms = async (req, res) => {
  try {
    const { role } = req.query;
    let targetRole = role ? role.toLowerCase() : "all";

    // Try finding role specific, fallback to 'all'
    let terms = await Terms.findOne({ targetRole, isActive: true });
    if (!terms && targetRole !== "all") {
      terms = await Terms.findOne({ targetRole: "all", isActive: true });
    }

    if (!terms) {
      return res
        .status(404)
        .json({ success: false, message: "Terms and conditions not found" });
    }

    return res.status(200).json({ success: true, data: terms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Terms & Conditions
exports.deleteTerms = async (req, res) => {
  try {
    const terms = await Terms.findByIdAndDelete(req.params.id);
    if (!terms)
      return res
        .status(404)
        .json({ success: false, message: "Terms record not found" });
    return res
      .status(200)
      .json({
        success: true,
        message: "Terms & Conditions deleted successfully",
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get all FAQs with pagination & search
exports.getAdminFAQs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, category } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.targetRole = role;
    if (category) query.category = category;

    const faqs = await FAQ.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await FAQ.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: faqs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get all Terms & Conditions records
exports.getAdminTerms = async (req, res) => {
  try {
    const terms = await Terms.find().sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, data: terms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
