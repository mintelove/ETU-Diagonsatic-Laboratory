import StockItem from '../models/StockItem.js';
import Category from '../models/Category.js';
import StockHistory from '../models/StockHistory.js';
import StockEditPermissionRequest from '../models/StockEditPermissionRequest.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { nextItemCode, notifyStockLevel, recordHistory } from '../services/stockService.js';
import { stockLevel } from '../constants/stock.js';
import { emit } from '../services/sseService.js';

const isRestrictedStockRole = (role) =>
  ['Reception', 'Receptionist', 'Sub Admin', 'sub_admin'].includes(role) ||
  (role && (role.toLowerCase().includes('reception') || role.toLowerCase().includes('sub admin') || role.toLowerCase().includes('sub_admin')));

const serialize = (item, currentUser = null) => {
  const data = item.toJSON ? item.toJSON() : item;
  let userEditedOn = data.receptionEditedOn;
  let userExtraEditGranted = data.receptionExtraEditGranted;

  if (currentUser && data.userEdits && Array.isArray(data.userEdits)) {
    const userEntry = data.userEdits.find((e) => String(e.user) === String(currentUser.id || currentUser._id));
    if (userEntry) {
      userEditedOn = userEntry.editedOn;
      userExtraEditGranted = userEntry.extraEditGranted;
    }
  }

  return {
    ...data,
    remainingQuantity: data.currentQuantity - data.usedQuantity,
    stockLevel: stockLevel(data),
    userEditedOn,
    userExtraEditGranted
  };
};

