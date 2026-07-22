const User = require("../models/User");
const Order = require("../models/Order");

// Haversine Distance Formula in Kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate ETA based on city average speed (~25 km/h for bike delivery)
const calculateETA = (riderLat, riderLng, destLat, destLng) => {
  if (!riderLat || !riderLng || !destLat || !destLng) return 15;
  const distanceKm = calculateDistanceKm(riderLat, riderLng, destLat, destLng);
  const avgSpeedKmH = 25;
  const timeHours = distanceKm / avgSpeedKmH;
  const minutes = Math.ceil(timeHours * 60) + 5; // +5 mins buffer for traffic
  return Math.max(minutes, 3);
};

// =====================================
// 1. GET LIVE RIDER POSITIONS (Admin View)
// =====================================
exports.getLiveRiders = async (req, res) => {
  try {
    const riders = await User.find({
      role: "rider",
      "riderProfile.isOnline": true,
    }).select("name phone riderProfile.currentLocation riderProfile.vehicleType");

    const riderIds = riders.map((r) => r._id);

    const activeOrders = await Order.find({
      riderId: { $in: riderIds },
      status: { $in: ["assigned", "ongoing", "out_for_delivery"] },
    })
      .select("orderNumber riderId address location status createdAt acceptedAt")
      .populate("userId", "name phone");

    const orderByRider = new Map(activeOrders.map((o) => [String(o.riderId), o]));

    const positions = riders.map((rider) => {
      const activeOrder = orderByRider.get(String(rider._id));
      let calculatedEta = null;

      if (activeOrder && rider.riderProfile?.currentLocation?.lat && activeOrder.location?.lat) {
        calculatedEta = calculateETA(
          rider.riderProfile.currentLocation.lat,
          rider.riderProfile.currentLocation.lng,
          activeOrder.location.lat,
          activeOrder.location.lng
        );
      }

      return {
        riderId: rider._id,
        name: rider.name,
        phone: rider.phone,
        vehicleType: rider.riderProfile?.vehicleType || "bike",
        location: rider.riderProfile?.currentLocation || null,
        activeOrder: activeOrder
          ? {
              orderId: activeOrder._id,
              orderNumber: activeOrder.orderNumber,
              customerName: activeOrder.userId?.name || "Customer",
              customerPhone: activeOrder.userId?.phone || "",
              destination: activeOrder.address,
              etaMinutes: calculatedEta || 15,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: positions.length,
      riders: positions,
    });
  } catch (err) {
    console.log("GET LIVE RIDERS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// 2. UPDATE RIDER LOCATION (DB Sync + Socket Broadcast)
// =====================================
exports.updateRiderLocation = async (req, res) => {
  try {
    const { lat, lng, speed, heading, battery } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: "lat and lng are required" });
    }

    const rider = await User.findOneAndUpdate(
      { _id: req.user.id, role: "rider" },
      {
        "riderProfile.currentLocation": {
          lat,
          lng,
          speed: speed || 0,
          heading: heading || 0,
          battery: battery || null,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).select("name riderProfile.currentLocation");

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    // Broadcast over WebSockets
    try {
      const { getIO } = require("../socket");
      const io = getIO();

      const socketPayload = {
        riderId: rider._id,
        name: rider.name,
        location: rider.riderProfile.currentLocation,
      };

      // Emit to Admin Dashboard
      io.to("admin_tracking").emit("riderLocationUpdated", socketPayload);

      // Emit to Active Customer Tracking Room
      const activeOrder = await Order.findOne({
        riderId: rider._id,
        status: { $in: ["assigned", "ongoing", "out_for_delivery"] },
      }).select("_id");

      if (activeOrder) {
        io.to(`order_${activeOrder._id}`).emit("liveRiderLocation", socketPayload);
      }
    } catch (socketErr) {
      console.log("SOCKET BROADCAST SKIPPED:", socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Location updated",
      location: rider.riderProfile.currentLocation,
    });
  } catch (err) {
    console.log("UPDATE RIDER LOCATION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// 3. GET ACTIVE DELIVERIES (Required by Admin Dashboard)
// =====================================
exports.getActiveDeliveries = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["assigned", "ongoing", "out_for_delivery"] },
    })
      .populate("userId", "name phone")
      .populate("riderId", "name phone riderProfile.currentLocation riderProfile.vehicleType")
      .sort({ acceptedAt: -1 });

    const deliveries = orders.map((order) => {
      let calculatedEta = 15;
      if (order.riderId?.riderProfile?.currentLocation?.lat && order.location?.lat) {
        calculatedEta = calculateETA(
          order.riderId.riderProfile.currentLocation.lat,
          order.riderId.riderProfile.currentLocation.lng,
          order.location.lat,
          order.location.lng
        );
      }

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.userId?.name || "Customer",
        customerPhone: order.userId?.phone || "",
        riderName: order.riderId?.name || "Unassigned",
        riderPhone: order.riderId?.phone || "",
        destination: order.address,
        etaMinutes: calculatedEta,
        acceptedAt: order.acceptedAt,
        totalAmount: order.totalAmount,
      };
    });

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (err) {
    console.log("GET ACTIVE DELIVERIES ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};