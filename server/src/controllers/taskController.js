const Task = require('../models/Task');

/**
 * @desc    Get all tasks (admin sees all, staff sees only theirs)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  res.json(tasks);
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private/Admin
 */
const createTask = async (req, res) => {
  const { title, description, location, priority, assignedTo, scheduledDate } = req.body;
  const task = await Task.create({
    title,
    description,
    location,
    priority,
    assignedTo,
    scheduledDate,
    createdBy: req.user._id,
  });
  res.status(201).json(task);
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json(task);
};

/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  // Mark completedAt when status changes to completed
  if (req.body.status === 'completed' && task.status !== 'completed') {
    req.body.completedAt = new Date();
  }

  const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json(updated);
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private/Admin
 */
const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  await task.deleteOne();
  res.json({ message: 'Task removed' });
};

module.exports = { getTasks, createTask, getTaskById, updateTask, deleteTask };
