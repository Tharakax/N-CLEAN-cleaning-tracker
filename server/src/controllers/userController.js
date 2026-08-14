const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * @desc  Get users (admin gets all, supervisor gets cleaners only)
 * @route GET /api/users
 * @access Private/Admin/Supervisor
 */
const getAllUsers = async (req, res) => {
  const filter = req.user.role === 'supervisor' ? { role: 'cleaner' } : {};
  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(users);
};

/**
 * @desc  Create a new user (admin can create supervisor/cleaner, supervisor can ONLY create cleaner)
 * @route POST /api/users
 * @access Private/Admin/Supervisor
 */
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role === 'admin') {
    return res.status(400).json({ message: 'Only one admin is allowed' });
  }

  // Supervisor can only create cleaner accounts
  if (req.user.role === 'supervisor' && role !== 'cleaner') {
    return res.status(403).json({ message: 'Supervisors are only allowed to add Cleaners' });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({ name, email, password: hashedPassword, role: role || 'cleaner' });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
};

/**
 * @desc  Update a user's role or info
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Cannot modify the admin account' });
  }

  user.name = req.body.name || user.name;
  user.role = req.body.role || user.role;

  const updated = await user.save();
  res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role });
};

/**
 * @desc  Delete a user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
/**
 * @desc  Delete a user
 * @route DELETE /api/users/:id
 * @access Private/Admin/Supervisor
 */
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Cannot delete the admin account' });
  }

  if (req.user.role === 'supervisor' && user.role !== 'cleaner') {
    return res.status(403).json({ message: 'Supervisors can only delete cleaners' });
  }

  await user.deleteOne();
  res.json({ message: 'User deleted' });
};

/**
 * @desc  Get dashboard stats
 * @route GET /api/users/stats
 * @access Private/Admin/Supervisor
 */
const getDashboardStats = async (req, res) => {
  const Task = require('../models/Task');

  const [totalUsers, supervisors, cleaners, totalTasks, completedTasks, pendingTasks] =
    await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'supervisor' }),
      User.countDocuments({ role: 'cleaner' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
    ]);

  res.json({ totalUsers, supervisors, cleaners, totalTasks, completedTasks, pendingTasks });
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, getDashboardStats };
