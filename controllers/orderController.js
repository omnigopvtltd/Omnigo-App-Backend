const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Address = require("../models/Address");
const Notification = require("../models/Notification");


// ================= CREATE ORDER =================
exports.createOrder = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { addressId } = req.body;

    // 1. GET CART
    const cart = await Cart.findOne({
      userId: req.user.id,
    }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    // 2. GET ADDRESS
    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    // 3. FORMAT ITEMS
    const items = cart.items.map((item) => ({
      productId: item.productId?._id,
      name: item.productId?.name,
      price: Number(item.price),
      quantity: item.quantity,
      variant: item.variant || "",
      image: item.productId?.image || "",
    }));

    // 4. CALCULATE BILL
    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const deliveryFee = 6;
    const tax = +(subtotal * 0.09).toFixed(2);
    const total = +(subtotal + deliveryFee + tax).toFixed(2);

    // 5. CREATE ORDER
    const order = await Order.create({
      userId: req.user.id,

      items,

      address: {
        label: address.label || "Home",
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        country: address.country,
        zip: address.zip,
      },

      bill: {
        subtotal,
        deliveryFee,
        tax,
        total,
      },

      status: "pending",
    });

    // 6. CREATE NOTIFICATION
    const notification = await Notification.create({
      userId: req.user.id,
      orderId: order._id,
      title: "Order Placed",
      message: "Your order has been placed successfully",
      type: "order_placed",
    });

    // 7. CLEAR CART
    cart.items = [];
    await cart.save();

    // 8. SOCKET EVENTS
    if (io) {
      // admin
      io.to("admin_room").emit("new_order", order);

      // user
      io.to(`user_${req.user.id}`).emit(
        "order_created",
        order
      );

      // notification
      io.to(`user_${req.user.id}`).emit(
        "new_notification",
        notification
      );
    }

    // 9. RESPONSE
    res.status(201).json({
      message: "Order placed successfully",

      deliveryAddress: {
        label: order.address.label,
        address: `${order.address.street}, ${order.address.city}, ${order.address.country}`,
      },

      products: order.items,

      billDetails: {
        subtotal: order.bill.subtotal,
        deliveryFee: order.bill.deliveryFee,
        tax: order.bill.tax,
        total: order.bill.total,
      },

      orderId: order._id,
      status: order.status,
    });

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= GET MY ORDERS =================
exports.getMyOrders = async (req, res) => {
  try {

    const orders = await Order.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      status: order.status,
      total: order.bill.total,
      createdAt: order.createdAt,

      deliveryAddress: {
        label: order.address.label,
        address: `${order.address.street}, ${order.address.city}`,
      },

      products: order.items,
    }));

    res.json(formattedOrders);

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= GET SINGLE ORDER =================
exports.getSingleOrder = async (req, res) => {
  try {

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({
      orderId: order._id,

      status: order.status,

      deliveryAddress: {
        label: order.address.label,
        address: `${order.address.street}, ${order.address.city}, ${order.address.country}`,
      },

      products: order.items,

      billDetails: order.bill,

      createdAt: order.createdAt,
    });

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= ADMIN ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
  try {

    const orders = await Order.find()
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= ASSIGN RIDER =================
exports.assignRider = async (req, res) => {
  try {

    const io = req.app.get("io");

    const { orderId, riderId } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        riderId,
        status: "assigned",
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // USER NOTIFICATION
    const userNotification =
      await Notification.create({
        userId: order.userId,
        orderId: order._id,
        title: "Rider Assigned",
        message:
          "A rider has been assigned to your order",
        type: "rider_assigned",
      });

    // RIDER NOTIFICATION
    const riderNotification =
      await Notification.create({
        userId: riderId,
        orderId: order._id,
        title: "New Delivery Assigned",
        message:
          "A new delivery order has been assigned to you",
        type: "rider_assigned",
      });

    // SOCKET EVENTS
    if (io) {

      io.to(`user_${riderId}`).emit(
        "order_assigned",
        order
      );

      io.to(`user_${order.userId}`).emit(
        "order_status_updated",
        order
      );

      // notifications
      io.to(`user_${order.userId}`).emit(
        "new_notification",
        userNotification
      );

      io.to(`user_${riderId}`).emit(
        "new_notification",
        riderNotification
      );
    }

    res.json({
      message: "Rider assigned successfully",
      order,
    });

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= RIDER ORDERS =================
exports.getRiderOrders = async (req, res) => {
  try {

    const orders = await Order.find({
      riderId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};



// ================= UPDATE STATUS =================
exports.updateStatus = async (req, res) => {
  try {

    const io = req.app.get("io");

    const { status } = req.body;

    const validStatus = [
      "pending",
      "confirmed",
      "assigned",
      "delivered",
      "cancelled",
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // ================= NOTIFICATION LOGIC =================

    let title = "";
    let message = "";
    let type = "";

    if (status === "confirmed") {
      title = "Order Confirmed";
      message = "Your order has been confirmed";
      type = "order_confirmed";
    }

    if (status === "delivered") {
      title = "Order Delivered";
      message =
        "Your order has been delivered successfully";
      type = "order_delivered";
    }

    if (status === "cancelled") {
      title = "Order Cancelled";
      message = "Your order has been cancelled";
      type = "order_cancelled";
    }

    if (status === "assigned") {
      title = "Order Assigned";
      message = "Your order has been assigned";
      type = "rider_assigned";
    }

    let notification = null;

    if (title) {
      notification = await Notification.create({
        userId: order.userId,
        orderId: order._id,
        title,
        message,
        type,
      });
    }

    // ================= SOCKET EVENTS =================

    if (io) {

      io.to(`user_${order.userId}`).emit(
        "order_status_updated",
        order
      );

      io.to("admin_room").emit(
        "order_status_updated",
        order
      );

      if (notification) {
        io.to(`user_${order.userId}`).emit(
          "new_notification",
          notification
        );
      }
    }

    res.json({
      message: "Order status updated",
      order,
    });

  } catch (err) {
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};