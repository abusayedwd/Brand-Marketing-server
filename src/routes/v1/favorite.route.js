const express = require('express');
const auth = require('../../middlewares/auth');
const favoriteController = require('../../controllers/favorite.controller');

const router = express.Router();

router.get('/', auth('brand'), favoriteController.listFavorites);
router.post('/:influencerId', auth('brand'), favoriteController.toggleFavorite);

module.exports = router;
