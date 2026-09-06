const express = require('express');
const auth = require('../../middlewares/auth');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

router.post('/create', auth('common'), chatController.createChat);
router.get('/getChatlist', auth('common'), chatController.getChatList);

module.exports = router;
