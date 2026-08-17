const mongoose = require('mongoose');

const cleaningLogSchema = new mongoose.Schema(
  {
    cleaner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cleaner reference is required'],
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: [true, 'Place reference is required'],
    },
    // Snapshot of place details at time of cleaning
    placeSnapshot: {
      name: String,
      address: String,
      coordinates: [Number], // [lng, lat]
    },
    startedAt: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    completedAt: {
      type: Date,
      required: [true, 'Completion time is required'],
    },
    scheduledDate: {
      type: Date,
    },
    estimatedMinutes: {
      type: Number,
      default: 0,
    },
    // Total actual cleaning time in seconds
    exactDurationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    // Human-readable "42m 15s"
    exactDurationFormatted: {
      type: String,
    },
    // Seconds over the estimated time (0 if finished on time)
    extraDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Human-readable overtime  "5m 30s" or "0s"
    extraDurationFormatted: {
      type: String,
      default: '0s',
    },
    // Total cleaning time rounded UP to the nearest full hour
    // e.g., 45 mins -> 1 hr, 65 mins -> 2 hrs
    roundedDurationHours: {
      type: Number,
      required: true,
      min: 1,
    },
    // Each individual floor/area task the cleaner ticked as complete
    completedTasks: [
      {
        floorName: { type: String, trim: true },
        areaName: { type: String, trim: true },
        areaType: { type: String, trim: true },
        completedAt: { type: Date },
      },
    ],
    // Whether GPS vicinity was checked before starting
    verifiedVicinity: {
      type: Boolean,
      default: false,
    },
    // The cleaner's actual GPS position when they started
    cleanerLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      distanceMeters: { type: Number }, // distance from place coords
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Indexes for efficient reporting queries
cleaningLogSchema.index({ cleaner: 1, startedAt: -1 });
cleaningLogSchema.index({ place: 1, startedAt: -1 });
cleaningLogSchema.index({ startedAt: -1 });

module.exports = mongoose.model('CleaningLog', cleaningLogSchema);
