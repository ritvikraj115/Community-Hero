const mongoose = require('mongoose');

const maintenanceTaskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true
  },

  deadline: {
    type: Date,
    required: true
  },

  completed: {
    type: Boolean,
    default: false
  }
});

const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },

      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (arr) => arr.length === 2,
          message: 'Coordinates must contain [longitude, latitude]'
        }
      }
    },

    radiusInMeters: {
      type: Number,
      required: true,
      default: 500,
      min: 50
    },

    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: null
      },
      coordinates: {
        type: [[[Number]]],
        default: undefined
      }
    },

    geofenceMode: {
      type: String,
      enum: ['radius', 'polygon'],
      default: 'radius'
    },

    communityDetails: {
      totalBlocks: {
        type: Number,
        default: 0
      },

      drainageType: {
        type: String,
        default: ''
      },

      knownVulnerabilities: {
        type: [String],
        default: []
      }
    },

    maintenanceSchedule: {
      type: [maintenanceTaskSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

societySchema.index({ location: '2dsphere' });
societySchema.index({ boundary: '2dsphere' });

module.exports = mongoose.model('Society', societySchema);
