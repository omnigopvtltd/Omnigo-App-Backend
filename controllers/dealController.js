// const Deal = require("../models/Deal");
// const Product = require("../models/Product");
// const Restaurant = require("../models/Restaurant");
// const User = require("../models/User");

// // =====================================
// // GET ACTIVE DEALS (PUBLIC / APP)
// // =====================================
// exports.getDeals = async (req, res) => {
//   try {
//     const deals = await Deal.find({
//       isActive: true,
//       $or: [
//         { validUntil: { $exists: false } },
//         { validUntil: { $gte: new Date() } },
//       ],
//     })
//       .populate("restaurantId", "name logo location")
//       .select("title bannerImage restaurantId")
//       .sort({ isFeatured: -1, createdAt: -1 });

//     const restaurants = await Restaurant.find({
//       _id: { $in: deals.map((d) => d.restaurantId) },
//     }).select("name logo");

//     const allDeals = [...deals, ...restaurants];

//     return res.status(200).json({
//       success: true,
//       count: deals.length,
//       data: allDeals,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // GET ACTIVE DEALS By Id (PUBLIC / APP)
// // =====================================
// exports.getDealsById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deals = await Deal.find({
//       _id: id,
//       isActive: true,
//     })
//       // .populate("restaurantId", "name logo location")
//       // .select("title bannerImage restaurantId")
//       // .sort({ isFeatured: -1, createdAt: -1 });

//     const restaurants = await Restaurant.find({
//       _id: { $in: deals.map((d) => d.restaurantId) },
//     }).select("name logo");

//     const allDeals = [...deals, ...restaurants];

//     return res.status(200).json({
//       success: true,
//       count: deals.length,
//       data: allDeals,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // GET DEALS DETAILS
// // =====================================
// exports.getDealDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deal = await Deal.findOne({
//       _id: id,
//       isActive: true,
//     })
//       .select(
//         "title description image bannerImage items originalPrice discountPrice dealType tag validFrom validUntil"
//       )
//       .populate("restaurantId", "name logo location")
//       .lean();

//     if (!deal) {
//       return res.status(404).json({
//         success: false,
//         message: "Deal not found or inactive",
//       });
//     }

//     // 1. Format deal products & calculate item total sum
//     let calculatedItemsTotal = 0;

//     const formattedProducts = deal.items.map((item) => {
//       const price = Number(item.price) || 0;
//       const quantity = Number(item.quantity) || 1;
//       const total = price * quantity;
      
//       calculatedItemsTotal += total;

//       return {
//         productId: item.productId,
//         name: item.name,
//         image: item.image,
//         category: item.category,
//         price,
//         quantity,
//         total,
//       };
//     });

//     // 2. Compute original, deal, and saved amounts
//     const originalPrice = Number(deal.originalPrice) || calculatedItemsTotal;
//     const discountPrice = Number(deal.discountPrice) || 0;
//     const amountSaved = Math.max(0, originalPrice - discountPrice);

//     return res.status(200).json({
//       success: true,
//       data: {
//         _id: deal._id,
//         title: deal.title,
//         description: deal.description,
//         image: deal.image,
//         bannerImage: deal.bannerImage,
//         restaurant: deal.restaurantId,
//         dealType: deal.dealType,
//         tag: deal.tag,
//         pricing: {
//           originalPrice,       // Total original price before discount
//           discountPrice,       // Deal final price
//           amountSaved,         // Price saved after discount
//           itemsSubtotal: calculatedItemsTotal, // Sum of all items inside deal
//         },
//         products: formattedProducts, // Array of products inside this deal
//         validFrom: deal.validFrom,
//         validUntil: deal.validUntil,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // =====================================
// // GET DEALS By Restaurant ID (PUBLIC / APP)
// // =====================================
// exports.getDealsByRestaurantId = async (req, res) => {
//   try {
//     const { restaurantId } = req.params;

//     const deals = await Deal.find({
//       isActive: true,
//       restaurantId,
//     })
//     .select("title image restaurantId originalPrice dealType")
//       // .populate("restaurantId", "name logo location")
//       .sort({ isFeatured: -1, createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: deals.length,
//       data: deals,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
// // =====================================
// // GET DAILY DEALS By Restaurant ID (PUBLIC / APP)
// // =====================================
// exports.getDailyDeals = async (req, res) => {
//   try {
//     const { type } = req.query; // e.g., "daily-deal"

