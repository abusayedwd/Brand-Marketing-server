const express = require('express');
const auth = require('../../middlewares/auth');
const favoriteController = require('../../controllers/favorite.controller');

const router = express.Router();

router.get('/', auth('brand'), favoriteController.listFavorites);
router.get('/status/:influencerId', auth('brand'), favoriteController.favoriteStatus);
router.post('/:influencerId', auth('brand'), favoriteController.toggleFavorite);

module.exports = router;
