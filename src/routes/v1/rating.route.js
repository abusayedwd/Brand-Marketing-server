const express = require('express');
const auth = require('../../middlewares/auth');
const ratingController = require('../../controllers/rating.controller');

const router = express.Router();

router.post('/', auth('common'), ratingController.createRating);
router.get('/user/:userId', auth('common'), ratingController.getRatingsForUser);

module.exports = router;
