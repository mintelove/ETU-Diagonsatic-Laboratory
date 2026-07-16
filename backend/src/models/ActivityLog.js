import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  action: { type: String, required: true, trim: true, maxlength: 120 },
  entityType: { type: String, required: true },
  entity: { type: mongoose.Schema.Types.ObjectId },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, trim: true, maxlength: 50 },
  ipAddress: { type: String, trim: true, maxlength: 64 },
  details: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: { createdAt: 'createdDate', updatedAt: false }, versionKey: false });

schema.index({ createdDate: -1, user: 1 });
schema.index({ user: 1, createdDate: -1 });
export default mongoose.model('ActivityLog', schema);
