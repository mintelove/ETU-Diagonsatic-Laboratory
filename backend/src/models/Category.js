import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, trim: true }, // Retained for backward compatibility
  categoryName: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  categoryCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' }, versionKey: false });

// Sync name with categoryName and auto-generate categoryCode if empty
categorySchema.pre('validate', function (next) {
  if (this.categoryName && !this.name) {
    this.name = this.categoryName;
  }
  if (this.name && !this.categoryName) {
    this.categoryName = this.name;
  }
  if (!this.categoryCode && this.categoryName) {
    const prefix = this.categoryName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    this.categoryCode = `CAT-${prefix || 'GEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

export default mongoose.model('Category', categorySchema);
