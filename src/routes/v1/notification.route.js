const express = require('express');
const auth = require('../../middlewares/auth');
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

router.get('/', auth('common'), notificationController.getMyNotifications);
router.get('/unread-count', auth('common'), notificationController.unreadCount);
router.post('/read-all', auth('common'), notificationController.markAllAsRead);
router.post('/:id/read', auth('common'), notificationController.markAsRead);

module.exports = router;
