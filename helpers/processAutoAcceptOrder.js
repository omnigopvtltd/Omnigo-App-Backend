const Order = require("../models/Order"); // Adjust path
const User = require("../models/User");   // Adjust path
const Notification = require("../models/Notification"); // Adjust path

// =====================================
// HELPER / CONTROLLER: PROCESS AUTO ACCEPT
// =====================================
exports.processAutoAcceptOrder = async (orderId, riderId, io) => {
  try {
    // 1. Fetch rider and check if auto accept is enabled
    const rider = await User.findOne({ _id: riderId, role: "rider" });
    if (!rider || !rider.autoAcceptOrders) {
      return { autoAccepted: false, reason: "Auto-accept is disabled or rider not found." };
    }

    // 2. Fetch order and ensure it is still available for acceptance
    const order = await Order.findById(orderId);
    if (!order || order.status !== "pending") {
      return { autoAccepted: false, reason: "Order is no longer available." };
    }

    // 3. Update Order status and assign Rider
    order.status = "accepted";
    order.riderId = rider._id;
    order.acceptedAt = new Date();
    await order.save();

    // 4. Create Notification Record for Rider
    const notification = await Notification.create({
      userId: rider._id,
      title: "Order Auto-Accepted! 🚗",
      message: `Order #${order.orderNumber || order._id} was automatically accepted for you.`,
      type: "order_auto_accepted",
      data: { orderId: order._id },
    });

    // 5. Emit Socket.io Real-time Notification to Rider
    if (io) {
      io.to(rider._id.toString()).emit("order_auto_accepted", {
        success: true,
        message: `Order #${order.orderNumber || order._id} auto-accepted!`,
        order,
        notification,
      });
    }

    return {
      autoAccepted: true,
      order,
      notification,
    };
  } catch (err) {
    console.error("AUTO ACCEPT ORDER ERROR:", err);
    throw err;
  }
};