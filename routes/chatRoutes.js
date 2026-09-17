// const express = require("express");
// const router = express.Router();

// const {
//   getContactsController,
//   getConversations,
//   getMessages,
//   getOrCreateConversation,
//   sendMessage,
//   markConversationRead,
// } = require("../controllers/chatController.js");

// // Make sure none of these handlers are undefined!
// router.get("/contacts", getContactsController);
// router.get("/conversations", getConversations);
// router.get("/conversations/:id/messages", getMessages);
// router.post("/conversations", getOrCreateConversation);
// router.post("/conversations/:conversationId/messages", sendMessage);
// router.patch("/conversations/:id/read", markConversationRead);

// module.exports = router;


////////////////////////////

const express = require("express");
const router = express.Router();

const {
  getContactsController,
  getConversations,
  getMessages,
  getOrCreateConversation,
  markConversationRead,
} = require("../controllers/chatController.js");

router.get("/contacts", getContactsController);
router.get("/conversations", getConversations);
router.post("/conversations", getOrCreateConversation);
router.patch("/conversations/:id/read", markConversationRead);

router.get("/conversations/:id/messages", getMessages);
// REMOVED: router.post("/conversations/:id/messages", sendMessage);
// Sending a message now happens ONLY through the Socket.IO "sendMessage"
// event (see chatSocket.js). This route is gone on purpose — see the note
// at the bottom of chatController.js for why.

module.exports = router;
