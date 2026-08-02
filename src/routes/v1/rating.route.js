const express = require('express');
const auth = require('../../middlewares/auth');
const ratingController = require('../../controllers/rating.controller');

const router = express.Router();

router.post('/', auth('common'), ratingController.createRating);
// Public profile ratings (write still requires auth)
router.get('/user/:userId', ratingController.getRatingsForUser);

module.exports = router;
