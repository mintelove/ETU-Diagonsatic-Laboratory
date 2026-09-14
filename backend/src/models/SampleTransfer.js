import mongoose from 'mongoose';

const transferHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY', 'APPROVED', 'READY_TO_RETURN', 'COMPLETED', 'CANCELLED', 'CLEARED', 'RESTORED'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const sampleTransferSchema = new mongoose.Schema({
  transferId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  laboratoryTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LaboratoryTest',
    required: true,
    index: true
  },
  testName: {
    type: String,
    trim: true,
    default: ''
  },
  testCategory: {
    type: String,
    trim: true,
    default: ''
  },
  sourceBranch: {
    type: String,
    enum: ['Main', 'Otona'],
    required: true,
    index: true
  },
  destinationBranch: {
    type: String,
    enum: ['Main', 'Otona'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY', 'APPROVED', 'READY_TO_RETURN', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING_TRANSFER',
    index: true
  },
  priority: {
    type: String,
    enum: ['Routine', 'Urgent', 'Critical'],
    default: 'Routine'
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: {
    type: Date
  },
  investigationStartedAt: {
    type: Date
  },
  investigationCompletedAt: {
    type: Date
  },
  labReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabReport',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  returnMethod: {
    type: String,
    enum: ['DIRECT', 'APPROVAL', null],
    default: null
  },
  isCleared: {
    type: Boolean,
    default: false,
    index: true
  },
  clearedAt: {
    type: Date
  },
  clearedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clearedReason: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  transferHistory: [transferHistorySchema]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  versionKey: false
});

// Fast lookup for active transfers on a patient & test
sampleTransferSchema.index({ patient: 1, laboratoryTest: 1, status: 1 });
sampleTransferSchema.index({ destinationBranch: 1, isCleared: 1, status: 1, sentAt: -1 });
sampleTransferSchema.index({ sourceBranch: 1, status: 1, sentAt: -1 });

export default mongoose.model('SampleTransfer', sampleTransferSchema);
