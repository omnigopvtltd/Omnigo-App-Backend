// const Campaign = require("../models/Campaign");

// exports.createCampaign = async (req, res) => {
//   try {
//     const {
//       title, description, bannerImage, type, linkedCoupon,
//       targetAudience, startDate, endDate, isActive,
//     } = req.body;

//     if (!title) return res.status(400).json({ success: false, message: "Title is required" });
//     if (!startDate || !endDate) {
//       return res.status(400).json({ success: false, message: "startDate and endDate are required" });
//     }

//     const campaign = await Campaign.create({
//       title, description, bannerImage, type,
//       linkedCoupon: linkedCoupon || null,
//       targetAudience, startDate, endDate, isActive,
//     });

//     return res.status(201).json({ success: true, message: "Campaign created successfully", campaign });
//   } catch (err) {
//     console.log("CREATE CAMPAIGN ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getAllCampaigns = async (req, res) => {
//   try {
//     const { search, isActive, type, page = 1, limit = 20 } = req.query;
//     const query = {};

//     if (search) query.title = new RegExp(search, "i");
//     if (isActive !== undefined) query.isActive = isActive === "true";
//     if (type && type !== "all") query.type = type;

//     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//     const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
//     const skip = (pageNum - 1) * limitNum;

//     const [campaigns, total] = await Promise.all([
//       Campaign.find(query)
//         .populate("linkedCoupon", "code type value")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum),
//       Campaign.countDocuments(query),
//     ]);

//     return res.status(200).json({
//       success: true,
//       count: campaigns.length,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum) || 1,
//       campaigns,
//     });
//   } catch (err) {
//     console.log("GET CAMPAIGNS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getCampaignById = async (req, res) => {
//   try {
//     const campaign = await Campaign.findById(req.params.id).populate("linkedCoupon");
//     if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
//     return res.status(200).json({ success: true, campaign });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.updateCampaign = async (req, res) => {
//   try {
//     const campaign = await Campaign.findById(req.params.id);
//     if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

//     const fields = [
//       "title", "description", "bannerImage", "type", "linkedCoupon",
//       "targetAudience", "startDate", "endDate", "isActive",
//     ];
//     fields.forEach((field) => {
//       if (req.body[field] !== undefined) campaign[field] = req.body[field];
//     });

//     await campaign.save();

//     return res.status(200).json({ success: true, message: "Campaign updated successfully", campaign });
//   } catch (err) {
//     console.log("UPDATE CAMPAIGN ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.deleteCampaign = async (req, res) => {
//   try {
//     const campaign = await Campaign.findByIdAndDelete(req.params.id);
//     if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
//     return res.status(200).json({ success: true, message: "Campaign deleted successfully" });
//   } catch (err) {
//     console.log("DELETE CAMPAIGN ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

const Campaign = require("../models/Campaign");
const VendorBranch = require("../models/VendorBranch");

