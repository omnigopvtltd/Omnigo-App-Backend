// const Conversation = require("../models/Conversation");
// const Message = require("../models/Message");
// const Order = require("../models/Order");
// const admin = require("firebase-admin");

// // It checks if the receiver is online in the chat room or not. If not, it sends a push notification to the receiver using Firebase Cloud Messaging (FCM).
// async function handleOfflineNotification(receiverId, messageText, senderName) {
//   try {
//     // 1. Database se Receiver (Rider) ka FCM Token nikalen (Jo uske phone se save hua tha)
//     const user = await User.findById(receiverId);
//     const fcmToken = user?.fcmToken; 

//     if (!fcmToken) {
//       console.log("User target belongs to no registered FCM token.");
//       return;
//     }

//     // 2. Notification Packet Payload banayein
//     const payload = {
//       token: fcmToken,
//       notification: {
//         title: senderName || "New Message Received",
//         body: messageText.length > 60 ? messageText.substring(0, 60) + "..." : messageText,
//       },
//       data: {
//         click_action: "FLUTTER_NOTIFICATION_CLICK",
//         type: "chat",
//         conversationId: "6a463bd674f1e5793327c41f" // Open Direct Chat in Flutter app
//       }
//     };

//     // 3. Send via Firebase
//     await admin.messaging().send(payload);
//     console.log("🚀 Push Notification sent successfully!");

//   } catch (error) {
//     console.error("Error sending push notification:", error);
//   }
// }

// // ================= CREATE CONVERSATION =================
// exports.createConversation = async (req, res) => {
//   try {

//     const { orderId } = req.body;

//     const order = await Order.findById(orderId);

//     if (!order) {

//       return res.status(404).json({
//         success:false,
//         message:"Order not found"
//       });

//     }

//     let conversation = await Conversation.findOne({ orderId });

//     if(conversation){

//         return res.json({
//             success:true,
//             conversation
//         });

//     }

//     conversation = await Conversation.create({

//         orderId,

//         customerId:order.userId,

//         riderId:order.riderId

//     });

//     res.status(201).json({

//         success:true,

//         conversation

//     });

//   } catch (err) {

//     res.status(500).json({

//         success:false,

//         message:err.message

//     });

//   }
// };

// // ================= SEND MESSAGE =================
// // exports.sendMessage = async (req, res) => {

// //     try{

// //         const {
// //             conversationId,
// //             receiver,
// //             sender,
// //             message
// //         } = req.body;

// //         const newMessage = await Message.create({

// //             conversationId,
// //             sender:req.user._id,
// //             receiver,
// //             sender,
// //             message

// //         });

// //         await Conversation.findByIdAndUpdate(

// //             conversationId,
// //             {
// //                 lastMessage:message,
// //                 lastMessageAt:new Date()

// //             }

// //         );

// //         res.status(201).json({

// //             success:true,

// //             newMessage

// //         });

// //     }

// //     catch(err){

// //         res.status(500).json({

// //             success:false,

// //             message:err.message

// //         });

// //     }

// // };
// exports.sendMessage = async(req,res)=>{

// return res.status(400).json({

// message:"Use Socket.io"

// });

// }

// // ================= GET MESSAGES =================
// exports.getMessages = async(req,res)=>{

// try{

// const messages = await Message.find({

// conversationId:req.params.conversationId

// })

// .populate("sender","name image")

// .populate("receiver","name image")

// .sort({createdAt:1});

// res.json({

// success:true,

// messages

// });

// }

// catch(err){

// res.status(500).json({

// success:false,

// message:err.message

// });

// }

// };

// // ================= My Conversations =================
// exports.myConversations = async(req,res)=>{

// try{

// const conversations = await Conversation.find({

// $or:[

// {customerId:req.user._id},

// {riderId:req.user._id}

// ]

// })

// .populate("customerId","name image")

// .populate("riderId","name image")

// .sort({updatedAt:-1});

// res.json({

// success:true,

// conversations

// });

// }

// catch(err){

// res.status(500).json({

// success:false,

// message:err.message

// });

// }

// };
/////////////////////////////////////////////////////////


// const Conversation = require("../models/Conversation");
// const Message = require("../models/Message");

// function roleOf(req) {
//   return req.user.role; // "customer" | "rider" | "admin" — matches your existing JWT payload/role middleware
// }

// // controllers/chat.controller.js
// const User = require("../models/User.js");
// // const Rider = require("../models/Rider.js");
// const Restaurant = require("../models/Restaurant.js");

