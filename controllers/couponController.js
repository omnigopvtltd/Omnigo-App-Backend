const Coupon = require("../models/Coupon");

// =====================================
// CREATE COUPON
// =====================================
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, description, type, value, maxDiscount, minOrderAmount,
      usageLimit, perUserLimit, applicableRestaurants,
      startDate, endDate, isActive,
    } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });
    if (!type) return res.status(400).json({ success: false, message: "Coupon type is required" });
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }
    if (type !== "free_delivery" && (value === undefined || value === null)) {
      return res.status(400).json({ success: false, message: "value is required for this coupon type" });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A coupon with this code already exists" });
    }

    const coupon = await Coupon.create({
      code,
      description,
      type,
      value: value || 0,
      maxDiscount: maxDiscount || null,
      minOrderAmount: minOrderAmount || 0,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      applicableRestaurants: Array.isArray(applicableRestaurants) ? applicableRestaurants : [],
      startDate,
      endDate,
      isActive,
    });

    return res.status(201).json({ success: true, message: "Coupon created successfully", coupon });
  } catch (err) {
    console.log("CREATE COUPON ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET ALL COUPONS
// =====================================
exports.getAllCoupons = async (req, res) => {
  try {
    const { search, isActive, type, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) query.code = new RegExp(search, "i");
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (type && type !== "all") query.type = type;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [coupons, total] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Coupon.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      coupons,
    });
  } catch (err) {
    console.log("GET COUPONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET SINGLE COUPON
// =====================================
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate("applicableRestaurants", "name logo");
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, coupon });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// UPDATE COUPON
// =====================================
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: req.body.code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: "A coupon with this code already exists" });
      }
    }

    const fields = [
      "code", "description", "type", "value", "maxDiscount", "minOrderAmount",
      "usageLimit", "perUserLimit", "applicableRestaurants", "startDate", "endDate", "isActive",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) coupon[field] = req.body[field];
    });

    await coupon.save();

    return res.status(200).json({ success: true, message: "Coupon updated successfully", coupon });
  } catch (err) {
    console.log("UPDATE COUPON ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// DELETE COUPON
// =====================================
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    console.log("DELETE COUPON ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// VALIDATE COUPON (checkout flow — customer-facing)
// =====================================
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount, restaurantId } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ success: false, message: "Invalid coupon code" });

    if (!coupon.isCurrentlyValid()) {
      return res.status(400).json({ success: false, message: "This coupon is no longer valid" });
    }

    if (orderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
      });
    }

    if (
      coupon.applicableRestaurants.length > 0 &&
      restaurantId &&
      !coupon.applicableRestaurants.map(String).includes(String(restaurantId))
    ) {
      return res.status(400).json({ success: false, message: "This coupon isn't valid for this restaurant" });
    }

    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (Number(orderAmount || 0) * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === "fixed") {
      discount = coupon.value;
    } else if (coupon.type === "cashback") {
      discount = (Number(orderAmount || 0) * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    }
    // free_delivery discount is applied to deliveryFee by the checkout flow, not here

    return res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        discount: Number(discount.toFixed(2)),
        freeDelivery: coupon.type === "free_delivery",
      },
    });
  } catch (err) {
    console.log("VALIDATE COUPON ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};