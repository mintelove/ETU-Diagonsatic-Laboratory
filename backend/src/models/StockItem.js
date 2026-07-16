import mongoose from 'mongoose';
const stockItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true, maxlength: 120 }, itemCode: { type: String, required: true, unique: true, immutable: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true }, description: { type: String, trim: true, maxlength: 500, default: '' },
  unit: { type: String, required: true, enum: ['Piece', 'Box', 'Pack', 'Bottle', 'Roll', 'Pair', 'Carton', 'Bag', 'Set'] }, purchasePrice: { type: Number, required: true, min: 0 },
  currentQuantity: { type: Number, required: true, min: 0 }, usedQuantity: { type: Number, required: true, min: 0, default: 0 }, minimumThreshold: { type: Number, required: true, min: 0 }, status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' }, versionKey: false });
stockItemSchema.index({ itemName: 'text', itemCode: 'text' }); stockItemSchema.index({ category: 1, createdDate: -1 });
stockItemSchema.virtual('remainingQuantity').get(function () { return this.currentQuantity - this.usedQuantity; });
stockItemSchema.set('toJSON', { virtuals: true });
export default mongoose.model('StockItem', stockItemSchema);
