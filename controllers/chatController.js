const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Order = require("../models/Order");
const admin = require("firebase-admin");

// It checks if the receiver is online in the chat room or not. If not, it sends a push notification to the receiver using Firebase Cloud Messaging (FCM).
async function handleOfflineNotification(receiverId, messageText, senderName) {
  try {
    // 1. Database se Receiver (Rider) ka FCM Token nikalen (Jo uske phone se save hua tha)
    const user = await User.findById(receiverId);
    const fcmToken = user?.fcmToken; 

    if (!fcmToken) {
      console.log("User target belongs to no registered FCM token.");
      return;
    }

    // 2. Notification Packet Payload banayein
    const payload = {
      token: fcmToken,
      notification: {
        title: senderName || "New Message Received",
        body: messageText.length > 60 ? messageText.substring(0, 60) + "..." : messageText,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "chat",
        conversationId: "6a463bd674f1e5793327c41f" // Open Direct Chat in Flutter app
      }
    };

    // 3. Send via Firebase
    await admin.messaging().send(payload);
    console.log("🚀 Push Notification sent successfully!");

  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

// ================= CREATE CONVERSATION =================
exports.createConversation = async (req, res) => {
  try {

    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {

      return res.status(404).json({
        success:false,
        message:"Order not found"
      });

    }

    let conversation = await Conversation.findOne({ orderId });

    if(conversation){

        return res.json({
            success:true,
            conversation
        });

    }

    conversation = await Conversation.create({

        orderId,

        customerId:order.userId,

        riderId:order.riderId

    });

    res.status(201).json({

        success:true,

        conversation

    });

  } catch (err) {

    res.status(500).json({

        success:false,

        message:err.message

    });

  }
};

// ================= SEND MESSAGE =================
// exports.sendMessage = async (req, res) => {

//     try{

//         const {
//             conversationId,
//             receiver,
//             sender,
//             message
//         } = req.body;

//         const newMessage = await Message.create({

//             conversationId,
//             sender:req.user._id,
//             receiver,
//             sender,
//             message

//         });

//         await Conversation.findByIdAndUpdate(

//             conversationId,
//             {
//                 lastMessage:message,
//                 lastMessageAt:new Date()

//             }

//         );

//         res.status(201).json({

//             success:true,

//             newMessage

//         });

//     }

//     catch(err){

//         res.status(500).json({

//             success:false,

//             message:err.message

//         });

//     }

// };
exports.sendMessage = async(req,res)=>{

return res.status(400).json({

message:"Use Socket.io"

});

}

// ================= GET MESSAGES =================
exports.getMessages = async(req,res)=>{

try{

const messages = await Message.find({

conversationId:req.params.conversationId

})

.populate("sender","name image")

.populate("receiver","name image")

.sort({createdAt:1});

res.json({

success:true,

messages

});

}

catch(err){

res.status(500).json({

success:false,

message:err.message

});

}

};

// ================= My Conversations =================
exports.myConversations = async(req,res)=>{

try{

const conversations = await Conversation.find({

$or:[

{customerId:req.user._id},

{riderId:req.user._id}

]

})

.populate("customerId","name image")

.populate("riderId","name image")

.sort({updatedAt:-1});

res.json({

success:true,

conversations

});

}

catch(err){

res.status(500).json({

success:false,

message:err.message

});

}

};