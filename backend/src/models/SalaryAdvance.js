import mongoose from 'mongoose';

const salaryAdvanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Advance amount must be greater than zero']
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  reason: {
    type: String,
    trim: true,
    default: 'Salary advance'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Telebirr', 'CBE Birr', 'Other'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Approved', 'Deducted', 'Cancelled'],
    default: 'Approved',
    index: true
  },
  payroll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll',
    default: null
  },
  salaryPeriod: {
    type: String,
    trim: true,
    default: ''
  },
  recordedBy: {
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

export default mongoose.model('SalaryAdvance', salaryAdvanceSchema);
