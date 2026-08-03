const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const { getIO } = require("../socket");
// const { getIO } = require("../socket");

const sendNotification = require("../utils/sendNotification");

exports.dispatchOrderToNearestRider = async (orderId, io, maxDistanceMeters = 5000) => {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.status !== "pending" || order.isAssigned) return null;

    // Retrieve order pickup coordinates [longitude, latitude]
    const pickupCoordinates = order.location?.coordinates || [0, 0];

    // Find nearest online rider with auto-accept enabled
    const nearestRider = await User.findOne({
      role: "rider",
      isOnline: true,
      autoAcceptOrders: true,
      isBlocked: { $ne: true },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupCoordinates,
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    });

    if (nearestRider) {
      // 1. Assign Order
      order.status = "ongoing";
      order.riderId = nearestRider._id;
      order.isAssigned = true;
      order.acceptedAt = new Date();
      await order.save();

      // 2. Increment active session order counter
      const activeParticipation = await RiderSessionParticipation.findOne({
        riderId: nearestRider._id,
        status: "in_progress",
      });

      if (activeParticipation) {
        activeParticipation.completedOrders = (activeParticipation.completedOrders || 0) + 1;
        await activeParticipation.save();
      }

      // 3. Socket Emits (Customer + Order Rooms)
      if (io) {
        io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
          orderId: order._id,
          status: order.status,
        });

        io.to(`order_${order._id}`).emit("riderAssignedLive", {
          orderId: order._id,
          status: order.status,
          riderId: order.riderId,
          acceptedAt: order.acceptedAt,
        });

        // Notify rider directly
        io.to(nearestRider._id.toString()).emit("order_auto_accepted", {
          success: true,
          message: `Order #${order.orderNumber} auto-accepted!`,
          order,
        });
      }

      // 4. Send Push Notification to Customer
      const customer = await User.findById(order.userId);
      if (customer?.fcmToken) {
        await sendNotification(
          customer.fcmToken,
          "Order Accepted",
          `Rider ${nearestRider.name} has accepted your order #${order.orderNumber}`,
          {
            riderId: nearestRider._id.toString(),
            riderName: nearestRider.name || "",
            riderEmail: nearestRider.email || "",
            riderPhone: nearestRider.phone || "",
          }
        );
      }

      return { autoAccepted: true, rider: nearestRider, order };
    }

    return { autoAccepted: false };
  } catch (err) {
    console.error("DISPATCH ERROR:", err);
    throw err;
  }
};