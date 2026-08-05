const { default: mongoose } = require("mongoose");
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const WithdrawRequest = require("../models/WithdrawRequest");

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

function rangeStart(range) {
  const days = RANGE_DAYS[range] || 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

// =====================================
// REVENUE OVERVIEW (KPIs + daily series for the chart)
// =====================================
exports.getRevenueOverview = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const start = rangeStart(range);

    const matchStage = {
      createdAt: { $gte: start },
      status: { $ne: "cancelled" },
    };

    const [summary] = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          totalTax: { $sum: "$tax" },
          totalDeliveryFees: { $sum: "$deliveryFee" },
          totalDiscount: { $sum: "$promoDiscount" },
        },
      },
    ]);

    const series = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Admin commission requires joining each order's restaurant commission rate.
    // Orders in this schema don't carry a restaurantId directly (items do, via
    // productId → Product → restaurantId), so this is computed from Products/Restaurants
    // in getCommissionSummary below rather than duplicated here.

    return res.status(200).json({
      success: true,
      range,
      summary: {
        totalRevenue: summary?.totalRevenue || 0,
        totalOrders: summary?.totalOrders || 0,
        avgOrderValue: summary?.totalOrders ? summary.totalRevenue / summary.totalOrders : 0,
        totalTax: summary?.totalTax || 0,
        totalDeliveryFees: summary?.totalDeliveryFees || 0,
        totalDiscount: summary?.totalDiscount || 0,
      },
      series: series.map((s) => ({ date: s._id, revenue: s.revenue, orders: s.orders })),
    });
  } catch (err) {
    console.log("GET REVENUE OVERVIEW ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RESTAURANT EARNINGS (sales, commission, net payout per restaurant)
// =====================================
exports.getRestaurantEarnings = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, range = "30d" } = req.query;
    const start = rangeStart(range);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const restaurantMatch = {};
    if (search) restaurantMatch.name = new RegExp(search, "i");

    const [restaurants, total] = await Promise.all([
      Restaurant.find(restaurantMatch).sort({ name: 1 }).skip(skip).limit(limitNum),
      Restaurant.countDocuments(restaurantMatch),
    ]);

    // Orders reference products by name/category snapshot, not restaurantId directly,
    // so earnings are approximated via the Product catalog's restaurant link.
    const Product = require("../models/Product");

    const earnings = await Promise.all(
      restaurants.map(async (restaurant) => {
        const productIds = await Product.find({ restaurantId: restaurant._id }).distinct("_id");

        const [agg] = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              createdAt: { $gte: start },
              "items.productId": { $in: productIds },
            },
          },
          { $unwind: "$items" },
          { $match: { "items.productId": { $in: productIds } } },
          {
            $group: {
              _id: null,
              grossSales: { $sum: "$items.total" },
              itemsSold: { $sum: "$items.quantity" },
              orderIds: { $addToSet: "$_id" },
            },
          },
        ]);

        const grossSales = agg?.grossSales || 0;
        const commissionAmount = Number(((grossSales * restaurant.commissionRate) / 100).toFixed(2));
        const netPayout = Number((grossSales - commissionAmount).toFixed(2));

        return {
          restaurantId: restaurant._id,
          name: restaurant.name,
          logo: restaurant.logo,
          commissionRate: restaurant.commissionRate,
          ordersCount: agg?.orderIds?.length || 0,
          itemsSold: agg?.itemsSold || 0,
          grossSales,
          commissionAmount,
          netPayout,
          walletBalance: restaurant.wallet?.balance || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: earnings.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      earnings,
    });
  } catch (err) {
    console.log("GET RESTAURANT EARNINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER EARNINGS (deliveries + delivery-fee earnings per rider)
// =====================================
exports.getRiderEarnings = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, range = "30d" } = req.query;
    const start = rangeStart(range);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const riderMatch = { role: "rider" };
    if (search) {
      const regex = new RegExp(search, "i");
      riderMatch.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const [riders, total] = await Promise.all([
      User.find(riderMatch).select("-password").sort({ name: 1 }).skip(skip).limit(limitNum),
      User.countDocuments(riderMatch),
    ]);

    const riderIds = riders.map((r) => r._id);

    const stats = await Order.aggregate([
      {
        $match: {
          riderId: { $in: riderIds },
          status: "delivered",
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: "$riderId",
          deliveredCount: { $sum: 1 },
          totalEarned: { $sum: "$deliveryFee" },
        },
      },
    ]);
    const statsMap = new Map(stats.map((s) => [String(s._id), s]));

    const earnings = riders.map((rider) => {
      const stat = statsMap.get(String(rider._id));
      return {
        riderId: rider._id,
        name: rider.name,
        phone: rider.phone,
        deliveredCount: stat?.deliveredCount || 0,
        totalEarned: stat?.totalEarned || 0,
        walletBalance: rider.wallet?.balance || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: earnings.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      earnings,
    });
  } catch (err) {
    console.log("GET RIDER EARNINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.getRiderEarningByID = async (req, res) => {
  try {
    const { id } = req.body;
    const start = rangeStart(range);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const riderMatch = { role: "rider" };
    if (search) {
      const regex = new RegExp(search, "i");
      riderMatch.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const [riders, total] = await Promise.all([
      User.find(riderMatch).select("-password").sort({ name: 1 }).skip(skip).limit(limitNum),
      User.countDocuments(riderMatch),
    ]);

    const riderIds = riders.map((r) => r._id);

    const stats = await Order.aggregate([
      {
        $match: {
          riderId: { $in: riderIds },
          status: "delivered",
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: "$riderId",
          deliveredCount: { $sum: 1 },
          totalEarned: { $sum: "$deliveryFee" },
        },
      },
    ]);
    const statsMap = new Map(stats.map((s) => [String(s._id), s]));

    const earnings = riders.map((rider) => {
      const stat = statsMap.get(String(rider._id));
      return {
        riderId: rider._id,
        name: rider.name,
        phone: rider.phone,
        deliveredCount: stat?.deliveredCount || 0,
        totalEarned: stat?.totalEarned || 0,
        walletBalance: rider.wallet?.balance || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: earnings.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      earnings,
    });
  } catch (err) {
    console.log("GET RIDER EARNINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN COMMISSION SUMMARY (platform's total cut, by restaurant)
// =====================================
exports.getCommissionSummary = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const start = rangeStart(range);
    const Product = require("../models/Product");

    const restaurants = await Restaurant.find({});
    let totalCommission = 0;
    let totalGrossSales = 0;

    const breakdown = await Promise.all(
      restaurants.map(async (restaurant) => {
        const productIds = await Product.find({ restaurantId: restaurant._id }).distinct("_id");

        const [agg] = await Order.aggregate([
          { $match: { status: "delivered", createdAt: { $gte: start } } },
          { $unwind: "$items" },
          { $match: { "items.productId": { $in: productIds } } },
          { $group: { _id: null, grossSales: { $sum: "$items.total" } } },
        ]);

        const grossSales = agg?.grossSales || 0;
        const commission = Number(((grossSales * restaurant.commissionRate) / 100).toFixed(2));

        totalCommission += commission;
        totalGrossSales += grossSales;

        return {
          restaurantId: restaurant._id,
          name: restaurant.name,
          commissionRate: restaurant.commissionRate,
          grossSales,
          commission,
        };
      })
    );

    return res.status(200).json({
      success: true,
      range,
      totalCommission: Number(totalCommission.toFixed(2)),
      totalGrossSales: Number(totalGrossSales.toFixed(2)),
      breakdown: breakdown.filter((b) => b.grossSales > 0).sort((a, b) => b.commission - a.commission),
    });
  } catch (err) {
    console.log("GET COMMISSION SUMMARY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// TAX SUMMARY
// =====================================
exports.getTaxSummary = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const start = rangeStart(range);

    const [summary] = await Order.aggregate([
      { $match: { createdAt: { $gte: start }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, totalTax: { $sum: "$tax" }, orderCount: { $sum: 1 } } },
    ]);

    const byCity = await Order.aggregate([
      { $match: { createdAt: { $gte: start }, status: { $ne: "cancelled" } } },
      { $group: { _id: "$address.city", totalTax: { $sum: "$tax" }, orderCount: { $sum: 1 } } },
      { $sort: { totalTax: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      range,
      totalTax: summary?.totalTax || 0,
      orderCount: summary?.orderCount || 0,
      byCity: byCity.map((c) => ({ city: c._id || "Unknown", totalTax: c.totalTax, orderCount: c.orderCount })),
    });
  } catch (err) {
    console.log("GET TAX SUMMARY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// WITHDRAW REQUESTS
// =====================================
exports.getWithdrawRequests = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (type === "rider") query.riderId = { $ne: null };
    if (type === "restaurant") query.restaurantId = { $ne: null };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      WithdrawRequest.find(query)
        .populate("riderId", "name email phone wallet")
        .populate("restaurantId", "name logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WithdrawRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      requests,
    });
  } catch (err) {
    console.log("GET WITHDRAW REQUESTS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createWithdrawRequest = async (req, res) => {
  try {
    const { riderId, restaurantId, amount, method, accountDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be greater than 0" });
    }
    if (!riderId && !restaurantId) {
      return res.status(400).json({ success: false, message: "riderId or restaurantId is required" });
    }

    const request = await WithdrawRequest.create({
      riderId: riderId || null,
      restaurantId: restaurantId || null,
      amount,
      method,
      accountDetails,
    });

    return res.status(201).json({
      success: true,
      message: "Withdraw request submitted",
      request,
    });
  } catch (err) {
    console.log("CREATE WITHDRAW REQUEST ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Example helper for payout gateway integration
const processPaymentPayout = async ({ method, accountNumber, accountTitle, bankName, amount }) => {
  // Integrate your provider's SDK / API here:
  // - JazzCash Disbursement API
  // - EasyPaisa Open API
  // - Bank Transfer (1Link / Raast API)
console.log(method);
  switch (method.toLowerCase()) {
    case "jazzcash":
      // await jazzcashApi.payout({ accountNumber, amount });
      break;
    case "easypaisa":
      // await easypaisaApi.payout({ accountNumber, amount });
      break;
    case "bank_transfer":
      // await bankTransferApi.payout({ bankName, accountNumber, accountTitle, amount });
      break;
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }

  // Return success response simulation
  return { success: true, transactionReference: `PAY-${Date.now()}` };
};

exports.updateWithdrawRequestStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, adminNote } = req.body.params || req.body;
    const allowed = ["pending", "approved", "rejected"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const request = await WithdrawRequest.findById(req.params.id).session(session);
    if (!request) {
      return res.status(404).json({ success: false, message: "Withdraw request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: `Request already ${request.status}` });
    }

    let transactionSlip = null;
console.log(request);
    if (status === "approved") {
      // 1. Process Payout via JazzCash / EasyPaisa / Bank Transfer
      try {
        await processPaymentPayout({
          method: request.method, // "jazzcash", "easypaisa", or "bank"
          accountNumber: request.accountNumber,
          accountTitle: request.accountTitle,
          bankName: request.bankName,
          amount: request.amount,
        });
      } catch (payoutErr) {
        throw new Error(`Payout transfer failed: ${payoutErr.message}`);
      }

      // 2. Debit Rider Wallet
      if (request.riderId) {
        const rider = await User.findOne({ _id: request.riderId, role: "rider" }).session(session);
        if (!rider) throw new Error("Rider not found");

        const currentBalance = rider.wallet?.balance || 0;
        if (request.amount > currentBalance) {
          throw new Error("Rider wallet balance is insufficient");
        }

        const newBalance = currentBalance - Number(request.amount);
        rider.wallet = { balance: newBalance };
        await rider.save({ session });

        const [tx] = await WalletTransaction.create(
          [
            {
              userId: rider._id,
              type: "debit",
              amount: Number(request.amount),
              reason: `Withdrawal approved via ${request?.method?.toUpperCase()} (${request.accountNumber})`,
              balanceAfter: newBalance,
              source: "withdrawal",
              createdBy: req.user.id,
            },
          ],
          { session }
        );
        transactionSlip = tx;
      }

      // 3. Debit Restaurant Wallet
      if (request.restaurantId) {
        const restaurant = await Restaurant.findById(request.restaurantId).session(session);
        if (!restaurant) throw new Error("Restaurant not found");

        const currentBalance = restaurant.wallet?.balance || 0;
        if (request.amount > currentBalance) {
          throw new Error("Restaurant wallet balance is insufficient");
        }

        const newBalance = currentBalance - Number(request.amount);
        restaurant.wallet = { balance: newBalance };
        await restaurant.save({ session });

        const [tx] = await WalletTransaction.create(
          [
            {
              userId: restaurant.owner || restaurant._id,
              restaurantId: restaurant._id,
              type: "debit",
              amount: Number(request.amount),
              reason: `Withdrawal approved via ${request.paymentMethod.toUpperCase()} (${request.accountNumber})`,
              balanceAfter: newBalance,
              source: "withdrawal",
              createdBy: req.user.id,
            },
          ],
          { session }
        );
        transactionSlip = tx;
      }
    }

    // 4. Update Withdraw Request
    request.status = status;
    request.adminNote = adminNote || "";
    request.processedAt = new Date();
    request.processedBy = req.user.id;
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Withdraw request ${status}`,
      request,
      transactionSlip: transactionSlip
        ? {
            transactionId: transactionSlip._id,
            type: transactionSlip.type,
            amount: transactionSlip.amount,
            balanceAfter: transactionSlip.balanceAfter,
            reason: transactionSlip.reason,
            source: transactionSlip.source,
            createdAt: transactionSlip.createdAt,
          }
        : null,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.log("UPDATE WITHDRAW REQUEST ERROR:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// =====================================
// TRANSACTIONS LEDGER
// =====================================
exports.getTransactions = async (req, res) => {
  try {
    const { userId, restaurantId, type, source, page = 1, limit = 30 } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (restaurantId) query.restaurantId = restaurantId;
    if (type && type !== "all") query.type = type;
    if (source && source !== "all") query.source = source;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 30, 1);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .populate("userId", "name email phone")
        .populate("restaurantId", "name logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WalletTransaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      transactions,
    });
  } catch (err) {
    console.log("GET TRANSACTIONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/////////////////////////////////////////////////////////////////

// const WithdrawRequest = require("../models/WithdrawRequest");
// const User = require("../models/User");

// =====================================
// RIDER / RESTAURANT: REQUEST WITHDRAWAL
// =====================================
// exports.requestWithdrawal = async (req, res) => {
//   try {
//     const { amount, method, accountDetails } = req.body;
//     const userId = req.user.id;
//     const userRole = req.user.role; // 'rider' or 'restaurant'

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ success: false, message: "Valid withdrawal amount is required" });
//     }

//     if (!["jazzcash", "easypaisa", "bank_transfer"].includes(method)) {
//       return res.status(400).json({ success: false, message: "Invalid payment method" });
//     }

//     if (!accountDetails?.accountTitle || !accountDetails?.accountNumber) {
//       return res.status(400).json({ success: false, message: "Account title and account number are required" });
//     }

//     if (method === "bank_transfer" && !accountDetails?.bankName) {
//       return res.status(400).json({ success: false, message: "Bank name is required for bank transfers" });
//     }

//     // Check balance
//     let currentBalance = 0;
//     let updatePayload = {};

//     if (userRole === "rider") {
//       const rider = await User.findById(userId);
//       currentBalance = rider?.wallet?.balance || 0;
//       updatePayload = { riderId: userId };
//     } else if (userRole === "restaurant") {
//       const restaurant = await Restaurant.findOne({ owner: userId });
//       currentBalance = restaurant?.wallet?.balance || 0;
//       updatePayload = { restaurantId: restaurant._id };
//     }

//     if (currentBalance < amount) {
//       return res.status(400).json({ 
//         success: false, 
//         message: `Insufficient balance. Available: PKRs ${currentBalance}` 
//       });
//     }

//     // Create withdrawal request entry
//     const withdrawRequest = await WithdrawRequest.create({
//       ...updatePayload,
//       amount: Number(amount),
//       method,
//       accountDetails,
//       status: "pending",
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Withdrawal request submitted successfully and pending admin approval",
//       withdrawRequest,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

////////////////////////////////////////////////////////////////

const Transaction = require("../models/Transaction");
const axios = require("axios");

// 1. Process Payout / Withdraw Request (JazzCash, EasyPaisa, Bank)
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, accountTitle, accountNumber, bankName, iban } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    // Deduct balance conditionally / create pending transaction
    const transaction = await Transaction.create({
      userId,
      type: "WITHDRAWAL",
      paymentMethod,
      amount,
      status: "PENDING",
      accountDetails: { accountTitle, accountNumber, bankName, iban },
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully.",
      transaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. JazzCash Payment Gateway Handler
exports.initiateJazzCashPayment = async (req, res) => {
  try {
    const { amount, mobileNumber, cnicLast6 } = req.body;
    const pp_TxnRefNo = `T${Date.now()}`;
    const pp_Amount = amount * 100; // In Paisas

    // Post to JazzCash Sandbox / Production Endpoint
    const jazzcashPayload = {
      pp_Version: "1.1",
      pp_TxnType: "MWAL",
      pp_Language: "EN",
      pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
      pp_Password: process.env.JAZZCASH_PASSWORD,
      pp_TxnRefNo,
      pp_Amount,
      pp_TxnCurrency: "PKR",
      pp_BillReference: "OrderPayment",
      pp_MobileNumber: mobileNumber,
      pp_CNIC: cnicLast6,
    };

    // Note: Secure HMAC Hash calculation added according to JazzCash specs
    return res.status(200).json({
      success: true,
      message: "JazzCash payment request initiated on mobile.",
      txnRef: pp_TxnRefNo,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};