export async function listItems(req, res, next) {
  try {
    const { page = 1, limit = 15, search = '', category, status, level, sort = 'newest', dateFrom, dateTo } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$or = [{ itemName: { $regex: search, $options: 'i' } }, { itemCode: { $regex: search, $options: 'i' } }];
    if (dateFrom || dateTo) {
      filter.createdDate = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { $lte: new Date(`${dateTo}T23:59:59.999Z`) } : {})
      };
    }
    const sortMap = {
      newest: { createdDate: -1 },
      oldest: { createdDate: 1 },
      name: { itemName: 1 },
      category: { category: 1 },
      remaining: { currentQuantity: 1 },
      price: { purchasePrice: 1 }
    };
    let items = await StockItem.find(filter)
      .populate('category', 'name status')
      .sort(sortMap[sort] || sortMap.newest)
      .skip((Math.max(1, +page) - 1) * Math.min(100, +limit))
      .limit(Math.min(100, +limit));

    if (level) items = items.filter((item) => serialize(item, req.user).stockLevel.key === level);
    const total = await StockItem.countDocuments(filter);

    res.json({
      items: items.map((item) => serialize(item, req.user)),
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / Math.min(100, +limit))
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function getItem(req, res, next) {
  try {
    const item = await StockItem.findById(req.params.id).populate('category', 'name status');
    if (!item) throw new AppError('Stock item not found.', 404);
    res.json({ item: serialize(item, req.user) });
  } catch (e) {
    next(e);
  }
}

export async function createItem(req, res, next) {
  try {
    if (!(await Category.exists({ _id: req.body.category, status: 'Active' }))) throw new AppError('Select an active category.', 422);
    const item = await StockItem.create({ ...req.body, itemCode: await nextItemCode() });
    await recordHistory({ item, action: 'Created', user: req.user.id, snapshot: serialize(item, req.user), reason: 'Stock item created' });
    await notifyStockLevel(item);
    emit('stock:change', { action: 'created' });
    res.status(201).json({ item: serialize(item, req.user) });
  } catch (e) {
    next(e);
  }
}

async function assertStockEditPermission(item, user) {
  if (!isRestrictedStockRole(user.role)) return '';
  const now = new Date();

  let lastEditDate = null;
  let extraEditGranted = false;
  if (item.userEdits && Array.isArray(item.userEdits)) {
    const entry = item.userEdits.find((e) => String(e.user) === String(user.id || user._id));
    if (entry) {
      lastEditDate = entry.editedOn;
      extraEditGranted = entry.extraEditGranted;
    }
  }
  if (!lastEditDate && item.receptionEditedOn && (user.role === 'Reception' || user.role === 'Receptionist')) {
    lastEditDate = item.receptionEditedOn;
    extraEditGranted = item.receptionExtraEditGranted;
  }

  const isLocked24h = lastEditDate && (now.getTime() - new Date(lastEditDate).getTime() < 24 * 60 * 60 * 1000);

  if (isLocked24h) {
    const ExtraStockRequest = (await import('../models/ExtraStockRequest.js')).default;
    const activeApproval = await ExtraStockRequest.findOne({
      item: item._id,
      requestedBy: user.id,
      requestType: 'Stock Edit',
      status: 'Approved'
    });

    if (!activeApproval && !extraEditGranted) {
      const lastRequest = await ExtraStockRequest.findOne({
        item: item._id,
        requestedBy: user.id,
        requestType: 'Stock Edit'
      }).sort({ createdDate: -1 });

      if (lastRequest?.status === 'Pending') {
        throw new AppError('Your request to edit this item is waiting for Admin approval.', 409);
      } else if (lastRequest?.status === 'Rejected') {
        const reasonStr = lastRequest.comments ? ` Reason: ${lastRequest.comments}` : '';
        throw new AppError(`Your request to edit ${item.itemName} was rejected by the Admin.${reasonStr}`, 409);
      } else {
        throw new AppError(`You have already edited ${item.itemName} within the last 24 hours. Administrator approval is required before another modification can be made.`, 409);
      }
    }

    if (activeApproval) {
      activeApproval.status = 'Completed';
      activeApproval.reviewedAt = now;
      await activeApproval.save();
    }

    if (!item.userEdits) item.userEdits = [];
    const idx = item.userEdits.findIndex((e) => String(e.user) === String(user.id || user._id));
    if (idx >= 0) {
      item.userEdits[idx].editedOn = now;
      item.userEdits[idx].extraEditGranted = false;
    } else {
      item.userEdits.push({ user: user.id, editedOn: now, extraEditGranted: false });
    }
    item.receptionEditedOn = now;
    item.receptionExtraEditGranted = false;

    return activeApproval ? ` (Admin Approved Request #${activeApproval.requestNumber})` : ' (Admin Approved)';
  }

  if (!item.userEdits) item.userEdits = [];
  const idx = item.userEdits.findIndex((e) => String(e.user) === String(user.id || user._id));
  if (idx >= 0) {
    item.userEdits[idx].editedOn = now;
    item.userEdits[idx].extraEditGranted = false;
  } else {
    item.userEdits.push({ user: user.id, editedOn: now, extraEditGranted: false });
  }
  item.receptionEditedOn = now;
  item.receptionExtraEditGranted = false;

  return '';
}

export async function updateItem(req, res, next) {
  try {
    if (!(await Category.exists({ _id: req.body.category }))) throw new AppError('Category not found.', 422);
    const before = await StockItem.findById(req.params.id);
    if (!before) throw new AppError('Stock item not found.', 404);
    const approvalNote = await assertStockEditPermission(before, req.user);
    delete req.body.receptionEditedOn;
    delete req.body.receptionExtraEditGranted;
    delete req.body.userEdits;
    Object.assign(before, req.body);
    const item = await before.save();
    await recordHistory({
      item,
      action: 'Updated',
      user: req.user.id,
      snapshot: { before: serialize(before, req.user), after: serialize(item, req.user) },
      reason: `Item details updated${approvalNote}`
    });
    await notifyStockLevel(item);
    emit('stock:change', { action: 'updated' });
    res.json({ item: serialize(item, req.user) });
  } catch (e) {
    next(e);
  }
}

export async function updateQuantity(req, res, next) {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) throw new AppError('Stock item not found.', 404);
    const approvalNote = await assertStockEditPermission(item, req.user);
    const previous = item.currentQuantity - item.usedQuantity;
    item.currentQuantity += req.body.addQuantity;
    await item.save();
    const current = item.currentQuantity - item.usedQuantity;
    await recordHistory({
      item,
      action: 'Quantity Changed',
      user: req.user.id,
      previousQuantity: previous,
      newQuantity: current,
      reason: `${req.body.reason || 'Quantity updated'}${approvalNote}`,
      field: 'remainingQuantity'
    });
    await notifyStockLevel(item);
    emit('stock:change', { action: 'quantity' });
    res.json({ item: serialize(item, req.user) });
  } catch (e) {
    next(e);
  }
}

