const express = require('express');
const router = express.Router();
const {
  getPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  assignCleanersToPlace,
  deletePlace,
  getCleanerPlaces,
  updatePlaceCleaningStatus,
} = require('../controllers/placeController');
const { protect, adminOrSupervisor } = require('../middleware/authMiddleware');

router.get('/my-tasks', protect, getCleanerPlaces);

router
  .route('/')
  .get(protect, getPlaces)
  .post(protect, adminOrSupervisor, createPlace);

router
  .route('/:id')
  .get(protect, getPlaceById)
  .put(protect, adminOrSupervisor, updatePlace)
  .delete(protect, adminOrSupervisor, deletePlace);

router
  .route('/:id/assign')
  .put(protect, adminOrSupervisor, assignCleanersToPlace);

router
  .route('/:id/status')
  .patch(protect, updatePlaceCleaningStatus);

module.exports = router;
