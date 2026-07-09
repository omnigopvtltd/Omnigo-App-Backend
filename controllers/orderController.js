const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotification");
// =====================================
// CREATE ORDER
// =====================================
exports.createOrder = async (req, res) => {
  try {
    const {
      addressId,
      paymentMethod = "cash_on_delivery",
      promoDiscount = 0,
    } = req.body;

    // USER
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ADDRESS
    const selectedAddress =
      user.addresses.id(addressId);

    if (!selectedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // CART
    const cart = await Cart.findOne({
      userId: req.user.id,
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    let subtotal = 0;

    const items = cart.items.map((item) => {
      const total =
        Number(item.price) *
        Number(item.quantity);

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

    // FEES
    const deliveryFee = 6;
    const tax = 2.5;

    const totalAmount =
      subtotal +
      deliveryFee +
      tax -
      promoDiscount;

    // CREATE ORDER
    const order = await Order.create({
      orderNumber:
        "ORD" +
        Date.now(),

      userId: req.user.id,

      address: {
        addressId:
          selectedAddress._id,
        phone:
          selectedAddress.phone,
        address:
          selectedAddress.address,
        city:
          selectedAddress.city,
        zipCode:
          selectedAddress.zipCode,
        country:
          selectedAddress.country,
      },

      items,

      paymentMethod,

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

    // CLEAR CART
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message:
        "Order placed successfully",
    });
  } catch (err) {
    console.log(
      "CREATE ORDER ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET MY ORDERS
// =====================================
exports.getMyOrders = async (
  req,
  res
) => {
  try {
    const orders =
      await Order.find({
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
    console.log(
      "GET ORDERS ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET SINGLE ORDER
// =====================================
exports.getOrderById = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findById(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.log(
      "GET ORDER ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// CANCEL ORDER
// =====================================
exports.cancelOrder = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = "cancelled";

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      order,
    });
  } catch (err) {
    console.log(
      "CANCEL ORDER ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// CONFIRM ORDER
// =====================================
exports.confirmOrder = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findOne({
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
        message:
          "Cancelled order cannot be confirmed",
      });
    }

    order.status = "confirmed";

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Order confirmed successfully",
      order,
    });
  } catch (err) {
    console.log(
      "CONFIRM ORDER ERROR:",
      err
    );

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
    const orders = await Order.find({
      status: "pending",
      isAssigned: false,
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




exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      status: "pending",
      isAssigned: false,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order already assigned",
      });
    }

    // Rider ki details lo
    const rider = await User.findById(req.user.id);

    order.riderId = req.user.id;
    order.isAssigned = true;
    order.acceptedAt = new Date();
    order.status = "ongoing";

    await order.save();

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
        }
      );
    }

    res.status(200).json({
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
    res.status(500).json({
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
      .populate(
        "userId",
        "name email phone"
      )
      .populate(
        "riderId",
        "name email phone"
      );

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
            assignedAt:
              order.acceptedAt,
          }
          : null,

        address: order.address,

        items: order.items,

        paymentMethod:
          order.paymentMethod,

        paymentStatus:
          order.paymentStatus,

        subtotal: order.subtotal,
        deliveryFee:
          order.deliveryFee,
        tax: order.tax,
        promoDiscount:
          order.promoDiscount,

        totalAmount:
          order.totalAmount,

        status: order.status,

        isAssigned:
          order.isAssigned,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,

        acceptedAt:
          order.acceptedAt,
      },
    });
  } catch (err) {
    console.log(
      "GET ORDER DETAILS ERROR:",
      err
    );

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

    return res.status(200).json({
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