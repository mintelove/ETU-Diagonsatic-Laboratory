import LabReport from '../models/LabReport.js';
import SampleCollection from '../models/SampleCollection.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import {AppError} from '../utils/appError.js';
import {recordActivity} from '../services/activityService.js';
import {emit} from '../services/sseService.js';
async function notify(role,message,entity){const users=await User.find({role,status:'Active'}).select('_id');if(users.length)await Notification.insertMany(users.map(u=>({recipient:u._id,type:'New Approved Report',message,entity,entityType:'LabReport'})));}
export async function pending(req, res, next) {
  try {
    const isCrossBranch = req.user.role === 'Admin' || req.user.isCEO || req.user.branchName === 'All' || (req.user.allowedBranches && req.user.allowedBranches.length > 1);
    const branch = !isCrossBranch ? (req.user.branchName || 'Main') : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);
    const filter = { status: { $in: ['Pending', 'Submitted'] } };
    if (branch) filter.branchName = branch;
    const reports = await LabReport.find(filter).populate({
      path: 'patient',
      select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',
      populate: [{ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } }, { path: 'sampleTypes', select: 'name' }]
    }).populate({
      path: 'laboratoryTests',
      select: 'name category subcategory',
      populate: { path: 'category', select: 'name' }
    }).populate('technician', 'fullName').sort({ submittedDate: -1, updatedDate: -1 });
    res.json({ reports });
  } catch (e) {
    next(e);
  }
}

export async function decide(req, res, next) {
  try {
    const report = await LabReport.findById(req.params.id).populate({
      path: 'patient',
      select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',
      populate: [{ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } }, { path: 'sampleTypes', select: 'name' }]
    }).populate('technician', 'fullName');

    if (!report) throw new AppError('Report not found.', 404);
    const isCrossBranch = req.user.role === 'Admin' || req.user.isCEO || req.user.branchName === 'All' || (req.user.allowedBranches && req.user.allowedBranches.length > 1) || (req.user.allowedBranches && req.user.allowedBranches.includes(report.branchName));
    if (!isCrossBranch && report.branchName !== (req.user.branchName || 'Main')) {
      throw new AppError('Report not found.', 404);
    }
    if (!['Pending', 'Submitted'].includes(report.status)) throw new AppError('This report has already been decided.', 422);

    const approved = req.body.status === 'Approved';
    const reason = req.body.comments?.trim();
    if (!approved && !reason) throw new AppError('A reason for rejection is required.', 422);

    const decidedAt = new Date();
    report.status = approved ? 'Approved' : 'Rejected';
    report.approvalStatus = approved ? 'Approved' : 'Rejected';

    if (approved) {
      report.approvedBy = req.user.id;
      report.approvedDate = decidedAt;
      report.approvalDate = decidedAt;
      report.approvalTime = decidedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      report.rejectedBy = undefined;
      report.rejectedDate = undefined;
      report.rejectionReason = '';
      await notify('Reception', `Approved laboratory report ${report.reportNumber || report.id} is ready for printing.`, report.id);
      const collector = await User.findById(report.technician);
      if (collector) await Notification.create({ recipient: collector.id, type: 'New Approved Report', message: `Laboratory report ${report.reportNumber || report.id} has been approved.`, entity: report.id, entityType: 'LabReport' });
    } else {
      report.rejectedBy = req.user.id;
      report.rejectedDate = decidedAt;
      report.rejectionReason = reason;
      await SampleCollection.findByIdAndUpdate(report.collection, { status: 'Queued' });
      const collector = await User.findById(report.technician);
      if (collector) await Notification.create({ recipient: collector.id, type: 'Critical Laboratory Message', message: `Laboratory report ${report.reportNumber || report.id} was rejected. Reason: ${reason}`, entity: report.id, entityType: 'LabReport' });
    }

    try {
      const labSettings = await LaboratorySettings.findOne({ key: 'default' }).lean();
      if (labSettings?.publicReportSharing?.enabled !== false && labSettings?.publicReportSharing?.autoGenerateOnApproval !== false) {
        report.generatePublicToken(labSettings?.publicReportSharing?.defaultExpiryDays || 30);
      }
    } catch (pErr) {
      console.error('Public token generation skipped:', pErr.message);
    }

    await report.save();
    await recordActivity(req.user.id, approved ? 'Approved laboratory report' : 'Rejected laboratory report', 'LabReport', report.id, reason || '', { role: req.user.role, ipAddress: req.ip });
    emit('reports:change', { action: approved ? 'approved' : 'rejected' });
    emit('notifications:change', { action: 'new' });
    res.json({ report });
  } catch (e) {
    next(e);
  }
}

export async function history(req, res, next) {
  try {
    const isCrossBranch = req.user.role === 'Admin' || req.user.isCEO || req.user.branchName === 'All' || (req.user.allowedBranches && req.user.allowedBranches.length > 1);
    const branch = !isCrossBranch ? (req.user.branchName || 'Main') : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);
    const filter = { status: { $in: ['Approved', 'Rejected', 'Ready for Printing'] } };
    if (branch) filter.branchName = branch;

    const reports = await LabReport.find(filter).populate({
      path: 'patient',
      select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',
      populate: [{ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } }, { path: 'sampleTypes', select: 'name' }]
    }).populate({
      path: 'laboratoryTests',
      select: 'name category subcategory',
      populate: { path: 'category', select: 'name' }
    }).populate('technician', 'fullName').populate('approvedBy', 'fullName role').sort({ approvedDate: -1, rejectedDate: -1 }).limit(200);

    const audit = await ActivityLog.find({ entityType: 'LabReport' }).populate('user', 'fullName role').sort({ createdDate: -1 }).limit(300);
    res.json({ reports, audit });
  } catch (e) {
    next(e);
  }
}
