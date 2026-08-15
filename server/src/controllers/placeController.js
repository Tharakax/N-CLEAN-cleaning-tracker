const Place = require('../models/Place');

/**
 * @desc  Get all cleaning places
 * @route GET /api/places
 * @access Private
 */
const getPlaces = async (req, res) => {
  try {
    const places = await Place.find()
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role')
      .sort({ createdAt: -1 });
    res.json(places);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ message: 'Failed to fetch cleaning places' });
  }
};

/**
 * @desc  Get single place by ID
 * @route GET /api/places/:id
 * @access Private
 */
const getPlaceById = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role');
    if (!place) return res.status(404).json({ message: 'Place not found' });
    res.json(place);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving place' });
  }
};

/**
 * @desc  Create a new cleaning place
 * @route POST /api/places
 * @access Private/Admin/Supervisor
 */
const createPlace = async (req, res) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      googleMapsUrl,
      images,
      estimatedTimeMinutes,
      frequency,
      customDate,
      description,
      workersNeeded,
      timeOfDay,
      assignedCleaners,
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Place name and address are required' });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(latNum) ||
      isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      return res.status(400).json({
        message: 'A valid location selection is required (Latitude: -90 to 90, Longitude: -180 to 180)',
      });
    }

    if (images && images.length > 3) {
      return res.status(400).json({ message: 'A maximum of 3 images can be added' });
    }

    if (frequency === 'custom' && !customDate) {
      return res.status(400).json({ message: 'Please provide a custom date for custom frequency' });
    }

    // Standard GeoJSON Point coordinates: [longitude, latitude]
    const location = {
      type: 'Point',
      coordinates: [lngNum, latNum],
    };

    const finalGoogleMapsUrl =
      googleMapsUrl || `https://www.google.com/maps?q=${latNum},${lngNum}`;

    const place = await Place.create({
      name,
      address,
      location,
      googleMapsUrl: finalGoogleMapsUrl,
      images: images || [],
      estimatedTimeMinutes: Number(estimatedTimeMinutes) || 60,
      frequency: frequency || 'daily',
      customDate: frequency === 'custom' && customDate ? new Date(customDate) : undefined,
      description: description || '',
      workersNeeded: Number(workersNeeded) || 1,
      timeOfDay: timeOfDay || 'anytime',
      assignedCleaners: Array.isArray(assignedCleaners) ? assignedCleaners : [],
      createdBy: req.user._id,
    });

    const populated = await place.populate([
      { path: 'createdBy', select: 'name email role' },
      { path: 'assignedCleaners', select: 'name email role' },
    ]);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(400).json({ message: error.message || 'Failed to create cleaning place' });
  }
};

/**
 * @desc  Update a cleaning place
 * @route PUT /api/places/:id
 * @access Private/Admin/Supervisor
 */
const updatePlace = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    if (req.body.images && req.body.images.length > 3) {
      return res.status(400).json({ message: 'A maximum of 3 images can be added' });
    }

    const updateData = { ...req.body };

    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      const lat = Number(req.body.latitude);
      const lng = Number(req.body.longitude);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        updateData.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        updateData.googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      }
    }

    const updated = await Place.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role');

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update place' });
  }
};

/**
 * @desc  Assign cleaners to a cleaning place
 * @route PUT /api/places/:id/assign
 * @access Private/Admin/Supervisor
 */
const assignCleanersToPlace = async (req, res) => {
  try {
    const { cleanerIds } = req.body;
    if (!Array.isArray(cleanerIds)) {
      return res.status(400).json({ message: 'cleanerIds must be an array of user IDs' });
    }

    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    place.assignedCleaners = cleanerIds;
    await place.save();

    const populated = await Place.findById(place._id)
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role');

    res.json(populated);
  } catch (error) {
    console.error('Error assigning cleaners:', error);
    res.status(500).json({ message: 'Failed to assign cleaners to place' });
  }
};

/**
 * @desc  Delete a cleaning place
 * @route DELETE /api/places/:id
 * @access Private/Admin/Supervisor
 */
const deletePlace = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    await place.deleteOne();
    res.json({ message: 'Place removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete place' });
  }
};

/**
 * @desc  Get cleaning places assigned to logged in cleaner
 * @route GET /api/places/my-tasks
 * @access Private/Cleaner
 */
const getCleanerPlaces = async (req, res) => {
  try {
    const places = await Place.find({
      assignedCleaners: req.user._id,
    })
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role')
      .sort({ updatedAt: -1 });

    res.json(places);
  } catch (error) {
    console.error('Error fetching cleaner tasks:', error);
    res.status(500).json({ message: 'Failed to fetch assigned cleaning tasks' });
  }
};

/**
 * @desc  Update status of a cleaning place by cleaner/supervisor/admin
 * @route PATCH /api/places/:id/status
 * @access Private
 */
const updatePlaceCleaningStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'in-progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid cleaning status' });
    }

    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    // If cleaner, verify they are assigned
    if (req.user.role === 'cleaner') {
      const isAssigned = place.assignedCleaners.some(
        (id) => id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'You are not assigned to this cleaning place' });
      }
    }

    place.cleaningStatus = status;
    if (status === 'completed') {
      place.lastCleanedAt = new Date();
    }
    await place.save();

    const populated = await Place.findById(place._id)
      .populate('createdBy', 'name email role')
      .populate('assignedCleaners', 'name email role');

    res.json(populated);
  } catch (error) {
    console.error('Error updating cleaning status:', error);
    res.status(500).json({ message: 'Failed to update cleaning status' });
  }
};

module.exports = {
  getPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  assignCleanersToPlace,
  deletePlace,
  getCleanerPlaces,
  updatePlaceCleaningStatus,
};