// Create Campaign
exports.createCampaign = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id || req.body.vendorId;

    const {
      campaignName,
      campaignType,
      branchId,
      description,
      offerDetails,
      appliesTo,
      applicableCategories,
      applicableProducts,
      startDate,
      endDate,
      startTime,
      endTime,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      perCustomerLimit,
      eligibleCustomers,
      campaignBanner,
      isActive,
    } = req.body;

    if (!campaignName || !campaignType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "campaignName, campaignType, startDate, and endDate are required fields.",
      });
    }

    const campaign = await Campaign.create({
      vendorId,
      branchId: branchId || null,
      campaignName,
      campaignType: campaignType.toLowerCase(),
      description,
      offerDetails,
      appliesTo,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      startDate,
      endDate,
      startTime,
      endTime,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      perCustomerLimit,
      eligibleCustomers,
      campaignBanner,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (err) {
    console.error("CREATE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// Get All Campaigns (With Search, Filtering & Pagination)
exports.getAllCampaigns = async (req, res) => {
  try {
    const {
      search,
      isActive,
      campaignType,
      branchId,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { campaignName: new RegExp(search, "i") },
        { "offerDetails.dealTitle": new RegExp(search, "i") },
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === "true";
    if (campaignType && campaignType !== "all")
      query.campaignType = campaignType;
    if (branchId) query.branchId = branchId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("vendorId", "businessName logo rating")
        .populate(
          "branchId",
          "branchName address area city phone isOpen isActive",
        ) // <--- Properly populate Branch details here
        .populate("offerDetails.freeItemId", "name price image")
        .populate("offerDetails.comboItems", "name price image")
        .populate("applicableCategories", "name")
        .populate("applicableProducts", "name price image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(), // Modifiable JS Objects for safe manipulation
      Campaign.countDocuments(query),
    ]);

    // OPTIONAL: Fetch all branches for the unique vendors present in these campaigns
    const vendorIds = [
      ...new Set(
        campaigns.map((c) => c.vendorId?._id || c.vendorId).filter(Boolean),
      ),
    ];
    const vendorBranches = await VendorBranch.find({
      vendorId: { $in: vendorIds },
    }).lean();

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      campaigns,
      vendorBranches, // Passed as a clean separate top-level key instead of array corrupting push
    });
  } catch (err) {
    console.error("GET CAMPAIGNS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Single Campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("vendorId", "businessName logo rating")
      .populate("branchId", "branchName address area city phone isOpen isActive")
      .populate("offerDetails.freeItemId")
      .populate("offerDetails.comboItems")
      .populate("applicableCategories")
      .populate("applicableProducts");

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    return res.status(200).json({ success: true, campaign });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Campaign
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    const updateFields = [
      "campaignName",
      "campaignType",
      "branchId",
      "description",
      "offerDetails",
      "appliesTo",
      "applicableCategories",
      "applicableProducts",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "minOrderAmount",
      "maxDiscountAmount",
      "usageLimit",
      "perCustomerLimit",
      "eligibleCustomers",
      "campaignBanner",
      "isActive",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (err) {
    console.error("UPDATE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Campaign deleted successfully" });
  } catch (err) {
    console.error("DELETE CAMPAIGN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =======================================================
// GET CAMPAIGN FORM CONFIGURATION (DYNAMIC FIELDS & DUMMY VALUES)
// =======================================================
exports.getCampaignFormConfig = async (req, res) => {
  try {
    const { campaignType } = req.query;

    // Default basic form layout config
    const formConfig = {
      campaignType: campaignType || "discount_deal",
      sections: [
        {
          sectionId: "basic_info",
          sectionTitle: "1. Campaign Information",
          fields: [
            {
              name: "campaignName",
              label: "Campaign Name",
              type: "text",
              required: true,
              placeholder: "e.g. Ramadan Special / Summer Sale",
              defaultValue: "Ramadan Flash Deal",
            },
            {
              name: "branchId",
              label: "Branch",
              type: "select",
              required: false,
              placeholder: "Select branch",
              options: [], // Frontend fetch karke branches list inject kar sakta hai
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              required: false,
              placeholder: "Describe your offer...",
              defaultValue:
                "Get huge discounts on your favorite meals for a limited time!",
            },
          ],
        },
      ],
    };

    // Dynamic offer fields based on selected campaign type
    let offerFields = [];

    switch (campaignType?.toLowerCase()) {
      case "flash_deal":
        offerFields = [
          {
            name: "offerDetails.discountType",
            label: "Discount Type",
            type: "radio",
            required: true,
            options: [
              { label: "Percentage (%)", value: "percentage" },
              { label: "Fixed Amount (Rs.)", value: "fixed_amount" },
            ],
            defaultValue: "percentage",
          },
          {
            name: "offerDetails.discountValue",
            label: "Discount Value",
            type: "number",
            required: true,
            placeholder: "e.g. 50",
            defaultValue: 50,
          },
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 1000",
            defaultValue: 1000,
          },
          {
            name: "maxDiscountAmount",
            label: "Maximum Discount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 500",
            defaultValue: 500,
          },
        ];
        break;

      case "discount_deal":
        offerFields = [
          {
            name: "offerDetails.discountType",
            label: "Discount Type",
            type: "radio",
            required: true,
            options: [
              { label: "Percentage (%)", value: "percentage" },
              { label: "Fixed Amount (Rs.)", value: "fixed_amount" },
            ],
            defaultValue: "percentage",
          },
          {
            name: "offerDetails.discountValue",
            label: "Discount Value",
            type: "number",
            required: true,
            placeholder: "e.g. 20",
            defaultValue: 20,
          },
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 1000",
            defaultValue: 1000,
          },
          {
            name: "maxDiscountAmount",
            label: "Maximum Discount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 500",
            defaultValue: 500,
          },
        ];
        break;

      case "bogo_deal":
        offerFields = [
          {
            name: "offerDetails.buyQuantity",
            label: "Customer Buys Quantity",
            type: "number",
            required: true,
            placeholder: "1",
            defaultValue: 1,
          },
          {
            name: "offerDetails.getQuantity",
            label: "Customer Gets Quantity",
            type: "number",
            required: true,
            placeholder: "1",
            defaultValue: 1,
          },
          {
            name: "offerDetails.freeItemId",
            label: "Free Item Select",
            type: "select_product",
            required: true,
            placeholder: "Select item (e.g. Small Fries)",
            defaultValue: null,
          },
        ];
        break;

      case "combo_deal":
        offerFields = [
          {
            name: "offerDetails.comboName",
            label: "Combo Name",
            type: "text",
            required: true,
            placeholder: "e.g. Family Feast Combo",
            defaultValue: "Family Deal 1",
          },
          {
            name: "offerDetails.comboItems",
            label: "Select Items Included",
            type: "multi_select_products",
            required: true,
            placeholder: "Select burgers, drinks, sides...",
            defaultValue: [],
          },
          {
            name: "offerDetails.originalPrice",
            label: "Original Price (Rs.)",
            type: "number",
            required: true,
            placeholder: "900",
            defaultValue: 900,
          },
          {
            name: "offerDetails.dealPrice",
            label: "Deal Price (Rs.)",
            type: "number",
            required: true,
            placeholder: "699",
            defaultValue: 699,
          },
        ];
        break;

      case "free_delivery":
        offerFields = [
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: true,
            placeholder: "500",
            defaultValue: 500,
          },
          {
            name: "offerDetails.maxDeliveryDiscount",
            label: "Maximum Delivery Discount (Rs.)",
            type: "number",
            required: false,
            placeholder: "150",
            defaultValue: 150,
          },
        ];
        break;

      case "payment_card_deal":
        offerFields = [
          {
            name: "offerDetails.dealTitle",
            label: "Offer Title",
            type: "text",
            required: true,
            placeholder: "Get 30% OFF with Easypaisa Card",
            defaultValue: "Get 30% OFF with Easypaisa Card",
          },
          {
            name: "offerDetails.paymentMethod",
            label: "Payment Method",
            type: "select",
            required: true,
            options: [
              { label: "Easypaisa", value: "easypaisa" },
              { label: "JazzCash", value: "jazzcash" },
              { label: "Bank Card", value: "bank_card" },
              { label: "Credit Card", value: "credit_card" },
              { label: "Debit Card", value: "debit_card" },
              { label: "Custom", value: "custom" },
            ],
            defaultValue: "easypaisa",
          },
          {
            name: "offerDetails.discountType",
            label: "Discount Type",
            type: "radio",
            required: true,
            options: [
              { label: "Percentage (%)", value: "percentage" },
              { label: "Fixed Amount (Rs.)", value: "fixed_amount" },
            ],
            defaultValue: "percentage",
          },
          {
            name: "offerDetails.discountValue",
            label: "Discount Value",
            type: "number",
            required: true,
            placeholder: "30",
            defaultValue: 30,
          },
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: false,
            placeholder: "1000",
            defaultValue: 1000,
          },
        ];
        break;

      case "custom_deal":
      default:
        offerFields = [
          {
            name: "offerDetails.dealTitle",
            label: "Deal Title",
            type: "text",
            required: true,
            placeholder: "e.g. Special Weekend Deal",
            defaultValue: "Weekend Special Offer",
          },
          {
            name: "offerDetails.offerType",
            label: "Offer Type",
            type: "select",
            required: true,
            options: [
              { label: "Percentage Discount", value: "percentage_discount" },
              { label: "Fixed Discount", value: "fixed_discount" },
              { label: "Special Price", value: "special_price" },
              { label: "Buy X Get Y", value: "buy_x_get_y" },
              { label: "Free Item", value: "free_item" },
              { label: "Free Delivery", value: "free_delivery" },
              {
                label: "Payment Method Discount",
                value: "payment_method_discount",
              },
              { label: "Other", value: "other" },
            ],
            defaultValue: "percentage_discount",
          },
          {
            name: "offerDetails.discountValue",
            label: "Discount / Value",
            type: "number",
            required: false,
            placeholder: "30",
            defaultValue: 30,
          },
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: false,
            placeholder: "1000",
            defaultValue: 1000,
          },
        ];
        break;
    }

    // Append dynamic Offer Details Section
    formConfig.sections.push({
      sectionId: "offer_details",
      sectionTitle: "2. Offer Details",
      fields: offerFields,
    });

    // Append Scope / Applies On Section
    formConfig.sections.push({
      sectionId: "applies_on",
      sectionTitle: "3. Applies On",
      fields: [
        {
          name: "appliesTo",
          label: "Apply Campaign To",
          type: "segmented_control",
          required: true,
          options: [
            { label: "All Items", value: "all_items" },
            { label: "Category", value: "category" },
            { label: "Specific Items", value: "specific_items" },
          ],
          defaultValue: "all_items",
        },
      ],
    });

    // Append Schedule & Banner Sections
    formConfig.sections.push(
      {
        sectionId: "schedule",
        sectionTitle: "4. Campaign Schedule",
        fields: [
          {
            name: "startDate",
            label: "Start Date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
          },
          {
            name: "endDate",
            label: "End Date",
            type: "date",
            required: true,
            defaultValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
          {
            name: "startTime",
            label: "Start Time",
            type: "time",
            required: false,
            defaultValue: "10:00",
          },
          {
            name: "endTime",
            label: "End Time",
            type: "time",
            required: false,
            defaultValue: "23:59",
          },
        ],
      },
      {
        sectionId: "banner",
        sectionTitle: "5. Campaign Banner",
        fields: [
          {
            name: "campaignBanner",
            label: "Campaign Banner Image",
            type: "file",
            required: false,
            recommendedSize: "1200 x 400 px",
          },
        ],
      },
    );

    return res.status(200).json({
      success: true,
      config: formConfig,
    });
  } catch (err) {
    console.error("GET CAMPAIGN CONFIG ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleCampaignAvailability = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    return res.status(200).json({
      success: true,
      message: `Campaign ${campaign.isActive ? "activated" : "deactivated"} successfully`,
      isActive: campaign.isActive,
    });
  } catch (err) {
    console.error("TOGGLE CAMPAIGN AVAILABILITY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
