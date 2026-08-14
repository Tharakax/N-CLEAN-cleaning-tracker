const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats,
} = require('../controllers/userController');
const { protect, adminOnly, adminOrSupervisor } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminOrSupervisor, getDashboardStats);
router.route('/').get(protect, adminOrSupervisor, getAllUsers).post(protect, adminOrSupervisor, createUser);
router
  .route('/:id')
  .put(protect, adminOnly, updateUser)
  .delete(protect, adminOrSupervisor, deleteUser);

module.exports = router;
