import mongoose from 'mongoose';

const payrollSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  calendarType: {
    type: String,
    enum: ['Ethiopian', 'Gregorian'],
    default: 'Ethiopian'
  },
  salaryDay: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
    default: 30
  },
  salaryFrequency: {
    type: String,
    enum: ['Monthly', 'Bi-weekly', 'Weekly'],
    default: 'Monthly'
  },
  currency: {
    type: String,
    default: 'ETB',
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('PayrollSettings', payrollSettingsSchema);
