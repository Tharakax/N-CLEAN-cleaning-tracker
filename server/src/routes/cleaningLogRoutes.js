const express = require('express');
const router = express.Router();
const {
  createCleaningLog,
  getCleaningLogs,
  getMyCleaningLogs,
  getCleaningLogStats,
} = require('../controllers/cleaningLogController');
const { protect, adminOrSupervisor } = require('../middleware/authMiddleware');

// Logged-in cleaners can create & view their logs; Admin & Supervisor can view all & stats
router.route('/')
  .post(protect, createCleaningLog)
  .get(protect, adminOrSupervisor, getCleaningLogs);

router.get('/my-logs', protect, getMyCleaningLogs);
router.get('/stats', protect, adminOrSupervisor, getCleaningLogStats);

module.exports = router;
