import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  receiptNumber: { type: String, required: true, unique: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['Cash', 'Card', 'Mobile Payment'], required: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchName: { type: String, enum: ['Main', 'Otona'], default: 'Main', required: true, index: true },
  paidAt: { type: Date, required: true, index: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastModifiedAt: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['Completed', 'Modified', 'Cancelled'], default: 'Completed', index: true }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
  versionKey: false
});

schema.index({ patient: 1, paidAt: -1 });
schema.index({ branchName: 1, paidAt: -1 });

export default mongoose.model('Payment', schema);
