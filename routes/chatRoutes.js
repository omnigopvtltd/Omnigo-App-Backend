const express = require("express");
const router = express.Router();

const {
  getContactsController,
  getConversations,
  getMessages,
  getOrCreateConversation,
  sendMessage,
  markConversationRead,
} = require("../controllers/chatController.js");

// Make sure none of these handlers are undefined!
router.get("/contacts", getContactsController);
router.get("/conversations", getConversations);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations", getOrCreateConversation);
router.post("/conversations/:id/messages", sendMessage);
router.patch("/conversations/:id/read", markConversationRead);

module.exports = router;