import mongoose from 'mongoose';

const advanceSnapshotSchema = new mongoose.Schema({
  advanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryAdvance' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  reason: { type: String, default: '' }
}, { _id: false });

const payrollSchema = new mongoose.Schema({
  payrollId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  employeeCode: {
    type: String,
    required: true,
    trim: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  jobType: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    enum: ['Main', 'Otona'],
    default: 'Main',
    required: true
  },
  salaryPeriod: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  periodKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  payrollYear: {
    type: Number,
    required: true,
    index: true
  },
  payrollMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  salaryDate: {
    type: Date,
    required: true
  },
  calendarType: {
    type: String,
    enum: ['Ethiopian', 'Gregorian'],
    default: 'Ethiopian'
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  totalAdvances: {
    type: Number,
    default: 0,
    min: 0
  },
  advances: [advanceSnapshotSchema],
  otherDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  grossSalary: {
    type: Number,
    required: true,
    min: 0
  },
  totalDeductions: {
    type: Number,
    required: true,
    min: 0
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Processed', 'Paid', 'Cancelled'],
    default: 'Processed',
    index: true
  },
  paymentMethod: {
    type: String,
    default: 'Cash'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  versionKey: false
});

// Strict duplicate payment prevention at MongoDB database layer
payrollSchema.index(
  { employee: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'Cancelled' } } }
);
payrollSchema.index({ payrollYear: 1, payrollMonth: 1 });

export default mongoose.model('Payroll', payrollSchema);
