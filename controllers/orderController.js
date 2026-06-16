const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");

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
    });

    // CLEAR CART
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message:
        "Order placed successfully",
      order,
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