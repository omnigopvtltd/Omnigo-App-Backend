const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const RiderSessionParticipation = require("../models/RiderSessionParticipation");
// const {dispatchOrderToNearestRider} = require("../helpers/dispatchOrderToNearestRider")
const { getIO } = require("../socket");
// const { getIO } = require("../socket");

const sendNotification = require("../utils/sendNotification");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");
const { processRiderBikeInstallment } = require("../helpers/riderBikeInstallment");
// =====================================
// CREATE ORDER
// =====================================
// exports.createOrder = async (req, res) => {
//   try {
//     const {
//       addressId,
//       paymentMethod = "cash_on_delivery",
//       promoDiscount = 0,
//     } = req.body;

//     // USER
//     const user = await User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // ADDRESS
//     const selectedAddress =
//       user.addresses.id(addressId);

//     if (!selectedAddress) {
//       return res.status(404).json({
//         success: false,
//         message: "Address not found",
//       });
//     }

//     // CART
//     const cart = await Cart.findOne({
//       userId: req.user.id,
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Cart is empty",
//       });
//     }

//     let subtotal = 0;

//     const items = cart.items.map((item) => {
//       const total =
//         Number(item.price) *
//         Number(item.quantity);

//       subtotal += total;

//       return {
//         productId: item.productId,
//         name: item.name,
//         image: item.image,
//         category: item.category,
//         weight: item.weight,
//         price: item.price,
//         quantity: item.quantity,
//         total,
//       };
//     });

//     // FEES
//     const deliveryFee = 6;
//     const tax = 2.5;

//     const totalAmount =
//       subtotal +
//       deliveryFee +
//       tax -
//       promoDiscount;

//     // CREATE ORDER
//     const order = await Order.create({
//       orderNumber:
//         "ORD" +
//         Date.now(),

//       userId: req.user.id,

//       address: {
//         addressId:
//           selectedAddress._id,
//         phone:
//           selectedAddress.phone,
//         address:
//           selectedAddress.address,
//         city:
//           selectedAddress.city,
//         zipCode:
//           selectedAddress.zipCode,
//         country:
//           selectedAddress.country,
//       },

//       items,

//       paymentMethod,

//       paymentStatus: "pending",

//       subtotal,
//       deliveryFee,
//       tax,
//       promoDiscount,
//       totalAmount,

//       status: "pending",
//       riderId: null,
//       isAssigned: false,
//       acceptedAt: null,
//     });

//     // CLEAR CART
//     cart.items = [];
//     await cart.save();

//     return res.status(201).json({
//       success: true,
//       message:
//         "Order placed successfully",
//     });
//   } catch (err) {
//     console.log(
//       "CREATE ORDER ERROR:",
//       err
//     );

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ===================================================
// DISPATCH: AUTO-ASSIGN TO NEAREST AUTO-ACCEPT RIDER
// ===================================================

// exports.createOrder = async (req, res) => {
//   try {
//     const {
//       addressId,

//       locationId,

//       paymentMethod = "cash_on_delivery",

//       promoDiscount = 0,
//     } = req.body;

//     // USER

//     const user = await User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,

//         message: "User not found",
//       });
//     }

//     // =========================

//     // ADDRESS OR LOCATION

//     // =========================

//     let orderAddress = null;

//     let orderLocation = null;

//     if (!addressId) {
//       return res.status(400).json({
//         success: false,

//         message: "addressId is required",
//       });
//     }

//     // Pehle addresses me check karo

//     const selectedAddress = user.addresses.find(
//       (addr) => addr._id.toString() === addressId,
//     );

//     if (selectedAddress) {
//       orderAddress = {
//         addressId: selectedAddress._id,

//         phone: selectedAddress.phone,

//         address: selectedAddress.address,

//         city: selectedAddress.city,

//         zipCode: selectedAddress.zipCode,

//         country: selectedAddress.country,
//       };
//     } else if (
//       user.location &&
//       user.location._id &&
//       user.location._id.toString() === addressId
//     ) {
//       orderLocation = {
//         locationId: user.location._id,

//         type: user.location.type || user.location.mode,

//         zone: user.location.zone,

//         area: user.location.area,

//         address: user.location.address,

//         coordinates: user.location.coordinates,
//       };
//     } else {
//       return res.status(404).json({
//         success: false,

//         message: "Address or Location not found",
//       });
//     }

//     // =========================

//     // CART

//     // =========================

//     const cart = await Cart.findOne({
//       userId: req.user.id,
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Cart is empty",
//       });
//     }