//     let requestedType;
//     if (type === "daily-deal") {
//       requestedType = "Daily Deal";
//     }
    
//     const deals = await Deal.find({
//       isActive: true,
//       dealType: requestedType,
//     })
//       .select(
//         "title description image restaurantId originalPrice discountPrice dealType",
//       )
//       .populate("restaurantId", "name logo rating deliveryFee deliveryTime")
//       .sort({ isFeatured: -1, createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: deals.length,
//       data: deals,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // CREATE DEAL (ADMIN) + SOCKET BROADCAST
// // =====================================
// exports.createDeal = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       image,
//       bannerImage,
//       restaurantId,
//       items, // 1. Destructured items array
//       originalPrice,
//       discountPrice,
//       dealType,
//       tag,
//       isFeatured,
//       validUntil,
//     } = req.body;

//     // 2. Verify restaurant exists
//     const restaurant = await Restaurant.findById(restaurantId);
//     if (!restaurant) {
//       return res.status(404).json({
//         success: false,
//         message: "Restaurant not found",
//       });
//     }

//     // 3. Process & validate items array
//     let formattedItems = [];
//     let calculatedItemsTotal = 0;

//     if (Array.isArray(items) && items.length > 0) {
//       for (const item of items) {
//         // Fetch product from DB to auto-populate missing fields if needed
//         const product = await Product.findById(item.productId);
        
//         const price = Number(item.price || product?.price || 0);
//         const quantity = Number(item.quantity || 1);
//         const total = price * quantity;

//         calculatedItemsTotal += total;

//         formattedItems.push({
//           productId: item.productId,
//           name: item.name || product?.name || "",
//           image: item.image || product?.image || "",
//           category: item.category || product?.category || "",
//           price,
//           quantity,
//           total,
//         });
//       }
//     }

//     // Fallback to calculated total if originalPrice is not explicitly sent
//     const finalOriginalPrice = Number(originalPrice) || calculatedItemsTotal;

//     // 4. Create new deal with items
//     const newDeal = await Deal.create({
//       title,
//       description,
//       image,
//       bannerImage,
//       restaurantId,
//       items: formattedItems,
//       originalPrice: finalOriginalPrice,
//       discountPrice: Number(discountPrice) || 0,
//       dealType,
//       tag,
//       isFeatured,
//       validUntil,
//     });

//     const populatedDeal = await Deal.findById(newDeal._id).populate(
//       "restaurantId",
//       "name logo location"
//     );

//     // ========================================================
//     // REAL-TIME SOCKET BROADCAST
//     // ========================================================
//     const io = req.app.get("io");
//     if (io) {
//       io.emit("newDealPublished", {
//         message: "New deal available in your town!",
//         deal: populatedDeal,
//       });
//     }

//     // ========================================================
//     // FCM PUSH NOTIFICATIONS TO ALL ACTIVE USERS
//     // ========================================================
//     try {
//       const usersWithToken = await User.find({
//         role: "user",
//         fcmToken: { $exists: true, $ne: null },
//       }).select("fcmToken");

//       // Fixed: restaurant variable now correctly matches restaurant.name
//       const notificationTitle = `🔥 Deal Alert: ${restaurant.name}!`;
//       const notificationBody = title
//         ? `${title} for only Rs. ${discountPrice}!`
//         : `Check out today's special deal in your town!`;

//       usersWithToken.forEach((u) => {
//         if (u.fcmToken) {
//           sendNotification(u.fcmToken, notificationTitle, notificationBody, {
//             type: "new_deal",
//             dealId: populatedDeal._id.toString(),
//             restaurantId: restaurant._id.toString(),
//             bannerImage: populatedDeal.bannerImage || "",
//           }).catch((fcmErr) =>
//             console.error(`FCM error for token ${u.fcmToken}:`, fcmErr.message)
//           );
//         }
//       });
//     } catch (notifErr) {
//       console.error(
//         "DEAL NOTIFICATION ERROR (Non-blocking):",
//         notifErr.message
//       );
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Deal created successfully and broadcasted",
//       deal: populatedDeal,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // TOGGLE DEAL STATUS (DEACTIVATE/EXPIRE)
// // =====================================
// exports.updateDealStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { isActive } = req.body;

