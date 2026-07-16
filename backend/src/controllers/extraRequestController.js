import mongoose from 'mongoose';
import ExtraStockRequest from '../models/ExtraStockRequest.js';
import StockItem from '../models/StockItem.js';
import StockHistory from '../models/StockHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { notifyStockLevel } from '../services/stockService.js';
import { recordActivity } from '../services/activityService.js';

async function alertUsers(roles, message, entity) {
  const users = await User.find({ role: { $in: roles }, status: 'Active' }).select('_id');
  if (users.length) await Notification.insertMany(users.map(user => ({ recipient: user._id, type: 'Critical Laboratory Message', message, entity, entityType: 'ExtraStockRequest' })));
}

export async function listRequests(req, res, next) {
  try {
    const filter = req.user.role === 'Sample Collector' ? { requestedBy: req.user.id } : {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await ExtraStockRequest.find(filter).populate('patient', 'patientId name').populate('item', 'itemName itemCode unit').populate('requestedBy', 'fullName').populate('reviewedBy', 'fullName').sort({ createdDate: -1 }).limit(200);
    res.json({ requests });
  } catch (error) { next(error); }
}

export async function reviewRequest(req, res, next) {
  const session = await mongoose.startSession();
  let changedItem;
  try {
    const decision = req.body.status;
    if (!['Approved', 'Rejected'].includes(decision)) throw new AppError('Choose Approved or Rejected.', 422);
    await session.withTransaction(async () => {
      const request = await ExtraStockRequest.findById(req.params.id).session(session);
      if (!request) throw new AppError('Extra request not found.', 404);
      if (request.status !== 'Pending') throw new AppError('This request has already been reviewed.', 422);
      request.status = decision;
      request.comments = req.body.comments || '';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      if (decision === 'Approved') {
        const item = await StockItem.findById(request.item).session(session);
        if (!item || item.status !== 'Active' || item.currentQuantity - item.usedQuantity < request.quantity) throw new AppError('Insufficient available stock to approve this request.', 422);
        const previousQuantity = item.currentQuantity - item.usedQuantity;
        item.usedQuantity += request.quantity;
        await item.save({ session });
        await StockHistory.create([{ item: item.id, action: 'Quantity Changed', user: req.user.id, previousQuantity, newQuantity: item.currentQuantity - item.usedQuantity, reason: `Approved extra request ${request.requestNumber}`, field: 'remainingQuantity' }], { session });
        changedItem = item;
      }
      await request.save({ session });
      await alertUsers(['Sample Collector'], `Extra request ${request.requestNumber} was ${decision.toLowerCase()}.`, request.id);
    });
    if (changedItem) await notifyStockLevel(changedItem);
    await recordActivity(req.user.id, `Extra stock request ${decision.toLowerCase()}`, 'ExtraStockRequest', req.params.id, decision, { role: req.user.role, ipAddress: req.ip });
    res.json({ message: `Request ${decision.toLowerCase()}.` });
  } catch (error) { next(error); } finally { await session.endSession(); }
}
