const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const requireDatabase = require('../middleware/requireDatabase');

router.use(requireDatabase);

router.get('/date-range', reportController.getDateRange);
router.get('/summary', reportController.getSummary);
router.get('/shift-wise', reportController.getShiftWise);
router.get('/station-wise', reportController.getStationWise);
router.get('/hourly', reportController.getHourly);
router.get('/records', reportController.getRecords);
router.get('/oee', reportController.getOee);
router.get('/journey', reportController.getJourney);
router.post('/journey/reset', reportController.resetJourney);

module.exports = router;
