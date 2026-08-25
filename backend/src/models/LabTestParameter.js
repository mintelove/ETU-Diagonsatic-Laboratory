import mongoose from 'mongoose';

const demographicRangeSchema = new mongoose.Schema({
  demographic: { type: String, default: 'General', trim: true },
  gender: { type: String, enum: ['All', 'Male', 'Female'], default: 'All' },
  ageMin: { type: Number, default: null },
  ageMax: { type: Number, default: null },
  normalMin: { type: Number, default: null },
  normalMax: { type: Number, default: null },
  criticalLow: { type: Number, default: null },
  criticalHigh: { type: Number, default: null },
  referenceValue: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true }
}, { _id: false });

const auditHistorySchema = new mongoose.Schema({
  changedBy: { type: String, default: 'Admin', trim: true },
  changedAt: { type: Date, default: Date.now },
  previousValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  newValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  reason: { type: String, default: '', trim: true }
}, { _id: false });

const schema = new mongoose.Schema({
  parameterName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  subcategory: { type: String, default: '', trim: true },
  unit: { type: String, default: '', trim: true },
  referenceValue: { type: String, default: '', trim: true },
  normalMin: { type: Number, default: null },
  normalMax: { type: Number, default: null },
  criticalLow: { type: Number, default: null },
  criticalHigh: { type: Number, default: null },
  methodOrAnalyzer: { type: String, default: '', trim: true },
  analyzerTestCode: { type: String, default: '', trim: true },
  specimenType: { type: String, default: '', trim: true },
  resultType: { type: String, default: 'Numeric', trim: true },
  cutoffType: { type: String, default: 'Two-sided', trim: true },
  referenceSource: { type: String, default: '', trim: true },
  verificationStatus: { type: String, enum: ['Verified', 'Requires Laboratory Verification'], default: 'Requires Laboratory Verification' },
  verifiedBy: { type: String, default: '', trim: true },
  verifiedAt: { type: Date, default: null },
  notes: { type: String, default: '', trim: true },
  demographicRanges: [demographicRangeSchema],
  auditHistory: [auditHistorySchema],
  displayOrder: { type: Number, default: 0 },
  editable: { type: Boolean, default: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, {
  timestamps: true,
  versionKey: false
});

schema.index({ category: 1, subcategory: 1, displayOrder: 1 });
schema.index({ parameterName: 1, category: 1 });

export default mongoose.model('LabTestParameter', schema);

