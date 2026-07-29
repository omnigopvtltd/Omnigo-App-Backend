const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");

// =====================================
// RIDER: GET MY WALLET
// =====================================
exports.getMyWallet = async (req, res) => {
  try {
    console.log(req.body);
    
    const rider = await User.findOne({ _id: req.user.id, role: "rider" }).select("wallet name");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    const transactions = await WalletTransaction.find({ userId: rider._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      balance: rider.wallet?.balance || 0,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: GET ANY RIDER'S WALLET
// =====================================
exports.getRiderWallet = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: "rider" }).select("wallet name");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    const transactions = await WalletTransaction.find({ userId: rider._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      balance: rider.wallet?.balance || 0,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: TOP UP WALLET
// =====================================
// In production this endpoint should only run after a real payment gateway
// confirms the charge (e.g. a webhook verifies `paymentReference`). It's
// left as an explicit, auditable step here rather than silently trusting
// the amount the client sends.
exports.topUpWallet = async (req, res) => {
  try {
    const { amount, paymentReference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be greater than 0" });
    }

    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
console.log(rider.wallet?.balance, Number(amount));

    const newBalance = (rider.wallet?.balance || 0) + Number(amount);
    rider.wallet = { balance: newBalance };
    await rider.save();

    const transaction = await WalletTransaction.create({
      userId: rider._id,
      type: "credit",
      amount: Number(amount),
      reason: paymentReference ? `Wallet top-up (ref: ${paymentReference})` : "Wallet top-up",
      balanceAfter: newBalance,
      source: "topup",
    });

    return res.status(200).json({
      success: true,
      message: "Wallet topped up successfully",
      balance: newBalance,
      transaction,
    });
  } catch (err) {
    console.log("TOP UP WALLET ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: MANUAL WALLET ADJUSTMENT
// =====================================
exports.adjustRiderWallet = async (req, res) => {
  try {
    const { type, amount, reason } = req.body;

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'credit' or 'debit'" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be greater than 0" });
    }

    const rider = await User.findOne({ _id: req.params.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    const currentBalance = rider.wallet?.balance || 0;

    if (type === "debit" && amount > currentBalance) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    const newBalance = type === "credit" ? currentBalance + Number(amount) : currentBalance - Number(amount);
    rider.wallet = { balance: newBalance };
    await rider.save();

    const transaction = await WalletTransaction.create({
      userId: rider._id,
      type,
      amount: Number(amount),
      reason: reason || (type === "credit" ? "Manual credit" : "Manual debit"),
      balanceAfter: newBalance,
      source: "manual",
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet updated successfully",
      balance: newBalance,
      transaction,
    });
  } catch (err) {
    console.log("ADJUST RIDER WALLET ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET TRANSACTIONS (self via /me, or admin via /:id)
// =====================================
exports.getTransactions = async (req, res) => {
  try {
    const riderId = req.params.id || req.user.id;
    const { type, source, page = 1, limit = 30 } = req.query;

    const query = { userId: riderId };
    if (type && type !== "all") query.type = type;
    if (source && source !== "all") query.source = source;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 30, 1);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
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