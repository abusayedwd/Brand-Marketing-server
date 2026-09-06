const express = require('express');
const auth = require('../../middlewares/auth');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

router.post('/sendMessage', auth('common'), chatController.sendMessage);
router.get('/:chatId', auth('common'), chatController.getMessages);

module.exports = router;
