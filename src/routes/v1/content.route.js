const express = require('express');
const auth = require('../../middlewares/auth');
const contentController = require('../../controllers/content.controller');

const router = express.Router();

router.get('/', contentController.getAll);
router.get('/:key', contentController.getByKey);
router.put('/:key', auth('admin'), contentController.upsert);

module.exports = router;