//     const updatedDeal = await Deal.findByIdAndUpdate(
//       id,
//       { isActive },
//       { new: true },
//     ).populate("restaurantId", "name logo");

//     if (!updatedDeal) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Deal not found" });
//     }

//     const io = req.app.get("io");
//     if (io) {
//       io.emit("dealStatusChanged", {
//         dealId: updatedDeal._id,
//         isActive: updatedDeal.isActive,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Deal status updated",
//       deal: updatedDeal,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

const Deal = require("../models/Deal");
const VendorBranch = require("../models/VendorBranch");

// Create Deal (Supports both Campaign-style Deals & Menu Combos)
exports.createDeal = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id || req.body.vendorId;

    const {
      dealName,
      dealType,
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
      dealBanner,
      isActive,
    } = req.body;

    if (!dealName || !dealType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "dealName, dealType, startDate, and endDate are required fields.",
      });
    }

    const deal = await Deal.create({
      vendorId,
      branchId: branchId || null,
      dealName,
      dealType: dealType.toLowerCase(),
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
      dealBanner,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Deal created successfully",
      deal,
    });
  } catch (err) {
    console.error("CREATE DEAL ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Deals (Identical response structure to getAllCampaigns)
exports.getAllDeals = async (req, res) => {
  try {
    const {
      search,
      isActive,
      dealType,
      branchId,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { dealName: new RegExp(search, "i") },
        { "offerDetails.dealTitle": new RegExp(search, "i") },
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === "true";
    if (dealType && dealType !== "all") query.dealType = dealType;
    if (branchId) query.branchId = branchId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate("vendorId", "businessName logo rating")
        .populate("branchId", "branchName address area city phone isOpen isActive")
        .populate("offerDetails.freeItemId", "name price image")
        .populate("offerDetails.comboItems", "name price image")
        .populate("offerDetails.itemsIncluded.product", "name price image")
        .populate("applicableCategories", "name")
        .populate("applicableProducts", "name price image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Deal.countDocuments(query),
    ]);

    const vendorIds = [
      ...new Set(deals.map((d) => d.vendorId?._id || d.vendorId).filter(Boolean)),
    ];
    const vendorBranches = await VendorBranch.find({ vendorId: { $in: vendorIds } }).lean();

    return res.status(200).json({
      success: true,
      count: deals.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      deals,
      vendorBranches, // Exact top-level key like campaigns response
    });
  } catch (err) {
    console.error("GET DEALS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Vendor Deals (Identical response structure to getAllCampaigns)
exports.getAllVendorDeals = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      search,
      isActive,
      dealType,
      branchId,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { dealName: new RegExp(search, "i") },
        { "offerDetails.dealTitle": new RegExp(search, "i") },
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === "true";
    if (dealType && dealType !== "all") query.dealType = dealType;
    if (branchId) query.branchId = branchId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [deals, total] = await Promise.all([
      Deal.find({ ...query, vendorId })
        .populate("vendorId", "businessName logo rating")
        .populate("branchId", "branchName address area city phone isOpen isActive")
        .populate("offerDetails.freeItemId", "name price image")
        .populate("offerDetails.comboItems", "name price image")
        .populate("offerDetails.itemsIncluded.product", "name price image")
        .populate("applicableCategories", "name")
        .populate("applicableProducts", "name price image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Deal.countDocuments(query),
    ]);

    const vendorIds = [
      ...new Set(deals.map((d) => d.vendorId?._id || d.vendorId).filter(Boolean)),
    ];
    const vendorBranches = await VendorBranch.find({ vendorId: { $in: vendorIds } }).lean();

    return res.status(200).json({
      success: true,
      count: deals.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      deals,
      vendorBranches, // Exact top-level key like campaigns response
    });
  } catch (err) {
    console.error("GET DEALS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Single Deal by ID
exports.getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("vendorId", "businessName logo rating")
      .populate("branchId", "branchName address area city phone isOpen isActive")
      .populate("offerDetails.freeItemId")
      .populate("offerDetails.comboItems")
      .populate("offerDetails.itemsIncluded.product")
      .populate("applicableCategories")
      .populate("applicableProducts");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    return res.status(200).json({ success: true, deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Deal
exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    const updateFields = [
      "dealName",
      "dealType",
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
      "dealBanner",
      "isActive",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        deal[field] = req.body[field];
      }
    });

    await deal.save();

    return res.status(200).json({
      success: true,
      message: "Deal updated successfully",
      deal,
    });
  } catch (err) {
    console.error("UPDATE DEAL ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Deal
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    return res.status(200).json({ success: true, message: "Deal deleted successfully" });
  } catch (err) {
    console.error("DELETE DEAL ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle Availability
exports.toggleDealAvailability = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    deal.isActive = !deal.isActive;
    await deal.save();

    return res.status(200).json({
      success: true,
      message: `Deal ${deal.isActive ? "activated" : "deactivated"} successfully`,
      isActive: deal.isActive,
    });
  } catch (err) {
    console.error("TOGGLE DEAL AVAILABILITY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Dynamic Form Configuration for Deals Frontend
exports.getDealFormConfig = async (req, res) => {
  try {
    const { dealType } = req.query;

    const formConfig = {
      dealType: dealType || "discount_deal",
      sections: [
        {
          sectionId: "basic_info",
          sectionTitle: "1. Deal Information",
          fields: [
            {
              name: "dealName",
              label: "Deal Name",
              type: "text",
              required: true,
              placeholder: "e.g. Fit For Three / Midnight Crave",
              defaultValue: "",
            },
            {
              name: "branchId",
              label: "Branch",
              type: "select",
              required: false,
              placeholder: "Select branch (Optional)",
              options: [],
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              required: false,
              placeholder: "Describe items or rules included in this deal...",
              defaultValue: "",
            },
          ],
        },
      ],
    };

    let offerFields = [];

    switch (dealType?.toLowerCase()) {
      case "flash_deal":
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
            defaultValue: 0,
          },
          {
            name: "minOrderAmount",
            label: "Minimum Order Amount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 1000",
            defaultValue: 0,
          },
          {
            name: "maxDiscountAmount",
            label: "Maximum Discount (Rs.)",
            type: "number",
            required: false,
            placeholder: "e.g. 500",
            defaultValue: 0,
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
            placeholder: "Select free item",
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
            placeholder: "e.g. Fit For Three",
            defaultValue: "",
          },
          {
            name: "offerDetails.itemsIncluded",
            label: "Items Included",
            type: "array_items",
            required: true,
            placeholder: "Add products or custom items...",
            defaultValue: [],
          },
          {
            name: "offerDetails.originalPrice",
            label: "Original Price (Rs.)",
            type: "number",
            required: false,
            placeholder: "2800",
            defaultValue: 0,
          },
          {
            name: "offerDetails.dealPrice",
            label: "Deal Price (Rs.)",
            type: "number",
            required: true,
            placeholder: "2299",
            defaultValue: 0,
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
            defaultValue: 0,
          },
          {
            name: "offerDetails.maxDeliveryDiscount",
            label: "Maximum Delivery Discount (Rs.)",
            type: "number",
            required: false,
            placeholder: "150",
            defaultValue: 0,
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
            placeholder: "Get 30% OFF with Card",
            defaultValue: "",
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
            defaultValue: 0,
          },
        ];
        break;

      default:
        offerFields = [
          {
            name: "offerDetails.dealTitle",
            label: "Deal Title",
            type: "text",
            required: true,
            placeholder: "Special Deal",
            defaultValue: "",
          },
          {
            name: "offerDetails.discountValue",
            label: "Discount Value",
            type: "number",
            required: false,
            placeholder: "20",
            defaultValue: 0,
          },
        ];
        break;
    }

    formConfig.sections.push({
      sectionId: "offer_details",
      sectionTitle: "2. Offer Details",
      fields: offerFields,
    });

    formConfig.sections.push({
      sectionId: "applies_on",
      sectionTitle: "3. Applies On",
      fields: [
        {
          name: "appliesTo",
          label: "Apply Deal To",
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

    formConfig.sections.push(
      {
        sectionId: "schedule",
        sectionTitle: "4. Deal Schedule",
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
            defaultValue: "00:00",
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
        sectionTitle: "5. Deal Banner",
        fields: [
          {
            name: "dealBanner",
            label: "Deal Banner Image",
            type: "file",
            required: false,
            recommendedSize: "1200 x 400 px",
          },
        ],
      }
    );

    return res.status(200).json({
      success: true,
      config: formConfig,
    });
  } catch (err) {
    console.error("GET DEAL CONFIG ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};