// exports.getContactsController = async (req, res) => {
//   try {
//     const { search = "" } = req.query;
//     const regex = new RegExp(search, "i");

//     const [customers, riders, restaurants] = await Promise.all([
//       User.find({ name: regex }).select("_id name email phone").limit(20).lean(),
//       User.find({ name: regex }).select("_id name email phone").limit(20).lean(),
//       Restaurant.find({ name: regex }).select("_id name email phone").limit(20).lean(),
//     ]);

//     const formattedContacts = [
//       ...customers.map((c) => ({ ...c, role: "Customer" })),
//       ...riders.map((r) => ({ ...r, role: "Rider" })),
//       ...restaurants.map((res) => ({ ...res, role: "Restaurant" })),
//     ];

//     return res.status(200).json({ contacts: formattedContacts });
//   } catch (error) {
//     console.error("Error fetching contacts:", error);
//     return res.status(500).json({ error: "Failed to fetch user directory" });
//   }
// };

// // =====================================
// // GET OR CREATE A CONVERSATION
// // =====================================
// // Called whenever a customer opens a chat with "their" rider for an order,
// // or either side opens a chat with support. Idempotent — reuses an existing
// // thread for the same pair instead of creating duplicates.
// exports.getOrCreateConversation = async (req, res) => {
//   try {
//     const { type, customerId, riderId, orderId } = req.body;
//     const allowedTypes = ["customer_rider", "customer_admin", "rider_admin"];

//     if (!allowedTypes.includes(type)) {
//       return res.status(400).json({ success: false, message: "Invalid conversation type" });
//     }

//     const query = { type };
//     if (type === "customer_rider") {
//       if (!customerId || !riderId) {
//         return res.status(400).json({ success: false, message: "customerId and riderId are required" });
//       }
//       query.customerId = customerId;
//       query.riderId = riderId;
//     } else if (type === "customer_admin") {
//       const resolvedCustomerId = customerId || (roleOf(req) === "customer" ? req.user.id : null);
//       if (!resolvedCustomerId) {
//         return res.status(400).json({ success: false, message: "customerId is required" });
//       }
//       query.customerId = resolvedCustomerId;
//     } else if (type === "rider_admin") {
//       const resolvedRiderId = riderId || (roleOf(req) === "rider" ? req.user.id : null);
//       if (!resolvedRiderId) {
//         return res.status(400).json({ success: false, message: "riderId is required" });
//       }
//       query.riderId = resolvedRiderId;
//     }

//     let conversation = await Conversation.findOne(query);

//     if (!conversation) {
//       conversation = await Conversation.create({ ...query, orderId: orderId || null });
//     }

//     return res.status(200).json({ success: true, conversation });
//   } catch (err) {
//     console.log("GET OR CREATE CONVERSATION ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // GET CONVERSATIONS (admin sees everything; customer/rider see their own)
// // =====================================
// exports.getConversations = async (req, res) => {
//   try {
//     const { type, status, search, page = 1, limit = 20 } = req.query;
//     const query = {};

//     if (roleOf(req) === "customer") {
//       query.customerId = req.user.id;
//     } else if (roleOf(req) === "rider") {
//       query.riderId = req.user.id;
//     }
//     // admin: no participant filter — every conversation is visible

//     if (type && type !== "all") query.type = type;
//     if (status && status !== "all") query.status = status;

//     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//     const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
//     const skip = (pageNum - 1) * limitNum;

//     let conversations = await Conversation.find(query)
//       .populate("customerId", "name phone")
//       .populate("riderId", "name phone")
//       .populate("adminId", "name")
//       .populate("orderId", "orderNumber")
//       .sort({ "lastMessage.sentAt": -1, updatedAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     if (search) {
//       const q = search.toLowerCase();
//       conversations = conversations.filter(
//         (c) =>
//           c.customerId?.name?.toLowerCase().includes(q) ||
//           c.riderId?.name?.toLowerCase().includes(q) ||
//           c.lastMessage?.text?.toLowerCase().includes(q)
//       );
//     }

//     const total = await Conversation.countDocuments(query);

//     return res.status(200).json({
//       success: true,
//       count: conversations.length,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum) || 1,
//       conversations,
//     });
//   } catch (err) {
//     console.log("GET CONVERSATIONS ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // GET MESSAGES IN A CONVERSATION
// // =====================================
// exports.getMessages = async (req, res) => {
//   try {
//     const conversation = await Conversation.findById(req.params.id);
//     if (!conversation) {
//       return res.status(404).json({ success: false, message: "Conversation not found" });
//     }