//     let subtotal = 0;

//     const items = cart.items.map((item) => {
//       const total = Number(item.price) * Number(item.quantity);

//       subtotal += total;

//       return {
//         productId: item.productId,

//         name: item.name,

//         image: item.image,

//         category: item.category,

//         weight: item.weight,

//         price: item.price,

//         quantity: item.quantity,

//         total,
//       };
//     });

//     // =========================

//     // FEES

//     // =========================

//     const deliveryFee = 6;

//     const tax = 2.5;

//     const totalAmount = subtotal + deliveryFee + tax - promoDiscount;

//     // =========================

//     // CREATE ORDER

//     // =========================

//     const order = await Order.create({
//       orderNumber: "ORD" + Date.now(),

//       userId: req.user.id,

//       address: orderAddress,

//       location: orderLocation,

//       items,

//       paymentMethod,

//       paymentStatus: "pending",

//       subtotal,

//       deliveryFee,

//       tax,

//       instructions: req.body.instructions || "",

//       orderFrom: req.body.orderFrom || "fast-food",

//       promoDiscount,

//       totalAmount,

//       status: "pending",

//       riderId: null,

//       isAssigned: false,

//       acceptedAt: null,
//     });

//     // =========================

//     // CLEAR CART

//     // =========================

//     cart.items = [];

//     await cart.save();

//     return res.status(201).json({
//       success: true,

//       message: "Order placed successfully",

//       order,

//       orderId: order._id,
//     });
//   } catch (err) {
//     console.log("CREATE ORDER ERROR:", err);

//     return res.status(500).json({
//       success: false,

//       message: err.message,
//     });
//   }
// };

exports.createOrder = async (req, res) => {
  console.log("1. Inside createOrder route");
  try {
    const {
      address,
      location,
      paymentMethod = "cash_on_delivery",
      promoDiscount = 0,
      items = [],
      instructions = "",
      orderFrom = orderFrom || "fast-food",
      deliveryFee = 200,
      tax = 2.5,
    } = req.body;
    console.log("2. Fetching user...");
    // 1. Verify User
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    console.log("3. User found:", user?._id);

    // 2. Validate Items Array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items cannot be empty",
      });
    }

    // 3. Process Items & Subtotal
    let subtotal = 0;
    const allItems = items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const total = price * quantity;
      subtotal += total;

      return {
        productId: item.productId,
        name: item.name,
        price,
        quantity,
        total,
      };
    });

    const discount = Number(promoDiscount) || 0;
    const totalAmount = subtotal + Number(deliveryFee) + Number(tax) - discount;
    console.log("4. Creating order...");
    // 4. Create Order
    const order = await Order.create({
      orderNumber: "ORD" + Date.now(),
      userId: req.user.id,
      address: address || user.addresses?.[0] || null,
      location: location || user.location || null,
      items: allItems,
      paymentMethod,
      paymentStatus: "pending",
      subtotal,
      deliveryFee: Number(deliveryFee),
      tax: Number(tax),
      instructions,
      orderFrom,
      promoDiscount: discount,
      totalAmount,
      status: "pending",
      riderId: null,
      isAssigned: false,
      acceptedAt: null,
    });
    console.log("5. Order created!");
    // 5. Always Send Response Immediately
    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      orderId: order._id,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET MY ORDERS
