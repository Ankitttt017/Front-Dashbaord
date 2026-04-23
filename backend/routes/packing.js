const express = require('express');
const router = express.Router();
const packingController = require('../controllers/packing');
const authMiddleware = require('../middleware/auth');

router.get('/boxes', packingController.getBoxes);
router.get('/box/:num', packingController.getBox);
router.get('/settings', packingController.getSettings);
router.post('/settings', packingController.updateSettings);
router.post('/generate-next', packingController.generateNextBox);
router.post('/auto-pack', packingController.triggerAutoPack);
router.get('/packed-barcodes', packingController.getPackedBarcodes);
// QA scanned route removed
router.post('/map-final-report', authMiddleware, packingController.mapFinalReport);
router.patch('/box/:id', authMiddleware, packingController.updateBox);
router.delete('/box/:id', authMiddleware, packingController.deleteBox);

module.exports = router;
