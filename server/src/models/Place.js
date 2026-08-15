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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              typeof coords[0] === 'number' &&
              typeof coords[1] === 'number' &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude] where longitude is between -180 and 180 and latitude is between -90 and 90',
        },
      },
    },
    googleMapsUrl: {
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
    assignedCleaners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    cleaningStatus: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    lastCleanedAt: {
      type: Date,
      default: null,
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

// 2dsphere index on location for GeoJSON spatial queries
placeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Place', placeSchema);
