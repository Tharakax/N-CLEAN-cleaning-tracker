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
    const place = await Place.findById(req.params.id).populate('createdBy', 'name email role');
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
      googleMapUrl,
      images,
      estimatedTimeMinutes,
      frequency,
      customDate,
      description,
      workersNeeded,
      timeOfDay,
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Place name and address are required' });
    }

    if (images && images.length > 3) {
      return res.status(400).json({ message: 'A maximum of 3 images can be added' });
    }

    if (frequency === 'custom' && !customDate) {
      return res.status(400).json({ message: 'Please provide a custom date for custom frequency' });
    }

    const place = await Place.create({
      name,
      address,
      googleMapUrl: googleMapUrl || '',
      images: images || [],
      estimatedTimeMinutes: Number(estimatedTimeMinutes) || 60,
      frequency: frequency || 'daily',
      customDate: frequency === 'custom' && customDate ? new Date(customDate) : undefined,
      description: description || '',
      workersNeeded: Number(workersNeeded) || 1,
      timeOfDay: timeOfDay || 'anytime',
      createdBy: req.user._id,
    });

    const populated = await place.populate('createdBy', 'name email role');
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

    const updated = await Place.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email role');

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update place' });
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

module.exports = {
  getPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
};
