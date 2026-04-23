const express = require('express');
const router = express.Router();
const targetsController = require('../controllers/targets');

router.get('/', targetsController.listTargets);
router.post('/', targetsController.upsertTarget);
router.delete('/:id', targetsController.deleteTarget);

module.exports = router;
