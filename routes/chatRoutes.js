const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
createConversation,
sendMessage,
getMessages,
myConversations
} = require("../controllers/chatController");

router.post("/create-conversation",auth,createConversation);
router.post("/send-message",auth,sendMessage);
router.get("/messages/:conversationId",auth,getMessages);
router.get("/my-conversations",auth,myConversations);

module.exports = router;