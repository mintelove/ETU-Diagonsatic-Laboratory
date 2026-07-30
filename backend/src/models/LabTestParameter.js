import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    parameterName: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    subcategory: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },
    referenceValue: { type: String, trim: true, default: '' },
    normalMin: { type: Number, default: null },
    normalMax: { type: Number, default: null },
    displayOrder: { type: Number, default: 0, index: true },
    editable: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true }
  },
  { timestamps: true, versionKey: false }
);

schema.index({ category: 1, displayOrder: 1 });
schema.index({ parameterName: 1, category: 1 });

export default mongoose.model('LabTestParameter', schema);
