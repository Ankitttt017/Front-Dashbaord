const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan');
const authMiddleware = require('../middleware/auth');

router.get('/check/:barcode', authMiddleware, scanController.checkBarcode);

module.exports = router;
