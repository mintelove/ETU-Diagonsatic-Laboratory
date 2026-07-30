import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  parameterName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  subcategory: { type: String, default: '', trim: true },
  unit: { type: String, default: '', trim: true },
  referenceValue: { type: String, default: '', trim: true },
  normalMin: { type: Number, default: null },
  normalMax: { type: Number, default: null },
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
