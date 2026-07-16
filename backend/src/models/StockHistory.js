import mongoose from 'mongoose';
const historySchema = new mongoose.Schema({ item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true, index: true }, action: { type: String, enum: ['Created', 'Updated', 'Deleted', 'Quantity Changed'], required: true }, field: String, previousQuantity: Number, newQuantity: Number, reason: { type: String, trim: true, maxlength: 300 }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, snapshot: mongoose.Schema.Types.Mixed }, { timestamps: { createdAt: 'createdDate', updatedAt: false }, versionKey: false });
historySchema.index({ item: 1, createdDate: -1 });
export default mongoose.model('StockHistory', historySchema);
