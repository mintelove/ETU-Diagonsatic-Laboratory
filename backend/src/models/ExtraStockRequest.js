import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true, index: true },
  requestType: { type: String, enum: ['Extra Stock', 'Stock Edit'], default: 'Extra Stock', index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false, index: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  quantity: { type: Number, required: true, default: 0 },
  currentQuantity: { type: Number, default: 0 },
  requestedEdit: { type: String, default: '' },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  priority: { type: String, enum: ['Routine', 'Urgent', 'Critical'], default: 'Routine' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Return for Correction', 'Completed'], default: 'Pending', index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: { type: String, trim: true, maxlength: 500, default: '' },
  reviewedAt: Date
}, { timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' }, versionKey: false });

schema.index({ status: 1, createdDate: -1 });

export default mongoose.model('ExtraStockRequest', schema);
