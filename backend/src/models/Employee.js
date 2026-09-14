import mongoose from 'mongoose';

const salaryHistorySchema = new mongoose.Schema({
  salary: { type: Number, required: true, min: 0 },
  effectiveDate: { type: Date, default: Date.now },
  reason: { type: String, trim: true, default: 'Salary adjustment' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    sparse: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  age: {
    type: Number,
    required: true,
    min: 16,
    max: 100
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  jobType: {
    type: String,
    required: true,
    enum: ['Reception', 'Sample Collector', 'Approver', 'Cleaner', 'Security', 'Supervisor', 'Other'],
    default: 'Other'
  },
  customJobType: {
    type: String,
    trim: true,
    default: ''
  },
  branch: {
    type: String,
    enum: ['Main', 'Otona'],
    default: 'Main',
    required: true,
    index: true
  },
  recruitmentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  salary: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  salaryCurrency: {
    type: String,
    default: 'ETB',
    trim: true
  },
  salaryFrequency: {
    type: String,
    enum: ['Monthly', 'Weekly', 'Bi-weekly'],
    default: 'Monthly'
  },
  employmentStatus: {
    type: String,
    enum: ['Active', 'Inactive', 'Terminated', 'On Leave'],
    default: 'Active',
    index: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  salaryHistory: [salaryHistorySchema]
}, {
  timestamps: true,
  versionKey: false
});

// Virtual for display job title
employeeSchema.virtual('displayJobType').get(function () {
  return this.jobType === 'Other' && this.customJobType ? this.customJobType : this.jobType;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);
