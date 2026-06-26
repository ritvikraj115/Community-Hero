const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const issueEventSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    status: { type: String, default: '' },
    note: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },

    description: { type: String, required: true, trim: true },
    mediaUrl: { type: String, default: null },
    resolvedMediaUrl: { type: String, default: null },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },

    category: { type: String, default: null },
    severityScore: { type: Number, default: null },
    inferredReason: { type: String, default: null },
    rootCause: { type: String, default: '' },
    risk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    tags: { type: [String], default: [] },
    aiShortExplanation: { type: String, default: '' },
    aiMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },

    status: {
      type: String,
      enum: ['Pending Approval', 'Open', 'In Progress', 'Pending Verification', 'Resolved', 'Rejected'],
      default: 'Pending Approval'
    },

    solver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    helpers: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          joinedAt: { type: Date, default: Date.now },
          requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        }
      ],
      default: []
    },
    helpRequested: { type: Boolean, default: false },
    helpRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    helpRequestedAt: { type: Date, default: null },
    helpRequestNote: { type: String, default: '' },
    claimedAt: { type: Date, default: null },
    estimatedCompletion: { type: Date, default: null },
    resourcesNeeded: { type: String, default: '' },
    deadline: { type: Date, default: null },
    maintenanceTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTask', default: null },

    requiredApprovalVotes: { type: Number, default: 20 },
    requiredResolutionVotes: { type: Number, default: 50 },
    aiConfidenceScore: { type: Number, default: null },
    resolutionSummary: { type: String, default: '' },
    resolutionExplanation: { type: String, default: '' },
    resolutionSubmittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionQuality: { type: Number, default: null },
    resolutionConfidence: { type: Number, default: null },

    semanticSummary: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
    embeddingDimensions: { type: Number, default: 0 },
    embeddingModel: { type: String, default: '' },
    embeddingVersion: { type: String, default: '' },
    embeddingCreatedAt: { type: Date, default: null },
    resolutionEmbedding: { type: [Number], default: [] },
    resolutionEmbeddingDimensions: { type: Number, default: 0 },
    resolutionEmbeddingModel: { type: String, default: '' },
    resolutionEmbeddingVersion: { type: String, default: '' },
    resolutionEmbeddingCreatedAt: { type: Date, default: null },

    duplicateReports: {
      type: [
        {
          reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          description: { type: String, default: '' },
          location: {
            latitude: Number,
            longitude: Number
          },
          semanticSimilarity: { type: Number, default: null },
          imageSimilarity: { type: Number, default: null },
          distance: { type: Number, default: null },
          reportedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    mergedReporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mergedLocations: {
      type: [
        {
          latitude: Number,
          longitude: Number,
          reportedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    mergedDescriptions: {
      type: [
        {
          description: { type: String, default: '' },
          reportedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    historicalSimilarity: { type: Number, default: null },
    imageSimilarity: { type: Number, default: null },
    semanticSimilarity: { type: Number, default: null },
    lastComparedAt: { type: Date, default: null },

    currentVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    approvalVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resolutionVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    duplicateCount: { type: Number, default: 0 },
    duplicateReporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    duplicateMerged: { type: Boolean, default: false },

    timeline: [issueEventSchema],
    history: [issueEventSchema],
    comments: [commentSchema]
  },
  { timestamps: true }
);

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ societyId: 1, status: 1 });
issueSchema.index({ societyId: 1, category: 1, status: 1 });
issueSchema.index({ societyId: 1, embeddingDimensions: 1, status: 1 });
issueSchema.index({ societyId: 1, embeddingCreatedAt: -1 });
issueSchema.index({ societyId: 1, status: 1, embeddingCreatedAt: -1 });
issueSchema.index({ maintenanceTaskId: 1 });

issueSchema.pre('save', function setEmbeddingDimensions() {
  if (Array.isArray(this.embedding)) {
    this.embeddingDimensions = this.embedding.length;
  }

  if (Array.isArray(this.resolutionEmbedding)) {
    this.resolutionEmbeddingDimensions = this.resolutionEmbedding.length;
  }
});

module.exports = mongoose.model('Issue', issueSchema);
