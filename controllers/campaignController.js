const Campaign = require("../models/Campaign");

exports.createCampaign = async (req, res) => {
  try {
    const {
      title, description, bannerImage, type, linkedCoupon,
      targetAudience, startDate, endDate, isActive,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const campaign = await Campaign.create({
      title, description, bannerImage, type,
      linkedCoupon: linkedCoupon || null,
      targetAudience, startDate, endDate, isActive,
    });

    return res.status(201).json({ success: true, message: "Campaign created successfully", campaign });
  } catch (err) {
    console.log("CREATE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const { search, isActive, type, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) query.title = new RegExp(search, "i");
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (type && type !== "all") query.type = type;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("linkedCoupon", "code type value")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Campaign.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      campaigns,
    });
  } catch (err) {
    console.log("GET CAMPAIGNS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("linkedCoupon");
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
    return res.status(200).json({ success: true, campaign });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

    const fields = [
      "title", "description", "bannerImage", "type", "linkedCoupon",
      "targetAudience", "startDate", "endDate", "isActive",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) campaign[field] = req.body[field];
    });

    await campaign.save();

    return res.status(200).json({ success: true, message: "Campaign updated successfully", campaign });
  } catch (err) {
    console.log("UPDATE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
    return res.status(200).json({ success: true, message: "Campaign deleted successfully" });
  } catch (err) {
    console.log("DELETE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};