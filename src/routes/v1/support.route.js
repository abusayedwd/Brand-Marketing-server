const express = require('express');
const auth = require('../../middlewares/auth');
const supportController = require('../../controllers/support.controller');

const router = express.Router();

// Public submit — logged-in users still send token; controller attaches userId if present
router.post('/', supportController.createTicket);

router.get('/', auth('admin'), supportController.listTickets);
router.get('/:id', auth('admin'), supportController.getTicket);
router.patch('/:id', auth('admin'), supportController.updateTicket);

module.exports = router;
