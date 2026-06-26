const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['admin', 'resident'],
      default: 'resident'
    },

    // Active community
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      default: null
    },

    // Waiting approval
    pendingSocietyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      default: null
    },

    joinStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },

    gamificationPoints: {
      type: Number,
      default: 0
    },

    issuesReported: {
      type: Number,
      default: 0
    },

    issuesResolved: {
      type: Number,
      default: 0
    },

    issuesVerified: {
      type: Number,
      default: 0
    },

    flagged: {
      type: Boolean,
      default: false
    },

    lastKnownLocation: {
      latitude: Number,
      longitude: Number,
      verifiedAt: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);