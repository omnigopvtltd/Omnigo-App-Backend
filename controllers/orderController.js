const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");
// const Settings = require("../models/Settings"); // Ensured import for handleOrderAssignment
const sendNotification = require("../utils/sendNotification");
const { processRiderBikeInstallment } = require("../helpers/bikeInstallment");
const Cart = require("../models/Cart");
const WalletTransaction = require("../models/WalletTransaction");
const Vendor = require("../models/Vendor");

exports.createOrder = async (req, res) => {
  try {
    const {
      address,
      addressId,
      stops = [],
      paymentMethod = "cash_on_delivery",
      promoDiscount = 0,
      instructions = "",
      deliveryFee = 200,
      tax = 2.5,
      routingMetrics,
    } = req.body;

    const user = await User.findById({
      _id: req.user.id,
      addresses: { $elemMatch: { _id: addressId } },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Cart Validation
    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Process items & subtotal from Cart
    let subtotal = 0;
    const formattedItems = cart.items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const total = price * quantity;
      subtotal += total;

      return {
        productId: item.productId,
        name: item.name,
        orderFrom: item.orderFrom || "fast-food",
        image: item.image,
        category: item.category,
        weight: item.weight,
        price,
        quantity,
        total,
      };
    });

    const savedAddresses = user.addresses.filter(
      (addr) => addr.isSave === true,
    );

    // Format delivery address with GeoJSON fallback
    const formattedAddress = {
      phone: savedAddresses[0]?.phone || user.phone || "",
      address: savedAddresses[0]?.address || user.address || "",
      city: savedAddresses[0]?.city || "Karachi",
      zipCode: savedAddresses[0]?.zipCode || "",
      country: savedAddresses[0]?.country || "Pakistan",
      location: {
        type: "Point",
        coordinates: savedAddresses[0]?.location?.coordinates ||
          user.location?.coordinates || [0, 0],
      },
    };

    const discount = Number(promoDiscount) || 0;
    const totalAmount = subtotal + Number(deliveryFee) + Number(tax) - discount;

    const order = await Order.create({
      orderNumber: "ORD" + Date.now() + Math.floor(Math.random() * 1000),
      userId: req.user.id,
      address: formattedAddress,
      stops,
      items: formattedItems,
      paymentMethod,
      paymentStatus: "pending",
      subtotal,
      deliveryFee: Number(deliveryFee),
      tax: Number(tax),
      instructions,
      promoDiscount: discount,
      totalAmount,
      routingMetrics,
      status: "pending",
      riderId: null,
      isAssigned: false,
    });

    // CLEAR CART & NOTIFY SOCKETS
    cart.items = [];
    await cart.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${req.user.id}`).emit("cart_updated", cart);
      io.to("role:admin").emit("adminNewOrder", order);
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      orderId: order._id,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET MY ORDERS
// =====================================
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET SINGLE ORDER
// =====================================
exports.getOrderById = async (req, res) => {
  try {
    const orderDoc = await Order.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("stops.vendorId", "name logo address contact location");

    if (!orderDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const productIds = orderDoc.items
      .map((item) => item.productId)
      .filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "name price restaurantId chefId",
    );

    const restaurantIds = products
      .map((p) => p.restaurantId || p.chefId)
      .filter(Boolean);
    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
    }).select("name logo address contact");

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const restaurantMap = new Map(
      restaurants.map((r) => [r._id.toString(), r]),
    );

    const order = orderDoc.toObject();
    order.items = order.items.map((item) => {
      const product = productMap.get(item.productId?.toString());
      const storeId = product?.restaurantId || product?.chefId;
      const vendor = storeId ? restaurantMap.get(storeId.toString()) : null;

      return {
        ...item,
        productDetails: product || null,
        vendorDetails: vendor || null,
      };
    });

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("GET ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// CANCEL ORDER
// =====================================
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Process rider unassignment & float refund if a rider was attached
    if (order.riderId) {
      const rider = await User.findById(order.riderId);

      if (rider) {
        // 1. Refund Float if held and unsettled
        if (order.riderFloatAmount > 0 && !order.riderFloatSettled) {
          const newBalance =
            (rider.wallet?.balance || 0) + order.riderFloatAmount;

          rider.wallet = rider.wallet || {};
          rider.wallet.balance = newBalance; // Safely update balance without wiping subdocument

          await WalletTransaction.create({
            userId: rider._id,
            type: "credit",
            amount: order.riderFloatAmount,
            reason: `Float refunded — ${order.orderNumber} was cancelled`,
            balanceAfter: newBalance,
            source: "order_refund",
            orderId: order._id,
          });

          order.riderFloatSettled = true;
        }

        // 2. Update Rider Availability & Tracking
        if (rider.riderProfile) {
          rider.riderProfile.isBusy = false;
          // rider.riderProfile.riderCanceledOrder = order._id;
        }

        await rider.save();
      }
    }

    // 3. Reset Order State so it can be picked up by another rider
    order.riderId = null;
    order.isAssigned = false;
    order.status = "cancelled";

    await order.save();

    // 2. Get Global Socket IO instance
    const io = req.app.get("io");

    // 3. Emit Sockets directly from Controller!
    // Broadcast to Specific User
    io.to(`user:${order.userId}`).emit("orderStatusUpdated", {
      orderId: order._id,
      status: "cancelled",
      message: "Your order has cancelled.",
    });

    // FCM Push Notification
    const customer = await User.findById(order.userId);
    if (customer?.fcmToken) {
      await sendNotification(
        customer.fcmToken,
        "Order Cancelled",
        `Your order has cancelled #${order.orderNumber}`,
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
      message: "Order Cancelled by Customer",
      order,
    });
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelRiderOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const rider = await User.findById(req.user?.id);

    // Check if Rider previously cancelled this order
    const isCancelledByRider = rider.riderProfile?.riderCanceledOrder?.some(
      (orderId) => orderId.toString() === req.params.id,
    );
    console.log("is Order Cancelled By Rider", isCancelledByRider);

    if (isCancelledByRider) {
      return res.status(400).json({
        success: false,
        message:
          "You have previously cancelled this order and cannot accept it again.",
      });
    }

    if (order.riderId == null) {
      return res
        .status(404)
        .json({ success: false, message: "Accept Order First" });
    }

    // Process rider unassignment & float refund if a rider was attached
    if (order.riderId) {
      // const rider = await User.findById(order.riderId);
      console.log(rider);
      if (rider) {
        // Refund Float if held and unsettled
        if (order.riderFloatAmount > 0 && !order.riderFloatSettled) {
          const newBalance =
            (rider.wallet?.balance || 0) + order.riderFloatAmount;

          rider.wallet = rider.wallet || {};
          rider.wallet.balance = newBalance; // Safely update balance without wiping subdocument

          await WalletTransaction.create({
            userId: rider._id,
            type: "credit",
            amount: order.riderFloatAmount,
            reason: `Float refunded — ${order.orderNumber} was cancelled`,
            balanceAfter: newBalance,
            source: "order_refund",
            orderId: order._id,
          });

          order.riderFloatSettled = true;
        }

        // Update Rider Availability & Tracking
        if (rider.riderProfile) {
          rider.riderProfile.isBusy = false;

          // Ensure array exists and avoid duplicate entries
          if (!rider.riderProfile.riderCanceledOrder) {
            rider.riderProfile.riderCanceledOrder = [];
          }

          const orderIdStr = order._id.toString();
          const alreadyInList = rider.riderProfile.riderCanceledOrder.some(
            (id) => id.toString() === orderIdStr,
          );

          if (!alreadyInList) {
            rider.riderProfile.riderCanceledOrder.push(order._id);
          }
        }

        await rider.save();
      }
    }

    // 3. Reset Order State so it can be picked up by another rider
    order.riderId = null;
    order.isAssigned = false;
    order.status = "confirmed";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order Cancelled by Rider",
      order,
    });
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// =====================================
// CONFIRM ORDER
// =====================================
exports.confirmOrder = async (req, res) => {
  try {
    const vendorId = req.user?.id || req.user?._id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Vendor ID missing",
      });
    }

    // 1. Find Order associated with this Vendor
    const order = await Order.findOne({
      _id: req.params.id,
      "stops.vendorId": vendorId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found for this vendor" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled order cannot be confirmed",
      });
    }

    // 2. Update Vendor Specific Stop Status to 'assigned' or 'confirmed'
    let vendorStopFound = false;
    order.stops.forEach((stop) => {
      if (stop.vendorId && stop.vendorId.toString() === vendorId.toString()) {
        stop.status = "assigned"; // Vendor status updated
        vendorStopFound = true;
      }
    });

    if (!vendorStopFound) {
      return res.status(400).json({
        success: false,
        message: "Vendor stop not matching order stops",
      });
    }

    // 3. Update Overall Order Status to 'confirmed'
    order.status = "confirmed";
    await order.save();

    // 4. Socket IO Real-time Updates
    const io = req.app.get("io");

    if (io) {
      // Broadcast to all active Riders
      io.to("role:rider").emit("newRiderOrderAvailable", order);

      // Broadcast to specific Customer
      io.to(`user:${order.userId}`).emit("orderStatusUpdated", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: "confirmed",
        vendorStatus: "assigned",
        message: "Your order has been confirmed by the vendor!",
      });
    }

    // 5. Send FCM Push Notification to Customer
    const customer = await User.findById(order.userId);
    if (customer?.fcmToken) {
      await sendNotification(
        customer.fcmToken,
        "Order Confirmed",
        `Your order #${order.orderNumber} has been confirmed by the vendor.`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      vendorStatus: "assigned",
      orderStatus: order.status,
      order,
    });
  } catch (err) {
    console.error("CONFIRM ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// READY ORDER
// =====================================
exports.readyOrder = async (req, res) => {
  try {
    const vendorId = req.user?.id || req.user?._id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Vendor ID missing",
      });
    }

    // 1. Find Order belonging to this Vendor
    const order = await Order.findOne({
      _id: req.params.id,
      "stops.vendorId": vendorId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found for this vendor" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled order status cannot be changed to ready",
      });
    }

    // 2. Update Vendor Specific Stop Status to 'ready'
    let vendorStopFound = false;
    order.stops.forEach((stop) => {
      if (stop.vendorId && stop.vendorId.toString() === vendorId.toString()) {
        stop.status = "ready"; // Vendor level status
        vendorStopFound = true;
      }
    });

    if (!vendorStopFound) {
      return res.status(400).json({
        success: false,
        message: "Vendor stop not matching order stops",
      });
    }

    // 3. Update Main Order Status to 'ready'
    order.status = "ready";
    await order.save();

    // 4. Socket IO Real-Time Notifications
    const io = req.app.get("io");

    if (io) {
      // Notify Assigned Rider (if rider is already assigned)
      if (order.driverId || order.riderId) {
        const assignedRiderId = order.driverId || order.riderId;
        io.to(`rider:${assignedRiderId}`).emit("orderReadyForPickup", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          message: "Order is ready for pickup at the vendor!",
        });
      } else {
        // Broadcast to available riders if no rider assigned yet
        io.to("role:rider").emit("newRiderOrderAvailable", order);
      }

      // Notify Customer
      io.to(`user:${order.userId}`).emit("orderStatusUpdated", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: "ready",
        vendorStatus: "ready",
        message: "Your order is ready for pickup/delivery!",
      });
    }

    // 5. Send FCM Push Notification to Customer
    const customer = await User.findById(order.userId);
    if (customer?.fcmToken) {
      await sendNotification(
        customer.fcmToken,
        "Order Ready",
        `Your order #${order.orderNumber} is prepared and ready!`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as ready successfully",
      vendorStatus: "ready",
      orderStatus: order.status,
      order,
    });
  } catch (err) {
    console.error("READY ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};;

// =====================================
// GET ONGOING ORDERS
// =====================================
exports.getOngoingOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.id,
      status: {
        $in: [
          "confirmed",
          "preparing",
          "arrived_at_vendor",
          "picked_up",
          "ongoing",
          "on_the_way",
        ],
      },
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET AVAILABLE ORDERS (Unassigned)
// =====================================
exports.getAvailableOrders = async (req, res) => {
  try {
    const allOrders = await Order.find({
      status: "confirmed",
      isAssigned: false,
    })
      .populate("userId", "name email phone")
      .populate("stops.vendorId", "name logo address contact location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: allOrders.length,
      orders: allOrders,
    });
  } catch (err) {
    console.error("GET AVAILABLE ORDERS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ACCEPT ORDER
// =====================================
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      status: "confirmed",
      isAssigned: false,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order already assigned or not found",
      });
    }

    const rider = await User.findById(req.user.id);
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    // Check for any existing active orders
    const activeOrders = await Order.find({
      riderId: req.user.id,
      status: {
        $in: [
          "preparing",
          "arrived_at_vendor",
          "picked_up",
          "ongoing",
          "on_the_way",
        ],
      },
    });

    // Check if Rider previously cancelled this order
    const isCancelledByRider = rider.riderProfile?.riderCanceledOrder?.some(
      (orderId) => orderId.toString() === req.params.id,
    );

    if (isCancelledByRider) {
      return res.status(400).json({
        success: false,
        message:
          "You have previously cancelled this order and cannot accept it again.",
      });
    }

    if (activeOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Deliver your ongoing order first",
      });
    }

    if ((rider.wallet?.balance || 0) < order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: "You have insufficient balance to accept this order",
      });
    }

    // Update Order Details
    order.riderId = rider._id;
    order.isAssigned = true;
    order.acceptedAt = new Date();
    order.status = "on_the_way";

    // Mark Rider Busy
    if (rider.riderProfile) {
      rider.riderProfile.isBusy = true;
      await rider.save();
    }

    // Link Active Participation Session
    const activeParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });

    if (activeParticipation) {
      order.sessionParticipationId = activeParticipation._id;
    }

    await order.save();

    // WebSockets Notifications
    const io = req.app.get("io");
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
    }

    // FCM Push Notification
    const customer = await User.findById(order.userId);
    if (customer?.fcmToken) {
      await sendNotification(
        customer.fcmToken,
        "Order Accepted",
        `Rider ${rider.name} has accepted your order #${order.orderNumber}`,
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
      message: "Order accepted successfully",
      order,
      rider: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
      },
    });
  } catch (err) {
    console.error("ACCEPT ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET RIDER ACTIVE ORDERS
// =====================================
exports.getRiderActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.find({
      riderId: req.user.id,
      status: {
        $in: [
          "confirmed",
          "preparing",
          "arrived_at_vendor",
          "picked_up",
          "ongoing",
          "on_the_way",
        ],
      },
    })
      .populate("userId", "name email phone")
      .populate("stops.vendorId", "name address location phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      hasActiveOrder: activeOrders.length > 0,
      count: activeOrders.length,
      orders: activeOrders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// MARK DELIVERED
// =====================================
exports.markDelivered = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      riderId: req.user.id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or unassigned" });
    }

    if (order.status === "delivered") {
      return res
        .status(400)
        .json({ success: false, message: "Order is already delivered" });
    }

    // 1. Fetch Rider
    const rider = await User.findById(req.user.id);
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    if (rider.isBlocked) {
      return res
        .status(403)
        .json({ success: false, message: "Your account is blocked" });
    }

    let bonusAwarded = false;
    let bonusAmount = 0;

    // 2. Process active session participation & check for completed bonus
    const currentParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    }).populate("sessionId"); // Populating to access requiredOrders & bonusAmount from target session

    if (currentParticipation) {
      currentParticipation.completedOrders =
        (currentParticipation.completedOrders || 0) + 1;

      if (!currentParticipation.orderIds) {
        currentParticipation.orderIds = [];
      }
      if (!currentParticipation.orderIds.includes(order._id)) {
        currentParticipation.orderIds.push(order._id);
      }

      // Read target goals from session model (or participation model)
      const targetOrders =
        currentParticipation.requiredOrders ||
        currentParticipation.sessionId?.requiredOrders ||
        0;

      const rewardBonus =
        currentParticipation.bonusAmount ||
        currentParticipation.sessionId?.bonusAmount ||
        0;

      // Check if session order goal is met
      if (
        targetOrders > 0 &&
        currentParticipation.completedOrders >= targetOrders
      ) {
        currentParticipation.status = "completed";
        currentParticipation.completedAt = new Date();
        bonusAwarded = true;
        bonusAmount = rewardBonus;

        // Credit rider wallet balance with bonus
        const currentBalance = rider.wallet?.balance || 0;
        const newBalance = currentBalance + rewardBonus;

        rider.wallet = rider.wallet || {};
        rider.wallet.balance = newBalance;

        // Create transaction history record
        await WalletTransaction.create({
          userId: rider._id,
          type: "credit",
          amount: rewardBonus,
          reason: `Bonus reward earned for completing session goal (${currentParticipation.completedOrders}/${targetOrders} orders)`,
          balanceAfter: newBalance,
          source: "session_bonus",
          orderId: order._id,
        });
      }

      await currentParticipation.save();
    }

    // 3. Update Order Status
    order.status = "delivered";
    order.paymentStatus = "paid";
    order.deliveredAt = new Date();
    await order.save();

    // 4. Reset Rider Busy Status
    if (rider.riderProfile) {
      rider.riderProfile.isBusy = false;
    }
    await rider.save();

    // 5. Live Socket Updates
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("orderTrackingStatusLive", {
        orderId: order._id,
        status: order.status,
        updatedAt: new Date(),
      });

      io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
        orderId: order._id,
        status: order.status,
      });

      // Notify rider via socket if bonus was earned
      if (bonusAwarded) {
        io.to(`rider_${rider._id}`).emit("sessionBonusUnlocked", {
          message: `Congratulations! You unlocked a bonus of PKR ${bonusAmount}`,
          bonusAmount,
        });
      }
    }

    // Process Bike Installment deduction/tracking if applicable
    if (typeof processRiderBikeInstallment === "function") {
      await processRiderBikeInstallment(req.user.id);
    }

    return res.status(200).json({
      success: true,
      message: bonusAwarded
        ? `Order delivered & PKR ${bonusAmount} session bonus rewarded!`
        : "Order delivered successfully",
      bonusAwarded,
      bonusAmount,
      order,
    });
  } catch (err) {
    console.error("MARK DELIVERED ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// UPDATE STOP STATUS (Multi-Stop Vendor Tracking)
// =====================================
// exports.updateStopStatus = async (req, res) => {
//   try {
//     const { orderId, stopId } = req.params;
//     const { status } = req.body; // "arrived_at_vendor" | "picked_up"

//     const allowedStopStatuses = ["assigned", "arrived_at_vendor", "picked_up"];
//     if (!allowedStopStatuses.includes(status)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid stop status" });
//     }

//     const order = await Order.findOneAndUpdate(
//       { _id: orderId, riderId: req.user.id, "stops._id": stopId },
//       { $set: { "stops.$.status": status } },
//       { new: true },
//     );

//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order or Stop not found" });
//     }

//     const io = req.app.get("io");
//     if (io) {
//       io.to(`order_${order._id}`).emit("stopStatusUpdated", {
//         orderId: order._id,
//         stopId,
//         status,
//       });
//     }

//     return res
//       .status(200)
//       .json({ success: true, message: "Stop status updated", order });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// =====================================
// UPDATE STOP STATUS & SYNC MAIN STATUS
// =====================================
exports.updateStopStatus = async (req, res) => {
  try {
    const { orderId, stopId } = req.params;
    const { status } = req.body; // "arrived_at_vendor" | "picked_up"

    const allowedStopStatuses = ["assigned", "arrived_at_vendor", "picked_up"];
    if (!allowedStopStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid stop status" });
    }

    // 1. Update the specific stop status
    const order = await Order.findOneAndUpdate(
      { _id: orderId, riderId: req.user.id, "stops._id": stopId },
      {
        $set: {
          "stops.$.status": status,
          status: status, // <-- Syncs main order status with stop status
        },
      },
      { new: true }, // Returns the updated document immediately
    ).populate("stops.vendorId");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order or Stop not found" });
    }

    // Socket notification
    // Example in orderController.js / updateStopStatus
    const io = req.app.get("io");

    if (io) {
      const updatePayload = {
        orderId: order._id,
        status: order.status,
        stops: order.stops,
        updatedAt: order.updatedAt,
      };

      // 1. Broadcast to Customer, Rider, & Vendor joined to this order
      io.to(`order:${order._id}`).emit("orderTrackingUpdated", updatePayload);

      // 2. Broadcast to Admin Panel (for global live monitoring)
      io.to("role:admin").emit("adminOrderUpdated", updatePayload);
    }

    return res
      .status(200)
      .json({ success: true, message: "Stop status updated", order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// UPDATE ORDER STATUS
// =====================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const io = req.app.get("io");

    const allowedStatuses = [
      "pending",
      "confirmed",
      "on_the_way",
      "assigned",
      "preparing",
      "ready",
      "arrived_at_vendor",
      "picked_up",
      "ongoing",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;

    // Handle payment & rider availability when order is completed
    if (status === "delivered") {
      order.paymentStatus = "paid";

      // Free up rider so auto-accept works for their next order
      if (order.riderId) {
        await User.findByIdAndUpdate(order.riderId, {
          "riderProfile.isBusy": false,
        });
      }
    }

    await order.save();

    // ================= REAL-TIME SOCKET EMISSIONS =================
    if (io) {
      const payload = {
        orderId: order._id,
        status: order.status,
        stops: order.stops,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt,
      };

      // 1. Direct notify customer
      io.to(`user:${order.userId}`).emit("orderStatusUpdated", payload);

      // 2. Broadcast to specific order room (Customer, Vendor, & Rider active view)
      io.to(`order:${order._id}`).emit("orderTrackingUpdated", payload);

      // 3. Broadcast to Admin Panel dashboard live tracker
      io.to("role:admin").emit("adminOrderUpdated", payload);
    }

    return res
      .status(200)
      .json({ success: true, message: "Status updated successfully", order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// HANDLE ORDER DISPATCH & AUTO-ACCEPT
// =====================================
exports.handleOrderAssignment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const io = req.app.get("io");

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 1. Get vendor/pickup coordinates for proximity matching
    const vendorCoords = order.stops[0]?.location?.coordinates ||
      order.address?.location?.coordinates || [0, 0];

    // 2. Find nearest online rider who HAS enabled autoAcceptOrders AND is NOT busy
    const candidateRider = await User.findOne({
      role: "rider",
      isOnline: true,
      isBlocked: false,
      "riderProfile.autoAcceptOrders": true,
      "riderProfile.isBusy": false, // Checks if rider is currently ongoing/active on another order
      "location.coordinates": {
        $near: {
          $geometry: { type: "Point", coordinates: vendorCoords },
          $maxDistance: 10000, // 10 km radius
        },
      },
    });

    if (candidateRider) {
      // 3. Assign order directly to this rider
      order.riderId = candidateRider._id;
      order.isAssigned = true;
      order.acceptedAt = new Date();
      order.status = "on_the_way";
      await order.save();

      // Mark rider busy so they don't get assigned another active order
      if (!candidateRider.riderProfile) candidateRider.riderProfile = {};
      candidateRider.riderProfile.isBusy = true;
      await candidateRider.save();

      // Check active bonus session participation and increment completed count
      const activeParticipation = await RiderSessionParticipation.findOne({
        riderId: candidateRider._id,
        status: "in_progress",
      });

      if (activeParticipation) {
        activeParticipation.completedOrders =
          (activeParticipation.completedOrders || 0) + 1;
        order.sessionParticipationId = activeParticipation._id;
        await activeParticipation.save();
        await order.save();
      }

      // Live Socket Emissions
      if (io) {
        io.to(`user_${candidateRider._id}`).emit("order:autoAccepted", order);
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
      }

      return res.status(200).json({
        success: true,
        message: "Order auto-accepted by eligible rider",
        order,
        assignedRider: candidateRider._id,
      });
    }

    // 4. Fallback: Broadcast to all online riders for manual acceptance
    if (io) {
      io.to("role:riders").emit("order:newAvailable", order);
    }

    return res.status(200).json({
      success: true,
      message: "No auto-accept rider found. Broadcasted to available riders.",
      order,
    });
  } catch (err) {
    console.error("ORDER ASSIGNMENT ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// TOGGLE AUTO-ACCEPT
// =====================================
exports.toggleAutoAccept = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found." });
    }

    const currentValue = rider.riderProfile?.autoAcceptOrders ?? false;
    if (!rider.riderProfile) rider.riderProfile = {};
    rider.riderProfile.autoAcceptOrders = !currentValue;

    await rider.save();

    return res.status(200).json({
      success: true,
      message: `Auto accept orders has been ${rider.riderProfile.autoAcceptOrders ? "enabled" : "disabled"}.`,
      autoAcceptOrders: rider.riderProfile.autoAcceptOrders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET RIDER ORDERS
// =====================================
exports.getRiderOrders = async (req, res) => {
  try {
    const orders = await Order.find({ riderId: req.user.id })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET ALL ORDERS (ADMIN)
// =====================================
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "address.phone": searchRegex },
        { "address.address": searchRegex },
        { "address.city": searchRegex },
        { "items.name": searchRegex },
        { "items.category": searchRegex },
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// GET ORDER DETAILS
// =====================================
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("riderId", "name email phone");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      order: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: order.userId,
        rider: order.riderId
          ? {
              ...order.riderId.toObject(),
              assignedAt: order.acceptedAt,
            }
          : null,
        address: order.address,
        stops: order.stops,
        items: order.items,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        tax: order.tax,
        promoDiscount: order.promoDiscount,
        totalAmount: order.totalAmount,
        status: order.status,
        isAssigned: order.isAssigned,
        routingMetrics: order.routingMetrics,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        acceptedAt: order.acceptedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// REORDER
// =====================================
exports.reorder = async (req, res) => {
  try {
    const oldOrder = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!oldOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (!oldOrder.items || oldOrder.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Order has no items to reorder" });
    }

    let subtotal = 0;
    const newItems = oldOrder.items.map((item) => {
      const total = Number(item.price) * Number(item.quantity);
      subtotal += total;

      return {
        productId: item.productId,
        name: item.name,
        image: item.image,
        category: item.category,
        weight: item.weight,
        price: item.price,
        quantity: item.quantity,
        total,
      };
    });

    const deliveryFee = oldOrder.deliveryFee || 200;
    const tax = oldOrder.tax || 2.5;
    const promoDiscount = 0;
    const totalAmount = subtotal + deliveryFee + tax - promoDiscount;

    const newOrder = await Order.create({
      orderNumber: "ORD" + Date.now() + Math.floor(Math.random() * 1000),
      userId: req.user.id,
      address: oldOrder.address,
      stops: oldOrder.stops,
      items: newItems,
      paymentMethod: oldOrder.paymentMethod,
      paymentStatus: "pending",
      subtotal,
      deliveryFee,
      tax,
      promoDiscount,
      totalAmount,
      status: "pending",
      riderId: null,
      isAssigned: false,
    });

    return res.status(201).json({
      success: true,
      message: "Reorder created successfully",
      order: newOrder,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// // =====================================
// // TRACK ORDER
// // =====================================
// exports.trackOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id).populate(
//       "riderId",
//       "name phone",
//     );

//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found" });
//     }

//     return res.status(200).json({
//       success: true,
//       tracking: {
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         status: order.status,
//         location: order.address?.address || null,
//         coordinates: order.address?.location?.coordinates || null,
//         stops: order.stops,
//         rider: order.riderId,
//         routingMetrics: order.routingMetrics,
//         timeline: {
//           orderPlaced: order.createdAt,
//           riderAssigned: order.acceptedAt,
//           updatedAt: order.updatedAt,
//         },
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// =====================================
// TRACK ORDER (Always fetches fresh stop status)
// =====================================
exports.trackOrder = async (req, res) => {
  try {
    // Force a fresh database fetch without lean caching
    const order = await Order.findById(req.params.id)
      .populate("riderId", "name phone location")
      .populate("stops.vendorId", "name address location contact")
      .populate("userId", "name email phone");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      tracking: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status, // Main order status
        address: order.address,
        stops: order.stops, // <-- Contains vendor details & updated stop statuses

        // Clean User Details Object
        user: order.userId
          ? {
              id: order.userId._id,
              name: order.userId.name || "N/A",
              phone: order.userId.phone || "N/A",
              email: order.userId.email || "N/A",
            }
          : null,

        // Rider Details Object
        rider: order.riderId
          ? {
              id: order.riderId._id,
              name: order.riderId.name || "N/A",
              phone: order.riderId.phone || "N/A",
              location: order.riderId.location || null,
            }
          : null,

        routingMetrics: order.routingMetrics,
        timeline: {
          orderPlaced: order.createdAt,
          riderAssigned: order.acceptedAt,
          updatedAt: order.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error("TRACK ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ================================
// Vendor's Orders
// ================================

// =====================================
// Vendor pending Orders (Unassigned)
// =====================================
// exports.getVendorIncomingOrders = async (req, res) => {
//   try {
//     const vendorId = req.user?.id;
//     const vendor = await Vendor.findById({ id: vendorId });
//     // Fetch all orders for this user
//     const orders = await Order.find({
//       isAssigned: false,
//     }).sort({ createdAt: -1 });

//     const vendorOrders = orders.stops.map((vendor) => {
//       vendor.vendorId == vendorId;
//     });

//     // Filter orders to find pending/in-progress orders
//     const pendingOrders = orders
//       .filter((order) =>
//         [
//           "pending",
//           "confirmed",
//           "preparing",
//           "in_progress",
//           "on_the_way",
//         ].includes(order.status),
//       )
//       .select(
//         "orderNumber createdAt instructions items totalAmount deliveryFee status",
//       );

//     return res.status(200).json({
//       success: true,
//       count: pendingOrders.length,
//       orders: pendingOrders,
//     });
//   } catch (err) {
//     console.error("GET AVAILABLE ORDERS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// =====================================
// Vendor Incoming / Active Orders Detail
// =====================================
exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user?.id || req.user?._id;
    const { status = "pending" } = req.query; // Tabs: pending | confirmed | ready | complete | cancelled | order_issues

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Vendor ID missing",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 1. Define Status Mapping for Each UI Tab
    const tabStatusMap = {
      pending: ["pending"],
      preparing: ["confirmed", "preparing"],
      ready: ["ready", "assigned", "arrived_at_vendor", "on_the_way"],
      complete: ["delivered", "completed"],
      cancelled: ["cancelled", "rejected_by_vendor", "cancelled_by_user"],
      order_issues: ["refund_requested", "disputed", "complaint_raised"],
    };

    const targetStatuses = tabStatusMap[status] || tabStatusMap.pending;

    // 2. Aggregate Counts for Top Navigation Badges [e.g., pending (2), Preparing (1)]
    const badgeCountsAggregation = await Order.aggregate([
      { $match: { "stops.vendorId": vendor._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format badge counts object
    const counts = {
      pending: 0,
      preparing: 0,
      ready: 0,
      complete: 0,
      cancelled: 0,
      order_issues: 0,
    };

    badgeCountsAggregation.forEach((item) => {
      for (const [tabKey, statuses] of Object.entries(tabStatusMap)) {
        if (statuses.includes(item._id)) {
          counts[tabKey] += item.count;
        }
      }
    });

    // 3. Query Active Orders for Selected Tab
    const activeOrders = await Order.find({
      "stops.vendorId": vendorId,
      status: { $in: targetStatuses },
    })
      .populate("driverId", "fullName name phone avatar rating") // Rider details for "Ready" tab
      .populate("userId", "fullName name") // Customer name for "Order Issues" tab
      .select(
        "orderNumber createdAt instructions items subtotal deliveryFee tax totalAmount status stops address paymentMethod allergyWarning cancellationReason issueDetails paymentStatus"
      )
      .sort({ createdAt: -1 });

    // 4. Format Orders according to UI Screens
    const formattedOrders = activeOrders.map((order) => {
      const dateObj = new Date(order.createdAt);
      
      // Formatting Date (e.g. Today, 12/7/26 or 08/09/26 at 7:45 pm)
      const formattedDate =
        dateObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }) +
        " at " +
        dateObj
          .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase();

      // Filter only current vendor's items
      const vendorItems = order.items.filter(
        (item) => item.vendorId?.toString() === vendorId.toString()
      );

      // Re-calculate Vendor Subtotal
      const vendorSubtotal = vendorItems.reduce((acc, item) => {
        return acc + (item.total || item.price * item.quantity);
      }, 0);

      return {
        _id: order._id,
        orderNumber: order.orderNumber, // e.g. "Order #1052"
        placedAt: formattedDate,
        deliveryType:
          order.deliveryFee === 0 ? "Free" : `${order.deliveryFee} PKR`,
        isFreeDelivery: order.deliveryFee === 0,
        paymentStatus: order.paymentStatus || "Paid",

        // Red Allergy Box
        allergyAlert: order.allergyWarning || null,

        // Customer Note Box
        customerNote: order.instructions || "",

        // Items Array
        items: vendorItems.map((item) => ({
          itemId: item.productId,
          quantity: item.quantity,
          name: item.name,
          note: item.note || item.itemInstructions || "",
          price: item.total || item.price * item.quantity,
          formattedPrice: `${item.total || item.price * item.quantity} PKR`,
        })),

        // Financial Totals
        subtotal: vendorSubtotal,
        deliveryFee: order.deliveryFee,
        totalAmount: vendorSubtotal,
        formattedTotal: `${vendorSubtotal.toLocaleString()} PKR`,

        // Tab Specific Fields (UI UI Cards)
        status: order.status,
        
        // Assigned Rider Info (Shown in "Ready" screen)
        rider: order.driverId
          ? {
              id: order.driverId._id,
              name: order.driverId.fullName || order.driverId.name,
              rating: order.driverId.rating || 4.8,
              phone: order.driverId.phone,
            }
          : null,

        // Cancellation Reason (Shown in "Cancelled" red screen card)
        cancellationReason:
          order.cancellationReason || "Item wasn't available",

        // Issue/Refund Details (Shown in "Order Issues" yellow screen card)
        issue: {
          customerName: order.userId?.fullName || order.userId?.name || "Customer",
          complainText: order.issueDetails?.reason || "Your food wasn't delivered to me...",
          refundStatus: order.issueDetails?.status || "Refund customer",
        },
      };
    });

    return res.status(200).json({
      success: true,
      activeTab: status,
      counts, // Returns badge numbers for tabs: { pending: 2, preparing: 1, ready: 3, complete: 1, cancelled: 1, order_issues: 1 }
      orders: formattedOrders,
    });
  } catch (err) {
    console.error("GET VENDOR ORDERS TAB ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