// =====================================
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.log("GET ORDERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET SINGLE ORDER
// =====================================
exports.getOrderById = async (req, res) => {
  try {
    // 1. Fetch single order document
    const orderDoc = await Order.findById(req.params.id).populate(
      "userId",
      "name email phone"
    );

    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 2. Extract product IDs safely from single order items array
    const productIds = orderDoc.items.map((item) => item.productId).filter(Boolean);

    // 3. Fetch matching products
    const products = await Product.find({
      _id: { $in: productIds },
    }).select("name price restaurantId chefId");

    // 4. Fetch matching stores/restaurants
    const restaurantIds = products
      .map((p) => p.restaurantId || p.chefId)
      .filter(Boolean);

    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
    }).select("name logo address contact");

    // Create lookup maps
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));

    // 5. Build enriched single order object
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

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("GET ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// CANCEL ORDER
// =====================================
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // NEW — refund any wallet float the rider fronted for this order
    if (
      order.riderId &&
      order.riderFloatAmount > 0 &&
      !order.riderFloatSettled
    ) {
      const User = require("../models/User");
      const WalletTransaction = require("../models/WalletTransaction");

      const rider = await User.findById(order.riderId);
      if (rider) {
        const newBalance =
          (rider.wallet?.balance || 0) + order.riderFloatAmount;
        rider.wallet = { balance: newBalance };
        await rider.save();

        await WalletTransaction.create({
          userId: rider._id,
          type: "credit",
          amount: order.riderFloatAmount,
          reason: `Float refunded — ${order.orderNumber} was cancelled`,
          balanceAfter: newBalance,
          source: "order_refund",
          orderId: order._id,
        });
      }
      order.riderFloatSettled = true;
    }

    order.status = "cancelled";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (err) {
    console.log("CANCEL ORDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// CONFIRM ORDER
// =====================================
exports.confirmOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // agar pehle se cancelled hai
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled order cannot be confirmed",
      });
    }

    order.status = "confirmed";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      order,
    });
  } catch (err) {
    console.log("CONFIRM ORDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ONGOING ORDERS
// =====================================
exports.getOngoingOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: "ongoing",
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.log("GET ONGOING ORDERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAvailableOrders = async (req, res) => {
  try {
    // 1. Fetch unassigned pending orders
    const allOrders = await Order.find({
      status: "pending",
      isAssigned: false,
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    // 2. Extract all product IDs from all order items safely
    const productIds = allOrders.flatMap((order) =>
      order.items.map((item) => item.productId)
    );

    // 3. Fetch matching products
    const products = await Product.find({
      _id: { $in: productIds },
    }).select("name price restaurantId chefId");

    // 4. Fetch matching restaurants/chefs
    const restaurantIds = products
      .map((p) => p.restaurantId || p.chefId)
      .filter(Boolean);

    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
    }).select("name logo address contact");

    // Create lookup maps for fast matching
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));

    // 5. Structure populated order response
    const formattedOrders = allOrders.map((orderDoc) => {
      const order = orderDoc.toObject();
      order.items = order.items.map((item) => {
        const product = productMap.get(item.productId?.toString());
        const storeId = product?.restaurantId || product?.chefId;
        const store = storeId ? restaurantMap.get(storeId.toString()) : null;

        return {
          ...item,
          productDetails: product || null,
          vendorDetails: store || null,
        };
      });
      return order;
    });

    return res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (err) {
    console.error("GET AVAILABLE ORDERS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// RIDER: TOGGLE AUTO-ACCEPT SETTING
// =====================================
exports.toggleAutoAccept = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { autoAcceptOrders } = req.body; // Expects boolean: true / false

    if (typeof autoAcceptOrders !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "autoAcceptOrders must be a boolean value (true or false).",
      });
    }

    const rider = await User.findOneAndUpdate(
      { _id: riderId, role: "rider" },
      { autoAcceptOrders },
      { new: true },
    ).select("-password");

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Auto accept orders has been ${autoAcceptOrders ? "enabled" : "disabled"}.`,
      autoAcceptOrders: rider.autoAcceptOrders,
    });
  } catch (err) {
    console.error("TOGGLE AUTO ACCEPT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// exports.acceptOrder = async (req, res) => {
//   try {
//     const order = await Order.findOne({
//       _id: req.params.id,
//       status: "pending",
//       isAssigned: false,
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order already assigned",
//       });
//     }

//     // Rider details
//     const rider = await User.findById(req.user.id);

//     order.riderId = req.user.id;
//     order.isAssigned = true;
//     order.acceptedAt = new Date();
//     order.status = "ongoing";

//     await order.save();

//     // ========================================================
//     // 🌟 ADDED: SOCKET EMIT FOR REAL-TIME RIDER ASSIGNMENT
//     // ========================================================
//     const io = req.app.get("io");
//     if (io) {
//       // 1. Customer ke personal room ko status update bhejein
//       io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
//         orderId: order._id,
//         status: order.status,
//       });

//       // 2. Dedicated order tracking room ko event bhejein (Rider details ke sath)
//       io.to(`order_${order._id}`).emit("riderAssignedLive", {
//         orderId: order._id,
//         status: order.status,
//         riderId: order.riderId,
//         acceptedAt: order.acceptedAt,
//       });
//     }
//     //=============================================================
//     const customer = await User.findById(order.userId);

//     if (customer?.fcmToken) {
//       await sendNotification(
//         customer.fcmToken,
//         "Order Accepted",
//         `Rider ${rider.name} has accepted your order #${order.orderNumber}`,
//         {
//           riderId: rider._id.toString(),
//           riderName: rider.name || "",
//           riderEmail: rider.email || "",
//           riderPhone: rider.phone || "",
//         }
//       );
//     }

//     res.status(200).json({
//       success: true,
//       message: "Order accepted successfully",
//       order,
//       rider: {
//         id: rider._id,
//         name: rider.name,
//         email: rider.email,
//         phone: rider.phone,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.acceptOrder = async (req, res) => {
  try {
    // 1. Find pending and unassigned order
    const order = await Order.findOne({
      _id: req.params.id,
      status: "pending",
      isAssigned: false,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order already assigned or not found",
      });
    }

    // 2. Get Rider details
    const rider = await User.findById(req.user.id);
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // 3. Update order attributes
    order.riderId = req.user.id;
    order.isAssigned = true;
    order.acceptedAt = new Date();
    order.status = "ongoing";

    await order.save();

    // ========================================================
    // 🌟 ADDED: SESSION ORDER COUNTER INCREMENT
    // ========================================================
    const activeParticipation = await RiderSessionParticipation.findOne({
      riderId: rider._id,
      status: "in_progress",
    });

    if (activeParticipation) {
      activeParticipation.completedOrders =
        (activeParticipation.completedOrders || 0) + 1;
      await activeParticipation.save();
    }

    // ========================================================
    // 🌟 SOCKET EMIT FOR REAL-TIME RIDER ASSIGNMENT
    // ========================================================
    const io = req.app.get("io");
    if (io) {
      // 1. Customer ke personal room ko status update bhejein
      io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
        orderId: order._id,
        status: order.status,
      });

      // 2. Dedicated order tracking room ko event bhejein (Rider details ke sath)
      io.to(`order_${order._id}`).emit("riderAssignedLive", {
        orderId: order._id,
        status: order.status,
        riderId: order.riderId,
        acceptedAt: order.acceptedAt,
      });
    }

    // ========================================================
    // FCM PUSH NOTIFICATION TO CUSTOMER
    // ========================================================
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getRiderOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      riderId: req.user.id,
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getRiderActiveOrders = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch active orders assigned to this rider that are not yet completed or cancelled
    const activeOrders = await Order.find({
      riderId,
      status: { $in: ["accepted", "ongoing", "picked_up", "in_transit"] },
    })
      .populate("userId", "name email phone")
      .populate({
        path: "items.productId",
        select: "name price restaurantId chefId",
        strictPopulate: false,
        populate: [
          { path: "restaurantId", select: "name logo address contact", strictPopulate: false },
          { path: "chefId", select: "name logo address contact", strictPopulate: false },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      hasActiveOrder: activeOrders.length > 0,
      count: activeOrders.length,
      orders: activeOrders,
    });
  } catch (err) {
    console.error("GET RIDER ONGOING ORDERS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.markDelivered = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      riderId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = "delivered";

    await order.save();

    // ========================================================
    // 🌟 ADDED: SOCKET EMIT FOR REAL-TIME DELIVERY STATUS
    // ========================================================
    const io = req.app.get("io");
    if (io) {
      // Customer ko timeline update bhejein
      io.to(`order_${order._id}`).emit("orderTrackingStatusLive", {
        orderId: order._id,
        status: order.status,
        updatedAt: new Date(),
      });

      // Global status change alert
      io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
        orderId: order._id,
        status: order.status,
      });
    }
    // ========================================================

    // 2. Process daily bike installment on the first order of the day
    await processRiderBikeInstallment(riderId);


    res.status(200).json({
      success: true,
      message: "Order delivered successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("riderId", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
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

        createdAt: order.createdAt,

        updatedAt: order.updatedAt,

        acceptedAt: order.acceptedAt,
      },
    });
  } catch (err) {
    console.log("GET ORDER DETAILS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// REORDER ORDER (CREATE NEW ORDER FROM OLD)
// =====================================
exports.reorder = async (req, res) => {
  try {
    const oldOrder = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!oldOrder.items || oldOrder.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order has no items to reorder",
        ...order.riderId.toObject(),
        assignedAt: order.acceptedAt,
      });
    }

    // Recalculate subtotal from old items
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

    // fees same as original logic
    const deliveryFee = oldOrder.deliveryFee || 6;
    const tax = oldOrder.tax || 2.5;
    const promoDiscount = 0; // optional: usually reset on reorder

    const totalAmount = subtotal + deliveryFee + tax - promoDiscount;

    // create new order
    const newOrder = await Order.create({
      orderNumber: "ORD" + Date.now(),

      userId: req.user.id,

      address: oldOrder.address,

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
      acceptedAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Previous order fetched successfully",
      order: oldOrder,
    });
  } catch (err) {
    console.log("REORDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// Track ORDER
// =======================
exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "riderId",
      "name phone",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,

      tracking: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        location: order.address.address || null,

        rider: order.riderId,

        timeline: {
          orderPlaced: order.createdAt,

          riderAssigned: order.acceptedAt,

          updatedAt: order.updatedAt,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// UPDATE ORDER STATUS
// =======================
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const io = getIO();

//     const allowedStatuses = [
//       "pending",
//         "confirmed",
//         "preparing",
//         "ongoing",
//         "delivered",
//         "cancelled",
//     ];

//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status",
//       });
//     }

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     order.status = status;

//     await order.save();

// console.log("================================");
// console.log("ORDER STATUS UPDATED");
// console.log("Order ID:", order._id.toString());
// console.log("User ID:", order.userId.toString());
// console.log("Status:", order.status);

// io.to(`user_${order.userId}`)
//   .emit("orderStatusUpdated", {
//     orderId: order._id,
//     status: order.status
//   });

// console.log(
//   `Event emitted to room: user_${order.userId}`
// );
// console.log("================================");

//     return res.status(200).json({
//       success: true,
//       message: "Status updated",
//       order,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// =======================
// UPDATE ORDER STATUS
// =======================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Ensure ke app.set('io') Express se link ho raha hai
    const io = req.app.get("io");

    const allowedStatuses = [
      "pending",
      "confirmed",
      "preparing",
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
    await order.save();

    console.log("================================");
    console.log("ORDER STATUS UPDATED:", order._id.toString());

    // 1️⃣ Global User Channel Event (Aapka existing logic)
    io.to(`user_${order.userId}`).emit("orderStatusUpdated", {
      orderId: order._id,
      status: order.status,
    });

    // 2️⃣ 🌟 ADDED: Dedicated Order Tracking Room Event (Real-time Timeline screen update ke liye)
    io.to(`order_${order._id}`).emit("orderTrackingStatusLive", {
      orderId: order._id,
      status: order.status,
      updatedAt: new Date(),
    });

    console.log(`Event emitted to specific tracking room: order_${order._id}`);
    console.log("================================");

    return res.status(200).json({
      success: true,
      message: "Status updated",
      order,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// // =======================
// // Get All Orders
// // =======================
// exports.getAllOrders = async (req, res) => {
//   try {

//     // const orders = await Order.find()
//     //   // .populate("userId", "name")
//     //   // .populate("riderId", "name")
//     //   .sort({ createdAt: -1 });

//     const { status, search } = req.query;
// console.log(status, search);

// const filter = {};

// if (status && status !== "all") {
//   filter.status = status;
//   filter.search = search
// }

// console.log(filter);
//     const orders = await Order.find(filter)
//       .sort({ createdAt: -1 });

//     // console.log(orders);
//     res.json({
//       success: true,
//       orders,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.getAllOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    console.log(search);
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      console.log(searchRegex);

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

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.handleOrderAssignment = async (req, res) => {
  // orderId, io
  const { orderId } = req.body;
  const settings = await Settings.findOne();
  const order = await Order.findById(orderId).populate("restaurantId");

  // Broadcast order to all online riders for manual acceptance
  io.to("role:riders").emit("order:newAvailable", order);

  // If Auto-Assign is enabled globally
  if (settings?.autoAssignRider) {
    const restaurantCoords = order.restaurantId.location.coordinates; // [lng, lat]

    // Find closest available online rider within max distance radius
    const nearestRider = await User.findOne({
      role: "rider",
      isOnline: true,
      isBlocked: false,
      "riderProfile.isAutoAssignEnabled": true,
      "riderProfile.isBusy": false,
      "location.coordinates": {
        $near: {
          $geometry: { type: "Point", coordinates: restaurantCoords },
          $maxDistance: (User.maxRiderSearchRadiusKm || 10) * 1000, // meters
        },
      },
    });

    if (nearestRider) {
      order.riderId = nearestRider._id;
      order.status = "RIDER_ASSIGNED";
      await order.save();

      // Mark rider busy
      nearestRider.riderProfile.isBusy = true;
      await nearestRider.save();

      // Notify Rider and Customer instantly
      io.to(`user:${nearestRider._id}`).emit("order:autoAssigned", order);
      io.to(`order:${order._id}`).emit("order:statusUpdated", {
        orderId: order._id,
        status: "RIDER_ASSIGNED",
        rider: {
          id: nearestRider._id,
          name: nearestRider.name,
          phone: nearestRider.phone,
        },
      });
    }
  }
};
