import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, EXPENSE_STATUSES, EXPENSE_TYPES } from '../constants/expense.js';

const expenseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: EXPENSE_TYPES,
    default: 'MANUAL',
    index: true
  },
  stockTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockHistory',
    default: null,
    index: true
  },
  stockItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockItem',
    default: null
  },
  stockItemName: {
    type: String,
    trim: true,
    default: ''
  },
  stockQuantity: {
    type: Number,
    default: null
  },
  stockUnitPrice: {
    type: Number,
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: EXPENSE_CATEGORIES
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  receiptNumber: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: EXPENSE_PAYMENT_METHODS,
    default: 'Cash',
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  branchName: {
    type: String,
    enum: ['Main', 'Otona'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: EXPENSE_STATUSES,
    default: 'Active',
    index: true
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  voidedAt: {
    type: Date,
    default: null
  },
  voidReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
  versionKey: false
});

expenseSchema.index({ date: -1, branchName: 1 });
expenseSchema.index({ recordedBy: 1, date: -1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ status: 1, date: -1 });
expenseSchema.index({ stockTransactionId: 1 }, { sparse: true });

export default mongoose.model('Expense', expenseSchema);
