const express = require('express');
const auth = require('../../middlewares/auth');
const planController = require('../../controllers/subscriptionPlan.controller');

const router = express.Router();

router.get('/', planController.listPublic);
router.get('/admin/all', auth('admin'), planController.listAll);
router.post('/', auth('admin'), planController.createPlan);
router.put('/:id', auth('admin'), planController.updatePlan);
router.delete('/:id', auth('admin'), planController.deletePlan);

module.exports = router;