//     // Participants can only read their own thread; admins can read any.
//     if (roleOf(req) === "customer" && String(conversation.customerId) !== req.user.id) {
//       return res.status(403).json({ success: false, message: "Not authorized" });
//     }
//     if (roleOf(req) === "rider" && String(conversation.riderId) !== req.user.id) {
//       return res.status(403).json({ success: false, message: "Not authorized" });
//     }

//     const { page = 1, limit = 50 } = req.query;
//     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//     const limitNum = Math.max(parseInt(limit, 10) || 50, 1);
//     const skip = (pageNum - 1) * limitNum;

//     const messages = await Message.find({ conversationId: conversation._id, isDeleted: false })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     return res.status(200).json({
//       success: true,
//       count: messages.length,
//       messages: messages.reverse(), // chronological order for the UI
//     });
//   } catch (err) {
//     console.log("GET MESSAGES ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // SEND MESSAGE
// // =====================================
// exports.sendMessage = async (req, res) => {
//   try {
//     const { text, attachments } = req.body;
//     if (!text && (!attachments || attachments.length === 0)) {
//       return res.status(400).json({ success: false, message: "Message text or an attachment is required" });
//     }

//     const conversation = await Conversation.findById(req.params.id);
//     if (!conversation) {
//       return res.status(404).json({ success: false, message: "Conversation not found" });
//     }

//     const senderRole = roleOf(req);
//     if (senderRole === "customer" && String(conversation.customerId) !== req.user.id) {
//       return res.status(403).json({ success: false, message: "Not authorized" });
//     }
//     if (senderRole === "rider" && String(conversation.riderId) !== req.user.id) {
//       return res.status(403).json({ success: false, message: "Not authorized" });
//     }

//     const message = await Message.create({
//       conversationId: conversation._id,
//       senderId: req.user.id,
//       senderRole,
//       text: text || "",
//       attachments: Array.isArray(attachments) ? attachments : [],
//     });

//     conversation.lastMessage = { text: text || "(attachment)", senderId: req.user.id, senderRole, sentAt: new Date() };
//     // Bump the unread counter for every role EXCEPT the sender's own.
//     ["customer", "rider", "admin"].forEach((r) => {
//       if (r !== senderRole) conversation.unreadCount[r] = (conversation.unreadCount[r] || 0) + 1;
//     });
//     // Whichever admin sends first effectively "claims" a support thread.
//     if (senderRole === "admin" && !conversation.adminId) conversation.adminId = req.user.id;
//     await conversation.save();

//     // Broadcast over sockets — see SOCKET_CHAT_CALL_INTEGRATION.md
//     try {
//       const { getIO } = require("../socket");
//       const io = getIO();
//       io.to(`conversation_${conversation._id}`).emit("chat:newMessage", { conversationId: conversation._id, message });

//       // Also notify participants who might not have the thread open
//       [conversation.customerId, conversation.riderId, conversation.adminId]
//         .filter(Boolean)
//         .forEach((uid) => io.to(`user_${uid}`).emit("chat:conversationUpdated", { conversationId: conversation._id, lastMessage: conversation.lastMessage }));
//     } catch (socketErr) {
//       console.log("SOCKET BROADCAST SKIPPED:", socketErr.message);
//     }

//     return res.status(201).json({ success: true, message });
//   } catch (err) {
//     console.log("SEND MESSAGE ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =====================================
// // MARK CONVERSATION AS READ
// // =====================================
// exports.markAsRead = async (req, res) => {
//   try {
//     const conversation = await Conversation.findById(req.params.id);
//     if (!conversation) {
//       return res.status(404).json({ success: false, message: "Conversation not found" });
//     }

//     const readerRole = roleOf(req);
//     conversation.unreadCount[readerRole] = 0;
//     await conversation.save();

//     await Message.updateMany(
//       { conversationId: conversation._id, readBy: { $ne: req.user.id } },
//       { $addToSet: { readBy: req.user.id } }
//     );

//     return res.status(200).json({ success: true, message: "Marked as read" });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

/**
 * GET /api/chat/contacts
 */
