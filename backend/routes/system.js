const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system');

router.get('/status', systemController.getStatus);

module.exports = router;
