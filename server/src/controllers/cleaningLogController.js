const CleaningLog = require('../models/CleaningLog');
const Place = require('../models/Place');

/**
 * Format seconds into human readable duration string (e.g., "1h 15m 30s" or "42m 10s")
 */
const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

/**
 * @desc   Create and store a completed cleaning log session
 * @route  POST /api/cleaning-logs
 * @access Private (Cleaner, Supervisor, Admin)
 */
const createCleaningLog = async (req, res) => {
  try {
    const {
      placeId,
      startedAt,
      completedAt,
      scheduledDate,
      estimatedMinutes,
      exactDurationSeconds,
      completedTasks,
      verifiedVicinity,
      cleanerLocation,
      notes,
    } = req.body;

    if (!placeId || !startedAt || !completedAt) {
      return res.status(400).json({ message: 'Place ID, start time, and completion time are required' });
    }

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: 'Cleaning place not found' });
    }

    const start = new Date(startedAt);
    const end = new Date(completedAt);

    // Calculate actual seconds if not directly passed or validate
    const calculatedDurationSeconds =
      typeof exactDurationSeconds === 'number'
        ? exactDurationSeconds
        : Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));

    const estMins = Number(estimatedMinutes) || place.estimatedTimeMinutes || 60;
    const estSeconds = estMins * 60;

    // Overtime/extra time calculation (in seconds)
    const extraDurationSeconds = Math.max(0, calculatedDurationSeconds - estSeconds);

    // Rounded up to the nearest full hour (1 hr min, e.g. 45 min -> 1 hr, 65 min -> 2 hrs)
    const roundedDurationHours = Math.max(1, Math.ceil(calculatedDurationSeconds / 3600));

    const cleaningLog = await CleaningLog.create({
      cleaner: req.user._id,
      place: place._id,
      placeSnapshot: {
        name: place.name,
        address: place.address,
        coordinates: place.location?.coordinates || [],
      },
      startedAt: start,
      completedAt: end,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      estimatedMinutes: estMins,
      exactDurationSeconds: calculatedDurationSeconds,
      exactDurationFormatted: formatDuration(calculatedDurationSeconds),
      extraDurationSeconds,
      extraDurationFormatted: formatDuration(extraDurationSeconds),
      roundedDurationHours,
      completedTasks: Array.isArray(completedTasks) ? completedTasks : [],
      verifiedVicinity: Boolean(verifiedVicinity),
      cleanerLocation: cleanerLocation || {},
      notes: notes || '',
    });

    // Update the place cleaning status & lastCleanedAt
    place.cleaningStatus = 'completed';
    place.lastCleanedAt = end;
    place.cleaningStartedAt = null;
    await place.save();

    const populated = await cleaningLog.populate([
      { path: 'cleaner', select: 'name email role' },
      { path: 'place', select: 'name address location floors frequency' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating cleaning log:', error);
    res.status(500).json({ message: error.message || 'Failed to save cleaning log' });
  }
};

/**
 * @desc   Get all cleaning logs with filtering options
 * @route  GET /api/cleaning-logs
 * @access Private (Admin, Supervisor)
 */
const getCleaningLogs = async (req, res) => {
  try {
    const { cleanerId, placeId, startDate, endDate, limit = 200 } = req.query;

    const query = {};

    if (cleanerId) {
      query.cleaner = cleanerId;
    }

    if (placeId) {
      query.place = placeId;
    }

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.startedAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startedAt.$lte = end;
      }
    }

    const logs = await CleaningLog.find(query)
      .sort({ startedAt: -1 })
      .limit(Number(limit))
      .populate('cleaner', 'name email role')
      .populate('place', 'name address location floors frequency');

    res.json(logs);
  } catch (error) {
    console.error('Error fetching cleaning logs:', error);
    res.status(500).json({ message: 'Failed to retrieve cleaning logs' });
  }
};

/**
 * @desc   Get logged in cleaner's own cleaning logs
 * @route  GET /api/cleaning-logs/my-logs
 * @access Private (Cleaner)
 */
const getMyCleaningLogs = async (req, res) => {
  try {
    const logs = await CleaningLog.find({ cleaner: req.user._id })
      .sort({ startedAt: -1 })
      .limit(100)
      .populate('cleaner', 'name email role')
      .populate('place', 'name address location floors frequency');

    res.json(logs);
  } catch (error) {
    console.error('Error fetching cleaner own logs:', error);
    res.status(500).json({ message: 'Failed to retrieve personal cleaning logs' });
  }
};

/**
 * @desc   Get aggregate statistics for reports & analytics
 * @route  GET /api/cleaning-logs/stats
 * @access Private (Admin, Supervisor)
 */
const getCleaningLogStats = async (req, res) => {
  try {
    const { cleanerId, placeId, startDate, endDate } = req.query;

    const query = {};

    if (cleanerId) {
      query.cleaner = cleanerId;
    }

    if (placeId) {
      query.place = placeId;
    }

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.startedAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startedAt.$lte = end;
      }
    }

    const logs = await CleaningLog.find(query);

    const totalSessions = logs.length;
    const totalExactSeconds = logs.reduce((sum, l) => sum + (l.exactDurationSeconds || 0), 0);
    const totalExtraSeconds = logs.reduce((sum, l) => sum + (l.extraDurationSeconds || 0), 0);
    const totalRoundedHours = logs.reduce((sum, l) => sum + (l.roundedDurationHours || 0), 0);

    const verifiedVicinityCount = logs.filter((l) => l.verifiedVicinity).length;

    res.json({
      totalSessions,
      totalExactSeconds,
      totalExactDurationFormatted: formatDuration(totalExactSeconds),
      totalExtraSeconds,
      totalExtraDurationFormatted: formatDuration(totalExtraSeconds),
      totalRoundedHours,
      verifiedVicinityCount,
      vicinityComplianceRate: totalSessions > 0 ? Math.round((verifiedVicinityCount / totalSessions) * 100) : 100,
    });
  } catch (error) {
    console.error('Error calculating log stats:', error);
    res.status(500).json({ message: 'Failed to calculate cleaning log stats' });
  }
};

module.exports = {
  createCleaningLog,
  getCleaningLogs,
  getMyCleaningLogs,
  getCleaningLogStats,
};
