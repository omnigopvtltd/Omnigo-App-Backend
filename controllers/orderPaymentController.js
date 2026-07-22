const mongoose = require("mongoose");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const WalletTransaction = require("../models/WalletTransaction");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");

// =========================================================================
// 1. RIDER BUYS FROM VENDOR / RESTAURANT (Debit Rider, Credit Restaurant)
// =========================================================================
exports.payVendorForOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, restaurantId, itemSubtotal, paymentMethod } = req.body;
    const riderId = req.user.id;

    // Validate Rider
    const rider = await User.findOne({ _id: riderId, role: "rider" }).session(session);
    if (!rider) throw new Error("Rider not found");

    const riderBalance = rider.wallet?.balance || 0;
    if (riderBalance < itemSubtotal) {
      throw new Error(`Insufficient wallet balance. Required: PKRs ${itemSubtotal}, Available: PKRs ${riderBalance}`);
    }

    // Validate Vendor
    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) throw new Error("Restaurant/Vendor not found");

    // 1. Deduct float from Rider Wallet
    const newRiderBalance = riderBalance - Number(itemSubtotal);
    rider.wallet = { balance: newRiderBalance };
    await rider.save({ session });

    // Capture Rider Transaction Slip
    const [riderTx] = await WalletTransaction.create(
      [
        {
          userId: rider._id,
          type: "debit",
          amount: Number(itemSubtotal),
          reason: `Vendor purchase for Order #${orderId} via ${paymentMethod}`,
          balanceAfter: newRiderBalance,
          source: "order_float",
          orderId,
        },
      ],
      { session }
    );

    // 2. Credit Vendor Wallet
    const newRestBalance = (restaurant.wallet?.balance || 0) + Number(itemSubtotal);
    restaurant.wallet = { balance: newRestBalance };
    await restaurant.save({ session });

    // Capture Vendor Transaction Slip
    const [vendorTx] = await WalletTransaction.create(
      [
        {
          userId: restaurant.owner || restaurant._id,
          restaurantId: restaurant._id,
          type: "credit",
          amount: Number(itemSubtotal),
          reason: `Payment received for Order #${orderId} via ${paymentMethod}`,
          balanceAfter: newRestBalance,
          source: "order_earning",
          orderId,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Clean JSON response containing formatted slips
    return res.status(200).json({
      success: true,
      message: "Vendor payment processed successfully",
      riderBalance: newRiderBalance,
      vendorBalance: newRestBalance,
      slips: {
        riderTransaction: {
          transactionId: riderTx._id,
          type: riderTx.type,
          amount: riderTx.amount,
          balanceAfter: riderTx.balanceAfter,
          reason: riderTx.reason,
          source: riderTx.source,
          orderId: riderTx.orderId,
          createdAt: riderTx.createdAt,
        },
        vendorTransaction: {
          transactionId: vendorTx._id,
          type: vendorTx.type,
          amount: vendorTx.amount,
          balanceAfter: vendorTx.balanceAfter,
          reason: vendorTx.reason,
          source: vendorTx.source,
          orderId: vendorTx.orderId,
          createdAt: vendorTx.createdAt,
        },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 2. CUSTOMER PAYS RIDER AT DELIVERY (Cash / JazzCash / EasyPaisa / Bank)
// =========================================================================
exports.completeOrderDelivery = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, totalCustomerPaid, deliveryFee } = req.body;
    const riderId = req.user.id;

    const rider = await User.findOne({ _id: riderId, role: "rider" }).session(session);
    if (!rider) throw new Error("Rider not found");

    // 1. Credit Customer Collection + Delivery Fee to Rider Wallet
    const totalCredit = Number(totalCustomerPaid) + Number(deliveryFee);
    let currentBalance = (rider.wallet?.balance || 0) + totalCredit;

    rider.wallet = { balance: currentBalance };
    await rider.save({ session });

    // Capture Order Earning Slip
    const [deliveryTx] = await WalletTransaction.create(
      [
        {
          userId: rider._id,
          type: "credit",
          amount: totalCredit,
          reason: `Delivery completed for Order #${orderId} (Customer Payment + Fee)`,
          balanceAfter: currentBalance,
          source: "order_earning",
          orderId,
        },
      ],
      { session }
    );

    let bonusTx = null;

    // 2. Check Rider Active Incentive Session & Increment Progress
    const activeParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    }).session(session);

    if (activeParticipation) {
      activeParticipation.completedOrders += 1;

      // Bonus Threshold Reached!
      if (activeParticipation.completedOrders >= activeParticipation.requiredOrders) {
        activeParticipation.status = "completed";
        activeParticipation.completedAt = new Date();

        const bonus = activeParticipation.bonusAmount;
        currentBalance += bonus;

        // Credit Bonus directly to Rider Wallet
        rider.wallet = { balance: currentBalance };
        await rider.save({ session });

        // Capture Bonus Transaction Slip
        const [createdBonusTx] = await WalletTransaction.create(
          [
            {
              userId: rider._id,
              type: "credit",
              amount: bonus,
              reason: `Incentive Session Bonus Payout: ${activeParticipation.sessionId}`,
              balanceAfter: currentBalance,
              source: "session_bonus",
            },
          ],
          { session }
        );

        bonusTx = createdBonusTx;
      }
      await activeParticipation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Construct Response Slips
    const slips = {
      deliveryTransaction: {
        transactionId: deliveryTx._id,
        type: deliveryTx.type,
        amount: deliveryTx.amount,
        balanceAfter: deliveryTx.balanceAfter,
        reason: deliveryTx.reason,
        source: deliveryTx.source,
        orderId: deliveryTx.orderId,
        createdAt: deliveryTx.createdAt,
      },
      bonusTransaction: bonusTx
        ? {
            transactionId: bonusTx._id,
            type: bonusTx.type,
            amount: bonusTx.amount,
            balanceAfter: bonusTx.balanceAfter,
            reason: bonusTx.reason,
            source: bonusTx.source,
            createdAt: bonusTx.createdAt,
          }
        : null,
    };

    return res.status(200).json({
      success: true,
      message: "Order finalized and earnings updated",
      walletBalance: currentBalance,
      slips,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: err.message });
  }
};