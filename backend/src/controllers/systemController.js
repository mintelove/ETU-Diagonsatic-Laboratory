import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import Receipt from '../models/Receipt.js';
import CounsellingRecord from '../models/CounsellingRecord.js';
import LabReport from '../models/LabReport.js';
import ExtraStockRequest from '../models/ExtraStockRequest.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import StockItem from '../models/StockItem.js';
import SystemSetting from '../models/SystemSetting.js';
import { AppError } from '../utils/appError.js';

const choices = { stock:'Reset Stock Quantities Only', patients:'Delete Patient History', counselling:'Delete Counseling History', reports:'Delete Laboratory Report History', drafts:'Delete Sample Collector Draft Reports', extraRequests:'Delete Extra Stock Requests', approvalRequests:'Delete Report Approval Requests', transactions:'Delete Financial Transactions', notifications:'Delete Notification History' };
const clean = input => [...new Set((Array.isArray(input) ? input : []).filter(key => choices[key]))];

async function verify(user, password) {
  const User = (await import('../models/User.js')).default;
  const account = await User.findById(user.id).select('+password');
  if (!account || !await account.comparePassword(password || '')) throw new AppError('Admin password confirmation failed.', 403);
}

export async function getTheme(req, res, next) {
  try { const setting = await SystemSetting.findOne({ key:'theme' }).lean(); res.json({ theme:setting?.value || null }); } catch (error) { next(error); }
}

export async function setTheme(req, res, next) {
  try {
    const { scope, ...colors } = req.body;
    if (scope === 'me') {
      req.user.preferences = { ...(req.user.preferences?.toObject?.() || req.user.preferences || {}), customTheme:colors };
      await req.user.save();
      return res.json({ theme:colors, scope });
    }
    const setting = await SystemSetting.findOneAndUpdate({ key:'theme' }, { $set:{ value:colors, updatedBy:req.user.id } }, { new:true, upsert:true });
    res.json({ theme:setting.value, scope });
  } catch (error) { next(error); }
}

const countFor = key => {
  if (key === 'stock') return StockItem.countDocuments();
  if (key === 'drafts') return LabReport.countDocuments({ status:'Draft' });
  if (key === 'approvalRequests') return LabReport.countDocuments({ status:{ $in:['Submitted','Pending'] } });
  return ({ patients:Patient, counselling:CounsellingRecord, reports:LabReport, extraRequests:ExtraStockRequest, transactions:Payment, notifications:Notification }[key]).countDocuments();
};

export async function previewReset(req, res, next) {
  try {
    await verify(req.user, req.body.password);
    const selected = clean(req.body.selected);
    const items = await Promise.all(selected.map(async key => ({ key, label:choices[key], count:await countFor(key) })));
    res.json({ selected:items, total:items.reduce((sum, item) => sum + item.count, 0) });
  } catch (error) { next(error); }
}

export async function executeReset(req, res, next) {
  try {
    const selected = clean(req.body.selected);
    if (!selected.length) throw new AppError('Select at least one reset operation.', 422);
    if (req.body.phrase !== 'UNDERSTOOD AND CONTINUE RESETTING') throw new AppError('Type the confirmation phrase exactly.', 422);
    await verify(req.user, req.body.password);
    await verify(req.user, req.body.secondPassword);
    const results = [];
    for (const key of selected) {
      let deleted = 0;
      if (key === 'stock') deleted = (await StockItem.updateMany({}, { $set:{ usedQuantity:0 } })).modifiedCount;
      else if (key === 'patients') deleted = (await Patient.deleteMany({})).deletedCount;
      else if (key === 'counselling') deleted = (await CounsellingRecord.deleteMany({})).deletedCount;
      else if (key === 'reports') deleted = (await LabReport.deleteMany({})).deletedCount;
      else if (key === 'drafts') deleted = (await LabReport.deleteMany({ status:'Draft' })).deletedCount;
      else if (key === 'extraRequests') deleted = (await ExtraStockRequest.deleteMany({})).deletedCount;
      else if (key === 'approvalRequests') deleted = (await LabReport.deleteMany({ status:{ $in:['Submitted','Pending'] } })).deletedCount;
      else if (key === 'transactions') {
        const paymentIds = (await Payment.find({}, '_id').lean()).map(payment => payment._id);
        await Receipt.deleteMany({ payment:{ $in:paymentIds } });
        deleted = (await Payment.deleteMany({})).deletedCount;
      } else if (key === 'notifications') deleted = (await Notification.deleteMany({})).deletedCount;
      results.push({ key, label:choices[key], deleted });
    }
    const total = results.reduce((sum, item) => sum + item.deleted, 0);
    await ActivityLog.create({ action:'Database reset completed', entityType:'DatabaseReset', user:req.user.id, role:req.user.role, ipAddress:req.ip, details:JSON.stringify({ adminName:req.user.fullName, adminId:req.user.id, collectionsReset:selected, recordsDeleted:total }) });
    res.json({ message:'Database Reset Completed Successfully', results, total });
  } catch (error) { next(error); }
}
