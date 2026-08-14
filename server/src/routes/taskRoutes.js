const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect, adminOnly, adminOrSupervisor } = require('../middleware/authMiddleware');

router.route('/').get(protect, getTasks).post(protect, adminOrSupervisor, createTask);

router
  .route('/:id')
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, adminOrSupervisor, deleteTask);

module.exports = router;
