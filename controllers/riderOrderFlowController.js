const Order = require("../models/Order");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");

function isFullyVerified(rider) {
  return (
    rider.riderProfile?.cnicVerification?.status === "verified" &&
    rider.riderProfile?.faceVerification?.status === "verified"
  );
}

// =====================================
// RIDER: ACCEPT ORDER (debits the wallet float — Option 1)
// =====================================
exports.acceptOrderWithWallet = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (rider.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked" });
    }
    if (!isFullyVerified(rider)) {
      return res.status(403).json({
        success: false,
        message: "Complete CNIC and face verification before accepting orders",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      status: "pending",
      isAssigned: false,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order already assigned or not found" });
    }

    const floatAmount = order.subtotal || 0;
    const currentBalance = rider.wallet?.balance || 0;

    if (floatAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. This order requires a float of ${floatAmount}, you have ${currentBalance}.`,
        requiredAmount: floatAmount,
        currentBalance,
      });
    }

    const newBalance = currentBalance - floatAmount;
    rider.wallet = { balance: newBalance };
    await rider.save();

    await WalletTransaction.create({
      userId: rider._id,
      type: "debit",
      amount: floatAmount,
      reason: `Order float held for ${order.orderNumber}`,
      balanceAfter: newBalance,
      source: "order_float",
      orderId: order._id,
    });

    // If the rider is mid-session (Option 2), tag this order so completing
    // it can count toward that session's progress.
    const activeParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });

    order.riderId = rider._id;
    order.isAssigned = true;
    order.acceptedAt = new Date();
    order.status = "ongoing";
    order.riderFloatAmount = floatAmount;
    order.riderFloatSettled = false;
    order.sessionParticipationId = activeParticipation?._id || null;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order accepted — float held from your wallet",
      order,
      walletBalance: newBalance,
    });
  } catch (err) {
    console.log("ACCEPT ORDER WITH WALLET ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: MARK DELIVERED (credits float + delivery fee — Option 1)
// =====================================
exports.completeOrderDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      riderId: req.user.id,
      status: "on_the_way" || "ongoing" || "ready",
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const rider = await User.findById(req.user.id);
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    // Refund the float that was held, plus the rider's delivery-fee earning.
    // (Customer pays the order total in cash on delivery; this replaces the
    // float that was fronted and adds the rider's actual earning on top.)
    const payout = (order.riderFloatAmount || 0) + (order.deliveryFee || 0);
    const newBalance = (rider.wallet?.balance || 0) + payout;

    rider.wallet = { balance: newBalance };
    await rider.save();

    await WalletTransaction.create({
      userId: rider._id,
      type: "credit",
      amount: payout,
      reason: `Payment collected + delivery fee for ${order.orderNumber}`,
      balanceAfter: newBalance,
      source: "order_earning",
      orderId: order._id,
    });

    order.status = "delivered";
    order.riderFloatSettled = true;
    order.paymentStatus = "paid";
    await order.save();

    // Advance session progress if this delivery belongs to an active session (Option 2)
    let sessionResult = null;
    if (order.sessionParticipationId) {
      sessionResult = await advanceSessionProgress(order.sessionParticipationId, order._id);
    }

    // 2. Get Global Socket IO instance
    const io = req.app.get("io");

    // 3. Emit Sockets directly from Controller!
    // Broadcast to Specific User
    io.to(`user:${order.userId}`).emit("orderStatusUpdated", {
      orderId: order._id,
      status: "Delivered",
      message: "Your order has been delivered successfully"
    });

     // FCM Push Notification
    const customer = await User.findById(order.userId);
    if (customer?.fcmToken) {
      await sendNotification(
        customer.fcmToken,
        "Order Delivered",
        `Your order has delivered  #${order.orderNumber}`,
        {
          riderId: rider._id.toString(),
          riderName: rider.name || "",
          riderEmail: rider.email || "",
          riderPhone: rider.phone || "",
        },
      );
    }


    return res.status(200).json({
      success: true,
      message: "Order delivered — wallet credited",
      order,
      walletBalance: newBalance,
      session: sessionResult,
    });
  } catch (err) {
    console.log("COMPLETE ORDER DELIVERY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Shared with riderSessionController's internal logic — kept here to avoid a
// circular require, since order delivery is what drives session progress.
async function advanceSessionProgress(participationId, orderId) {
  
  const participation = await RiderSessionParticipation.findById(participationId);
  if (!participation || participation.status !== "in_progress") return null;

  participation.ordersCompleted += 1;
  participation.orderIds.push(orderId);

  if (participation.ordersCompleted >= participation.requiredOrders) {
    participation.status = "completed";
    participation.completedAt = new Date();

    const rider = await User.findById(participation.riderId);
    if (rider) {
      const newBalance = (rider.wallet?.balance || 0) + participation.bonusAmount;
      rider.wallet = { balance: newBalance };
      await rider.save();

      await WalletTransaction.create({
        userId: rider._id,
        type: "credit",
        amount: participation.bonusAmount,
        reason: `Session bonus — completed ${participation.requiredOrders} orders`,
        balanceAfter: newBalance,
        source: "session_bonus",
        sessionParticipationId: participation._id,
      });

      participation.bonusPaid = true;
    }
  }

  await participation.save();
  return participation;
}

exports._advanceSessionProgress = advanceSessionProgress; // exported for reuse/testing