export async function createEditRequest(req, res, next) {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) throw new AppError('Stock item not found.', 404);
    const ExtraStockRequest = (await import('../models/ExtraStockRequest.js')).default;
    const existing = await ExtraStockRequest.exists({
      item: item.id,
      requestedBy: req.user.id,
      status: 'Pending',
      requestType: 'Stock Edit'
    });
    if (existing) throw new AppError('A permission request for this stock item is already pending.', 409);

    const requestNumber = `SE-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    const currentQuantity = item.currentQuantity - item.usedQuantity;
    const roleLabel = req.user.role === 'Sub Admin' ? 'Sub Admin' : 'Receptionist';

    const request = await ExtraStockRequest.create({
      requestNumber,
      requestType: 'Stock Edit',
      item: item.id,
      quantity: req.body.requestedQuantity ? Number(req.body.requestedQuantity) : 0,
      currentQuantity,
      requestedEdit: req.body.requestedEdit || (req.body.requestedQuantity ? `Set quantity to ${req.body.requestedQuantity}` : 'Modify stock item details'),
      reason: req.body.reason || `${roleLabel} stock edit permission requested`,
      requestedBy: req.user.id,
      status: 'Pending'
    });

    const admins = await User.find({ role: 'Admin', status: 'Active' }).select('_id');
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          recipient: admin.id,
          type: 'Critical Laboratory Message',
          message: `${roleLabel} ${req.user.fullName} requested stock edit approval for ${item.itemName}.`,
          entity: request.id,
          entityType: 'ExtraStockRequest'
        }))
      );
    }

    emit('extraRequests:change', { action: 'created' });
    emit('notifications:change', { action: 'new' });
    res.status(201).json({ request, message: 'Stock edit approval request sent to Admin.' });
  } catch (e) {
    next(e);
  }
}

export async function listEditRequests(req, res, next) {
  try {
    const requests = await StockEditPermissionRequest.find()
      .populate('stockItem', 'itemName itemCode currentQuantity usedQuantity')
      .populate('requestedBy', 'fullName')
      .populate('reviewedBy', 'fullName')
      .sort({ createdDate: -1 });
    res.json({ requests });
  } catch (e) {
    next(e);
  }
}

export async function reviewEditRequest(req, res, next) {
  try {
    const request = await StockEditPermissionRequest.findById(req.params.id);
    if (!request) throw new AppError('Stock edit permission request not found.', 404);
    if (request.status !== 'Pending') throw new AppError('This request has already been reviewed.', 409);
    request.status = req.body.decision === 'Approve' ? 'Approved' : 'Rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();
    if (request.status === 'Approved') await StockItem.findByIdAndUpdate(request.stockItem, { receptionExtraEditGranted: true });
    await Notification.create({
      recipient: request.requestedBy,
      type: 'Reception Stock Edit Request',
      message: `Your additional edit request was ${request.status.toLowerCase()}.`,
      entity: request.id,
      entityType: 'StockEditPermissionRequest',
      item: request.stockItem
    });
    emit('notifications:change', { action: 'new' });
    res.json({ request });
  } catch (e) {
    next(e);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) throw new AppError('Stock item not found.', 404);
    await recordHistory({ item, action: 'Deleted', user: req.user.id, snapshot: serialize(item, req.user), reason: 'Stock item deleted' });
    await item.deleteOne();
    emit('stock:change', { action: 'deleted' });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function itemHistory(req, res, next) {
  try {
    const history = await StockHistory.find({ item: req.params.id }).populate('user', 'fullName username branchName role').sort({ createdDate: -1 });
    res.json({ history });
  } catch (e) {
    next(e);
  }
}

export async function manualDeduct(req, res, next) {
  try {
    const { patientId, patientCode, deductions, testNames } = req.body;
    if (!Array.isArray(deductions) || deductions.length === 0) {
      throw new AppError('No stock deductions specified.', 422);
    }
    const updatedItems = [];
    for (const d of deductions) {
      const item = await StockItem.findById(d.item);
      if (!item) continue;
      const qty = Number(d.quantityDeducted) || 0;
      if (qty <= 0) continue;
      const before = item.currentQuantity - item.usedQuantity;
      item.usedQuantity += qty;
      await item.save();
      const after = item.currentQuantity - item.usedQuantity;
      const deductionTestName = d.testName || (Array.isArray(testNames) && testNames.length === 1 ? testNames[0] : '');
      await recordHistory({
        item: item.id,
        action: 'Manual Deduction',
        user: req.user.id,
        patient: patientId,
        patientId: patientCode || '',
        testName: deductionTestName,
        orderedTests: d.testName ? [d.testName] : testNames || [],
        previousQuantity: before,
        quantityDeducted: qty,
        newQuantity: after,
        reason: 'Manual stock update after patient registration.',
        field: 'remainingQuantity'
      });
      await notifyStockLevel(item);
      updatedItems.push(serialize(item, req.user));
    }
    emit('stock:change', { action: 'quantity' });
    res.json({ message: 'Manual stock deduction completed successfully.', items: updatedItems });
  } catch (e) {
    next(e);
  }
}

export async function summary(req, res, next) {
  try {
    const items = await StockItem.find({ status: 'Active' });
    const tally = { totalItems: items.length, healthy: 0, low: 0, critical: 0, outOfStock: 0 };
    const criticalItems = [];
    for (const item of items) {
      const level = stockLevel(item);
      if (level.key === 'Healthy') tally.healthy++;
      else if (level.key === 'Out of Stock') tally.outOfStock++;
      else if (['Critical', 'Critical Emergency'].includes(level.key)) {
        tally.critical++;
        criticalItems.push(serialize(item, req.user));
      } else tally.low++;
    }
    res.json({ totalCategories: await Category.countDocuments(), ...tally, criticalItems });
  } catch (e) {
    next(e);
  }
}


