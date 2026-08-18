const Place = require('../models/Place');

/**
 * @desc  Get all cleaning places
 * @route GET /api/places
 * @access Private
 */
const populatePlaceCleaners = (query) =>
  query
    .populate('createdBy', 'name email role')
    .populate('assignedCleaners', 'name email role')
    .populate('floors.areas.assignedCleaners', 'name email role');

const getPlaces = async (req, res) => {
  try {
    const places = await populatePlaceCleaners(Place.find().sort({ createdAt: -1 }));
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
    const place = await populatePlaceCleaners(Place.findById(req.params.id));
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
      floors,
      geofenceEnabled,
      geofenceRadiusMeters,
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

    // Validate floor & area uniqueness
    let formattedFloors = [];
    if (Array.isArray(floors) && floors.length > 0) {
      const allAreaNames = new Set();
      for (const fl of floors) {
        const floorName = (fl.floorName || '').trim();
        if (!floorName) {
          return res.status(400).json({ message: 'Each floor must have a customized name/label' });
        }
        const areasList = Array.isArray(fl.areas) ? fl.areas : [];
        for (const ar of areasList) {
          const areaName = (ar.name || '').trim();
          if (!areaName) {
            return res.status(400).json({ message: `Every area on ${floorName} must have a name` });
          }
          const lowerName = `${floorName} - ${areaName}`.toLowerCase();
          if (allAreaNames.has(lowerName)) {
            return res.status(400).json({
              message: `Area "${areaName}" on "${floorName}" is duplicated. All areas should be uniquely named.`,
            });
          }
          allAreaNames.add(lowerName);
        }
      }
      formattedFloors = floors;
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
      floors: formattedFloors,
      geofenceEnabled: geofenceEnabled !== undefined ? Boolean(geofenceEnabled) : true,
      geofenceRadiusMeters: Number(geofenceRadiusMeters) || 200,
      createdBy: req.user._id,
    });

    const populated = await place.populate([
      { path: 'createdBy', select: 'name email role' },
      { path: 'assignedCleaners', select: 'name email role' },
      { path: 'floors.areas.assignedCleaners', select: 'name email role' },
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

    if (req.body.geofenceEnabled !== undefined) {
      updateData.geofenceEnabled = Boolean(req.body.geofenceEnabled);
    }
    if (req.body.geofenceRadiusMeters !== undefined) {
      updateData.geofenceRadiusMeters = Number(req.body.geofenceRadiusMeters) || 200;
    }

    if (Array.isArray(req.body.floors)) {
      const allAreaNames = new Set();
      for (const fl of req.body.floors) {
        const floorName = (fl.floorName || '').trim();
        if (!floorName) {
          return res.status(400).json({ message: 'Each floor must have a customized name/label' });
        }
        const areasList = Array.isArray(fl.areas) ? fl.areas : [];
        for (const ar of areasList) {
          const areaName = (ar.name || '').trim();
          if (!areaName) {
            return res.status(400).json({ message: `Every area on ${floorName} must have a name` });
          }
          const lowerName = `${floorName} - ${areaName}`.toLowerCase();
          if (allAreaNames.has(lowerName)) {
            return res.status(400).json({
              message: `Area "${areaName}" on "${floorName}" is duplicated. All areas should be uniquely named.`,
            });
          }
          allAreaNames.add(lowerName);
        }
      }
      updateData.floors = req.body.floors;
    }

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

    const updated = await populatePlaceCleaners(
      Place.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
    );

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
    const { cleanerIds, floors, scheduledDate, frequency, customDate, geofenceEnabled, geofenceRadiusMeters } = req.body;

    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    // If floors with area-level assignments are provided, merge them
    if (Array.isArray(floors)) {
      // Collect all unique cleaner IDs across all areas to auto-update place-level assignedCleaners
      const areaCleanerSet = new Set();

      floors.forEach((fl, flIdx) => {
        if (!place.floors[flIdx]) return;
        (fl.areas || []).forEach((ar, arIdx) => {
          const area = place.floors[flIdx].areas[arIdx];
          if (!area) return;
          const ids = Array.isArray(ar.assignedCleaners) ? ar.assignedCleaners : [];
          area.assignedCleaners = ids;
          ids.forEach((id) => areaCleanerSet.add(id.toString()));
        });
      });

      // CRITICAL: tell Mongoose the nested array was mutated
      place.markModified('floors');

      // Union: place-level cleaners = explicit cleanerIds (if given) UNION area-level cleaners
      const explicitIds = Array.isArray(cleanerIds) ? cleanerIds.map(String) : [];
      const unionIds = [...new Set([...explicitIds, ...areaCleanerSet])];
      place.assignedCleaners = unionIds;
    } else if (Array.isArray(cleanerIds)) {
      // Plain place-level assignment only (no floor/area breakdown)
      place.assignedCleaners = cleanerIds;
    } else {
      return res.status(400).json({ message: 'cleanerIds or floors must be provided' });
    }

    // Update schedule fields if provided
    if (frequency) {
      place.frequency = frequency;
    }
    if (customDate !== undefined) {
      place.customDate = customDate ? new Date(customDate) : null;
    }
    // Store scheduledDate in customDate when frequency is not 'custom', or as the start date
    if (scheduledDate && frequency !== 'custom') {
      // For non-custom frequencies, we store the next scheduled date in customDate as reference
      place.customDate = new Date(scheduledDate);
    }

    // Update geofence settings if provided
    if (geofenceEnabled !== undefined) {
      place.geofenceEnabled = Boolean(geofenceEnabled);
    }
    if (geofenceRadiusMeters !== undefined) {
      place.geofenceRadiusMeters = Number(geofenceRadiusMeters) || 200;
    }

    await place.save();

    const populated = await populatePlaceCleaners(Place.findById(place._id));
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
    // A cleaner can be assigned at the place level OR at an individual area level
    const places = await populatePlaceCleaners(
      Place.find({
        $or: [
          { assignedCleaners: req.user._id },
          { 'floors.areas.assignedCleaners': req.user._id },
        ],
      }).sort({ updatedAt: -1 })
    );

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

    // If cleaner, verify they are assigned and not trying to re-open a completed task
    if (req.user.role === 'cleaner') {
      const isAssigned = place.assignedCleaners.some(
        (id) => id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'You are not assigned to this cleaning place' });
      }

      if (place.cleaningStatus === 'completed') {
        return res.status(403).json({
          message: 'This cleaning task is already completed and cannot be re-opened by cleaners.',
        });
      }
    }

    place.cleaningStatus = status;
    if (status === 'in-progress') {
      place.cleaningStartedAt = req.body.startedAt ? new Date(req.body.startedAt) : (place.cleaningStartedAt || new Date());
    } else if (status === 'completed') {
      place.lastCleanedAt = new Date();
      place.cleaningStartedAt = null;
    } else if (status === 'pending') {
      place.cleaningStartedAt = null;
    }
    await place.save();

    const populated = await populatePlaceCleaners(Place.findById(place._id));

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
