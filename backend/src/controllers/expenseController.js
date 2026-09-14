import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import StockItem from '../models/StockItem.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';
import { emit } from '../services/sseService.js';

/**
 * Generate default receipt number if not provided
 */
function generateReceiptNumber() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${datePart}-${rand}`;
}

/**
 * Helper to determine branch for current request
 */
function resolveBranch(user, requestedBranch) {
  if (user.role === ROLES.ADMIN || user.role === ROLES.SUB_ADMIN || user.branchName === 'All') {
    return requestedBranch || (user.branchName !== 'All' ? user.branchName : 'Main');
  }
  return user.branchName || 'Main';
}

/**
 * Create a new expense record
 */
export async function createExpense(req, res, next) {
  try {
    const {
      title,
      expenseName,
      category,
      amount,
      date,
      description,
      receiptNumber,
      paymentMethod,
      branchName: requestedBranch,
      stockItem,
      stockItemName,
      stockQuantity,
      stockUnitPrice,
      type
    } = req.body;

    // Reject Receptionist attempting to record stock purchased expenses
    if (
      req.user.role === ROLES.RECEPTION &&
      (category === 'Stock purchased expenses' || category === 'Stock Expenses' || type === 'STOCK_PURCHASE')
    ) {
      throw new AppError('Receptionists are not authorized to record stock purchase expenses.', 403);
    }

    const branchName = resolveBranch(req.user, requestedBranch);
    const finalReceiptNumber = receiptNumber?.trim() || generateReceiptNumber();

    const isStock = category === 'Stock purchased expenses' || category === 'Stock Expenses' || type === 'STOCK_PURCHASE';
    let resolvedStockItemName = stockItemName?.trim() || '';
    let resolvedStockItem = stockItem || null;
    let resolvedStockQuantity = stockQuantity != null ? Number(stockQuantity) : null;
    let resolvedStockUnitPrice = stockUnitPrice != null ? Number(stockUnitPrice) : null;

    if (isStock && resolvedStockItem && !resolvedStockItemName) {
      const itemDoc = await StockItem.findById(resolvedStockItem);
      if (itemDoc) {
        resolvedStockItemName = itemDoc.itemName;
        if (resolvedStockUnitPrice == null && itemDoc.purchasePrice != null) {
          resolvedStockUnitPrice = itemDoc.purchasePrice;
        }
      }
    }

    let calculatedAmount = amount;
    if (isStock && resolvedStockQuantity != null && resolvedStockUnitPrice != null) {
      calculatedAmount = resolvedStockQuantity * resolvedStockUnitPrice;
    }

    // Determine final title
    let finalTitle = (expenseName || title || '').trim();
    if (!finalTitle) {
      if (isStock) {
        finalTitle = resolvedStockItemName ? `Stock Purchase: ${resolvedStockItemName}` : 'Stock purchased expenses';
      } else if (category === 'Transportation' || category === 'Transport') {
        finalTitle = 'Transportation';
      } else if (category === 'Printer Paper' || category === 'Paper Purchase') {
        finalTitle = 'Printer Paper';
      } else {
        finalTitle = category || 'Expense';
      }
    }

    const expense = await Expense.create({
      title: finalTitle,
      category,
      amount: calculatedAmount,
      date: date ? new Date(date) : new Date(),
      description: description || (category === 'Other Expenses' && expenseName ? expenseName : (isStock && resolvedStockItemName ? `Stock purchase for ${resolvedStockItemName}` : '')),
      receiptNumber: finalReceiptNumber,
      paymentMethod: paymentMethod || 'Cash',
      recordedBy: req.user.id || req.user._id,
      branchName,
      status: 'Active',
      type: isStock ? 'STOCK_PURCHASE' : (type || 'MANUAL'),
      stockItem: resolvedStockItem,
      stockItemName: resolvedStockItemName,
      stockQuantity: resolvedStockQuantity,
      stockUnitPrice: resolvedStockUnitPrice
    });

    const populated = await Expense.findById(expense._id)
      .populate('recordedBy', 'fullName username role');

    emit('expense:change', { action: 'created', expenseId: expense._id });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: populated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List expenses with pagination and filtering
 */
export async function listExpenses(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category,
      paymentMethod,
      status,
      branchName,
      recordedBy,
      expenseSource,
      dateFrom,
      dateTo,
      sort = 'newest'
    } = req.query;

    const filter = {};

    // Branch scoping
    if (req.user.role === ROLES.RECEPTION && req.user.branchName && req.user.branchName !== 'All') {
      filter.branchName = req.user.branchName;
    } else if (branchName && branchName !== 'All') {
      filter.branchName = branchName;
    }

    // Role scoping & Admin source filter
    if (req.user.role === ROLES.RECEPTION) {
      filter.recordedBy = req.user.id || req.user._id;
      filter.category = { $nin: ['Stock purchased expenses', 'Stock Expenses'] };
      filter.type = { $ne: 'STOCK_PURCHASE' };
    } else {
      if (expenseSource === 'Receptionist expenses' || expenseSource === 'Receptionist') {
        const receptionUsers = await User.find({ role: ROLES.RECEPTION }).select('_id');
        filter.recordedBy = { $in: receptionUsers.map((u) => u._id) };
        filter.category = { $nin: ['Stock purchased expenses', 'Stock Expenses'] };
        filter.type = { $ne: 'STOCK_PURCHASE' };
      } else if (expenseSource === 'Admin expenses' || expenseSource === 'Admin') {
        const adminUsers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.SUB_ADMIN] } }).select('_id');
        const aIds = adminUsers.map((u) => u._id);
        filter.$or = [
          { recordedBy: { $in: aIds } },
          { category: { $in: ['Stock purchased expenses', 'Stock Expenses'] } },
          { type: 'STOCK_PURCHASE' }
        ];
      }
    }

    // Category filter with historical compatibility mapping
    if (category && category !== 'All') {
      if (category === 'Printer Paper' || category === 'Paper Purchase') {
        filter.category = { $in: ['Printer Paper', 'Paper Purchase'] };
      } else if (category === 'Transportation' || category === 'Transport') {
        filter.category = { $in: ['Transportation', 'Transport'] };
      } else if (category === 'Stock purchased expenses' || category === 'Stock Expenses') {
        filter.category = { $in: ['Stock purchased expenses', 'Stock Expenses'] };
      } else if (category === 'Other Expenses') {
        filter.category = {
          $nin: ['Printer Paper', 'Paper Purchase', 'Transportation', 'Transport', 'Stock Expenses', 'Stock purchased expenses']
        };
      } else {
        filter.category = category;
      }
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'All') {
      filter.paymentMethod = paymentMethod;
    }

    // Status filter (Active / Voided)
    if (status && status !== 'All') {
      filter.status = status;
    }

    // User filter (only if Admin provided explicit user filter and not overridden by Receptionist scoping)
    if (req.user.role !== ROLES.RECEPTION && recordedBy && recordedBy !== 'All') {
      filter.recordedBy = recordedBy;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        filter.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        filter.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    // Search filter (title, receiptNumber, description)
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { receiptNumber: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const sortMap = {
      newest: { date: -1, createdDate: -1 },
      oldest: { date: 1, createdDate: 1 },
      amount_desc: { amount: -1 },
      amount_asc: { amount: 1 },
      title: { title: 1 }
    };

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('recordedBy', 'fullName username role')
        .populate('voidedBy', 'fullName username')
        .sort(sortMap[sort] || sortMap.newest)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Expense.countDocuments(filter)
    ]);

    res.json({
      success: true,
      expenses,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single expense by ID
 */
export async function getExpense(req, res, next) {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('recordedBy', 'fullName username role')
      .populate('voidedBy', 'fullName username');

    if (!expense) {
      throw new AppError('Expense not found.', 404);
    }

    if (
      req.user.role === ROLES.RECEPTION &&
      (String(expense.recordedBy?._id || expense.recordedBy) !== String(req.user.id || req.user._id) ||
        expense.category === 'Stock purchased expenses' ||
        expense.category === 'Stock Expenses' ||
        expense.type === 'STOCK_PURCHASE' ||
        (req.user.branchName && req.user.branchName !== 'All' && expense.branchName !== req.user.branchName))
    ) {
      throw new AppError('You do not have access to this expense.', 403);
    }

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update active expense
 */
export async function updateExpense(req, res, next) {
  try {
    if (req.user.role === ROLES.RECEPTION) {
      throw new AppError('Receptionists are not authorized to edit saved expenses.', 403);
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new AppError('Expense not found.', 404);
    }

    if (expense.status === 'Voided') {
      throw new AppError('Cannot update a voided expense.', 400);
    }

    if (
      req.user.role === ROLES.RECEPTION &&
      req.user.branchName &&
      req.user.branchName !== 'All' &&
      expense.branchName !== req.user.branchName
    ) {
      throw new AppError('You cannot edit expenses from another branch.', 403);
    }

    const allowedUpdates = [
      'title',
      'expenseName',
      'category',
      'amount',
      'date',
      'description',
      'receiptNumber',
      'paymentMethod'
    ];

    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUB_ADMIN) {
      allowedUpdates.push('branchName', 'stockItem', 'stockItemName', 'stockQuantity', 'stockUnitPrice');
    }

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'date') {
          expense.date = new Date(req.body.date);
        } else if (field === 'expenseName' || field === 'title') {
          expense.title = req.body[field] || expense.title;
        } else {
          expense[field] = req.body[field];
        }
      }
    });

    await expense.save();

    const updated = await Expense.findById(expense._id)
      .populate('recordedBy', 'fullName username role')
      .populate('voidedBy', 'fullName username');

    emit('expense:change', { action: 'updated', expenseId: expense._id });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Void an expense (soft delete with reason)
 */
export async function voidExpense(req, res, next) {
  try {
    if (req.user.role === ROLES.RECEPTION) {
      throw new AppError('Receptionists are not authorized to void expenses.', 403);
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new AppError('Expense not found.', 404);
    }

    if (expense.status === 'Voided') {
      throw new AppError('This expense is already voided.', 400);
    }

    if (
      req.user.role === ROLES.RECEPTION &&
      req.user.branchName &&
      req.user.branchName !== 'All' &&
      expense.branchName !== req.user.branchName
    ) {
      throw new AppError('You cannot void expenses from another branch.', 403);
    }

    expense.status = 'Voided';
    expense.voidedBy = req.user.id || req.user._id;
    expense.voidedAt = new Date();
    expense.voidReason = req.body.voidReason || 'No reason provided';

    await expense.save();

    const voided = await Expense.findById(expense._id)
      .populate('recordedBy', 'fullName username role')
      .populate('voidedBy', 'fullName username');

    emit('expense:change', { action: 'voided', expenseId: expense._id });

    res.json({
      success: true,
      message: 'Expense voided successfully',
      expense: voided
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Hard delete expense (Admin only)
 */
export async function deleteExpense(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUB_ADMIN) {
      throw new AppError('Only administrators are authorized to delete expenses.', 403);
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      throw new AppError('Expense not found.', 404);
    }

    await Expense.findByIdAndDelete(req.params.id);

    emit('expense:change', { action: 'deleted', expenseId: req.params.id });

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Expense aggregated summary for dashboard / metrics
 */
export async function expenseSummary(req, res, next) {
  try {
    const { dateFrom, dateTo, branchName, recordedBy, category, expenseSource } = req.query;
    const match = {};

    // Branch filter
    if (req.user.role === ROLES.RECEPTION && req.user.branchName && req.user.branchName !== 'All') {
      match.branchName = req.user.branchName;
    } else if (branchName && branchName !== 'All') {
      match.branchName = branchName;
    }

    // Role-based scoping & Admin expenseSource filter
    if (req.user.role === ROLES.RECEPTION) {
      match.recordedBy = new mongoose.Types.ObjectId(req.user.id || req.user._id);
      match.category = { $nin: ['Stock purchased expenses', 'Stock Expenses'] };
      match.type = { $ne: 'STOCK_PURCHASE' };
    } else {
      if (expenseSource === 'Receptionist expenses' || expenseSource === 'Receptionist') {
        const receptionUsers = await User.find({ role: ROLES.RECEPTION }).select('_id');
        match.recordedBy = { $in: receptionUsers.map((u) => u._id) };
        match.category = { $nin: ['Stock purchased expenses', 'Stock Expenses'] };
        match.type = { $ne: 'STOCK_PURCHASE' };
      } else if (expenseSource === 'Admin expenses' || expenseSource === 'Admin') {
        const adminUsers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.SUB_ADMIN] } }).select('_id');
        const aIds = adminUsers.map((u) => u._id);
        match.$or = [
          { recordedBy: { $in: aIds } },
          { category: { $in: ['Stock purchased expenses', 'Stock Expenses'] } },
          { type: 'STOCK_PURCHASE' }
        ];
      } else if (recordedBy && recordedBy !== 'All') {
        match.recordedBy = new mongoose.Types.ObjectId(recordedBy);
      }
    }

    // Category filter
    if (category && category !== 'All') {
      if (category === 'Printer Paper' || category === 'Paper Purchase') {
        match.category = { $in: ['Printer Paper', 'Paper Purchase'] };
      } else if (category === 'Transportation' || category === 'Transport') {
        match.category = { $in: ['Transportation', 'Transport'] };
      } else if (category === 'Stock purchased expenses' || category === 'Stock Expenses') {
        match.category = { $in: ['Stock purchased expenses', 'Stock Expenses'] };
      } else if (category === 'Other Expenses') {
        match.category = {
          $nin: ['Printer Paper', 'Paper Purchase', 'Transportation', 'Transport', 'Stock Expenses', 'Stock purchased expenses']
        };
      } else {
        match.category = category;
      }
    }

    // Date range
    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) match.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) match.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    // Stock items filter for fallback calculation
    const stockItemFilter = { status: 'Active' };
    if (dateFrom || dateTo) {
      stockItemFilter.createdDate = {};
      if (dateFrom) stockItemFilter.createdDate.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) stockItemFilter.createdDate.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    // Parallel aggregations
    const [overallStats, categoryStats, paymentMethodStats, dailyTrend, roleStats, stockItemStats] = await Promise.all([
      // Overall Active vs Voided
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Category breakdown (Active only)
      Expense.aggregate([
        { $match: { ...match, status: 'Active' } },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      // Payment method breakdown (Active only)
      Expense.aggregate([
        { $match: { ...match, status: 'Active' } },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      // Daily trend (Active only)
      Expense.aggregate([
        { $match: { ...match, status: 'Active' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // By recorder role (Reception vs Admin)
      Expense.aggregate([
        { $match: { ...match, status: 'Active' } },
        {
          $lookup: {
            from: 'users',
            localField: 'recordedBy',
            foreignField: '_id',
            as: 'recorder'
          }
        },
        {
          $project: {
            amount: 1,
            type: 1,
            category: 1,
            role: { $ifNull: [{ $arrayElemAt: ['$recorder.role', 0] }, 'Admin'] }
          }
        },
        {
          $group: {
            _id: '$role',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Stock purchases calculation from StockItem (fallback if no direct expense recorded)
      StockItem.aggregate([
        { $match: stockItemFilter },
        {
          $group: {
            _id: null,
            totalStockValue: { $sum: { $multiply: ['$purchasePrice', '$currentQuantity'] } }
          }
        }
      ])
    ]);

    let activeTotalAmount = 0;
    let activeTotalCount = 0;
    let voidedTotalAmount = 0;
    let voidedTotalCount = 0;

    overallStats.forEach((stat) => {
      if (stat._id === 'Active') {
        activeTotalAmount = stat.totalAmount;
        activeTotalCount = stat.count;
      } else if (stat._id === 'Voided') {
        voidedTotalAmount = stat.totalAmount;
        voidedTotalCount = stat.count;
      }
    });

    let receptionistExpenses = 0;
    let adminExpenses = 0;

    if (req.user.role === ROLES.RECEPTION) {
      receptionistExpenses = activeTotalAmount;
      adminExpenses = 0;
    } else {
      roleStats.forEach((r) => {
        if (r._id === 'Reception') {
          receptionistExpenses += r.totalAmount;
        } else {
          adminExpenses += r.totalAmount;
        }
      });
    }

    let transportationTotal = 0;
    let printerPaperTotal = 0;
    let otherExpensesTotal = 0;
    let stockExpensesTotal = 0;

    categoryStats.forEach((c) => {
      const cat = c._id;
      if (cat === 'Transportation' || cat === 'Transport') {
        transportationTotal += c.totalAmount;
      } else if (cat === 'Printer Paper' || cat === 'Paper Purchase') {
        printerPaperTotal += c.totalAmount;
      } else if (cat === 'Stock purchased expenses' || cat === 'Stock Expenses') {
        stockExpensesTotal += c.totalAmount;
      } else {
        otherExpensesTotal += c.totalAmount;
      }
    });

    const calculatedStockExpenses = req.user.role === ROLES.RECEPTION
      ? 0
      : (stockExpensesTotal > 0 ? stockExpensesTotal : (stockItemStats[0]?.totalStockValue || 0));

    const averageAmount = activeTotalCount > 0 ? activeTotalAmount / activeTotalCount : 0;
    const topCategory = categoryStats.length > 0 ? (
      categoryStats[0]._id === 'Paper Purchase' ? 'Printer Paper' :
      categoryStats[0]._id === 'Transport' ? 'Transportation' :
      categoryStats[0]._id
    ) : 'None';

    res.json({
      success: true,
      summary: {
        totalAmount: activeTotalAmount,
        totalCount: activeTotalCount,
        averageAmount,
        voidedAmount: voidedTotalAmount,
        voidedCount: voidedTotalCount,
        topCategory,
        receptionistExpenses,
        adminExpenses,
        transportationTotal,
        printerPaperTotal,
        otherExpensesTotal,
        stockExpensesTotal: calculatedStockExpenses,
        byCategory: categoryStats.map((c) => ({
          category: c._id === 'Paper Purchase' ? 'Printer Paper' : c._id === 'Transport' ? 'Transportation' : c._id,
          totalAmount: c.totalAmount,
          count: c.count
        })),
        byPaymentMethod: paymentMethodStats.map((p) => ({
          paymentMethod: p._id,
          totalAmount: p.totalAmount,
          count: p.count
        })),
        dailyTrend: dailyTrend.map((d) => ({
          date: d._id,
          totalAmount: d.totalAmount,
          count: d.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}
