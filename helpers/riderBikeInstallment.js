const RiderBikeLoan = require("../models/RiderBikeLoan");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");

const processRiderBikeInstallment = async (riderId, adminId = null) => {
  const loan = await RiderBikeLoan.findOne({ riderId, status: "ACTIVE" });

  // Return if no active bike loan exists
  if (!loan) return { status: "NO_LOAN" };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Check if today's deduction was already processed
  const alreadyDeducted = await WalletTransaction.findOne({
    userId: riderId,
    source: "bike_installment",
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (alreadyDeducted && !adminId) {
    return { status: "ALREADY_DEDUCTED_TODAY" };
  }

  const rider = await User.findById(riderId);
  if (!rider) throw new Error("Rider not found");

  const deductionAmount = Math.min(loan.dailyInstallment, loan.remainingAmount);

  // Deduct from rider's wallet balance
  const newBalance = rider.walletBalance - deductionAmount;
  rider.walletBalance = newBalance;
  await rider.save();

  // Update Bike Loan Progress
  loan.paidAmount += deductionAmount;
  loan.remainingAmount -= deductionAmount;
  if (loan.remainingAmount <= 0) {
    loan.status = "COMPLETED";
  }
  await loan.save();

  // Log in your existing WalletTransaction model
  const transaction = await WalletTransaction.create({
    userId: riderId,
    type: "debit",
    amount: deductionAmount,
    balanceAfter: newBalance,
    source: "bike_installment",
    reason: `Daily bike installment deduction (${loan.remainingAmount} remaining)`,
    createdBy: adminId || null,
  });

  return { status: "SUCCESS", deductionAmount, transaction };
};

module.exports = { processRiderBikeInstallment };