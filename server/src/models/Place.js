const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    googleMapUrl: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      validate: [
        (val) => val.length <= 3,
        'Cannot upload more than 3 images',
      ],
      default: [],
    },
    estimatedTimeMinutes: {
      type: Number,
      required: [true, 'Approximate cleaning time is required'],
      min: [1, 'Estimated cleaning time must be at least 1 minute'],
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      required: [true, 'Cleaning frequency is required'],
      default: 'daily',
    },
    customDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    workersNeeded: {
      type: Number,
      required: [true, 'Number of workers needed is required'],
      min: [1, 'At least 1 worker is needed'],
      default: 1,
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'anytime'],
      required: [true, 'Suitable cleaning time of day is required'],
      default: 'anytime',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Place', placeSchema);
