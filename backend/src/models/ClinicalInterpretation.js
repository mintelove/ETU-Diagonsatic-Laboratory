import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  laboratoryTest: { type: mongoose.Schema.Types.ObjectId, ref: 'LaboratoryTest', default: null, index: true },
  laboratoryTestName: { type: String, required: true, trim: true, index: true },
  categoryName: { type: String, default: '', trim: true },
  title: { type: String, required: true, trim: true },
  interpretation: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  versionKey: false
});

schema.index({ laboratoryTestName: 1, active: 1 });
schema.index({ laboratoryTest: 1, active: 1 });

export default mongoose.model('ClinicalInterpretation', schema);
