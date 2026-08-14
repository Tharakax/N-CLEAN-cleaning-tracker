const express = require('express');
const router = express.Router();
const {
  getPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
} = require('../controllers/placeController');
const { protect, adminOrSupervisor } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getPlaces)
  .post(protect, adminOrSupervisor, createPlace);

router
  .route('/:id')
  .get(protect, getPlaceById)
  .put(protect, adminOrSupervisor, updatePlace)
  .delete(protect, adminOrSupervisor, deletePlace);

module.exports = router;