exports.getContactsController = async (req, res) => {
  try {
    const { search = "", role } = req.query;

    const searchFilter = {};
    if (search) {
      searchFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      searchFilter.role = role === "customer" ? "user" : role;
    }

    const users = await User.find(searchFilter)
      .select("_id name fullName email phone role")
      .limit(50)
      .lean();

    const formattedContacts = users.map((u) => ({
      _id: u._id,
      name: u.name || u.fullName || "User",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role === "customer" ? "user" : u.role || "user",
    }));

    return res.status(200).json({ success: true, contacts: formattedContacts });
  } catch (error) {
    console.error("GET CONTACTS ERROR:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch user directory" });
  }
};

/**
 * POST /api/chat/conversations
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { type, userId, riderId, vendorId, adminId, orderId } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: "Type parameter is required" });
    }

    // Build unique query payload dynamically
    const query = { type };
    if (userId) query.userId = userId;
    if (riderId) query.riderId = riderId;
    if (vendorId) query.vendorId = vendorId;
    if (adminId) query.adminId = adminId;
    if (orderId) query.orderId = orderId;

    let conversation = await Conversation.findOne(query)
      .populate("userId", "name fullName email phone")
      .populate("riderId", "name fullName email phone")
      .populate("vendorId", "name fullName email phone")
      .populate("adminId", "name fullName email phone");

    if (!conversation) {
      conversation = await Conversation.create({
        type,
        userId: userId || null,
        riderId: riderId || null,
        vendorId: vendorId || null,
        adminId: adminId || null,
        orderId: orderId || null,
        lastMessage: {
          text: "",
          senderId: null,
          senderRole: null,
          sentAt: new Date(),
        },
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("userId", "name fullName email phone")
        .populate("riderId", "name fullName email phone")
        .populate("vendorId", "name fullName email phone")
        .populate("adminId", "name fullName email phone");
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error("GET OR CREATE CONVO ERROR:", error);
    return res.status(500).json({ success: false, error: "Failed to find or create conversation" });
  }
};

/**
 * GET /api/chat/conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.id || req.query.userId;
    const currentUserRole = req.user?.role || req.query.role || "user";

    let filter = {};
    if (currentUserId && currentUserRole !== "admin") {
      filter.$or = [
        { userId: currentUserId },
        { riderId: currentUserId },
        { vendorId: currentUserId },
        { adminId: currentUserId },
      ];
    }

    // DO NOT populate lastMessage since it is an embedded schema object
    const conversations = await Conversation.find(filter)
      .populate("userId", "name fullName email phone")
      .populate("riderId", "name fullName email phone")
      .populate("vendorId", "name fullName email phone")
      .populate("adminId", "name fullName email phone")
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 });

    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch conversations" });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 */
exports.getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid Conversation ID" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    let { text = "", attachments = [], senderRole, senderId, receiverRole = "user" } = req.body;

    // Standardize role nomenclature
    if (senderRole === "customer") senderRole = "user";
    if (receiverRole === "customer") receiverRole = "user";

    // Validate Authorization if req.user is set via auth middleware
    if (req.user && req.user._id.toString() !== senderId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized sender identity" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ success: false, message: "Sender not found" });
    }

    const newMessage = await Message.create({
      conversationId,
      senderId,
      senderRole,
      text,
      attachments,
    });

    let targetRoleKey = ["user", "rider", "vendor", "admin"].includes(receiverRole)
      ? receiverRole
      : "user";

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        text,
        senderId,
        senderRole,
        sentAt: newMessage.createdAt,
      },
      $inc: { [`unreadCount.${targetRoleKey}`]: 1 },
      updatedAt: new Date(),
    });

    const io = req.app.get("socketio");
    if (io) {
      io.to(conversationId.toString()).emit("receiveMessage", newMessage);
    }

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("SEND MESSAGE BACKEND ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

/**
 * PATCH /api/chat/conversations/:id/read
 */
exports.markConversationRead = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    // let role = req.body.role || req.user?.role || "user";
    // if (role === "customer") role = "user";

    // if (!["user", "rider", "vendor", "admin"].includes(role)) {
    //   return res.status(400).json({ success: false, message: "Invalid role specified" });
    // }

    const updatedMessages = await Message.updateMany(
      { conversationId, isRead: false },
      { $set: { isRead: true } }
    );
    // await Conversation.findByIdAndUpdate(conversationId, {
    //   $set: { [`unreadCount.${role}`]: 0 },
    // });

    return res.status(200).json({ success: true, message: `Message marked as read` });
  } catch (error) {
    console.error("MARK READ ERROR:", error);
    return res.status(500).json({ success: false, error: "Failed to mark conversation read" });
  }
};