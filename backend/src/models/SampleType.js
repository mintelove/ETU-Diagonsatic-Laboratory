/**
 * ETU Diagnostic Laboratory — SampleType Model (Enhanced)
 *
 * Stores laboratory sample/test types with pricing, categorisation,
 * auto-generated sample codes, and audit fields.
 */

import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 120,
    },
    sampleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    category: {
      type: String,
      enum: ['Blood', 'Urine', 'Stool', 'Body Fluid', 'Other'],
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Legacy field — kept for backward compatibility
    available: {
      type: Boolean,
      default: true,
    },
    estimatedProcessingTime: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
    versionKey: false,
  }
);

// Text index for search
schema.index({ name: 'text', sampleCode: 'text', description: 'text' });
schema.index({ available: 1, name: 1 });

export default mongoose.model('SampleType', schema);
