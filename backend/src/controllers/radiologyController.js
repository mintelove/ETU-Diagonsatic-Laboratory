import mongoose from 'mongoose';
import RadiologyCase from '../models/RadiologyCase.js';
import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';
import { RADIOLOGY_TEMPLATES } from '../constants/radiologyTemplates.js';

// Helper: date range generator for queue filtering
// Helper: date range generator for queue and transaction filtering
export function getDateRange(filterType, customStart, customEnd) {
  if (!filterType || filterType === 'all') return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (String(filterType).toLowerCase()) {
    case 'today':
      return { $gte: startOfToday, $lte: endOfToday };
    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return { $gte: startOfYesterday, $lte: endOfYesterday };
    }
    case 'this_week': {
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
      return { $gte: startOfWeek, $lte: endOfToday };
    }
    case 'last_week': {
      const currentDay = now.getDay();
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfThisWeek = new Date(startOfToday);
      startOfThisWeek.setDate(startOfThisWeek.getDate() + diffToMonday);

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);
      return { $gte: startOfLastWeek, $lte: endOfLastWeek };
    }
    case 'single':
    case 'single_date': {
      const dateVal = customStart || customEnd;
      if (!dateVal) return null;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { $gte: start, $lte: end };
    }
    case 'range':
    case 'date_range':
    case 'custom': {
      if (!customStart && !customEnd) return null;
      const startD = customStart ? new Date(customStart) : null;
      const endD = customEnd ? new Date(customEnd) : null;
      const range = {};
      if (startD && !isNaN(startD.getTime())) {
        range.$gte = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 0, 0, 0, 0);
      }
      if (endD && !isNaN(endD.getTime())) {
        range.$lte = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999);
      }
      return Object.keys(range).length ? range : null;
    }
    default: {
      const parsed = new Date(filterType);
      if (!isNaN(parsed.getTime()) && String(filterType).includes('-')) {
        const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
        const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
        return { $gte: start, $lte: end };
      }
      return null;
    }
  }
}

/**
 * GET /api/radiology/queue
 * List radiology examination queue for Radiologist (global cross-branch) & Admin
 * Supports ?cleared=true|false and ?dateFilter=today|yesterday|this_week|last_week|all
 */
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;
    const isCleared = req.query.cleared === 'true' || req.query.cleared === true;
    const dateFilter = req.query.dateFilter || 'all';
    
    // Radiologist is GLOBAL across all branches (Main and Otona combined)
    // Admin can optionally filter by query branch if provided
    const filter = {};
    if (req.user.role === 'Admin' && req.query.branchName && req.query.branchName !== 'All') {
      filter.branchName = req.query.branchName;
    } else if (req.user.role === 'Reception') {
      filter.branchName = req.user.branchName || 'Main';
      filter.registeredBy = req.user.id;
    }
    if (status && status !== 'all') filter.status = status;

    // Filter by Cleared vs Active queue
    if (isCleared) {
      filter.isCleared = true;
    } else {
      filter.isCleared = { $ne: true };
    }

    // Apply date range filter (on clearedAt for cleared queue, createdDate for active queue)
    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      if (isCleared) {
        filter.$or = [
          { clearedAt: dateRange },
          { clearedAt: null, createdDate: dateRange },
          { clearedAt: { $exists: false }, createdDate: dateRange }
        ];
      } else {
        filter.createdDate = dateRange;
      }
    }

    const sortOption = isCleared ? { clearedAt: -1, createdDate: -1 } : { createdDate: -1 };

    let cases = await RadiologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('radiologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role')
      .populate('clearedBy', 'fullName username role')
      .sort(sortOption)
      .lean();

    if (q) {
      const lower = q.toLowerCase();
      cases = cases.filter(c => {
        const p = c.patient;
        return (
          c.caseNumber?.toLowerCase().includes(lower) ||
          c.examinationType?.toLowerCase().includes(lower) ||
          c.ultrasoundSubtype?.toLowerCase().includes(lower) ||
          c.customExaminationName?.toLowerCase().includes(lower) ||
          p?.patientId?.toLowerCase().includes(lower) ||
          p?.name?.toLowerCase().includes(lower) ||
          p?.phone?.toLowerCase().includes(lower)
        );
      });
    }

    // Queue counts for tab switcher badges
    const baseCountFilter = {};
    if (req.user.role === 'Admin' && req.query.branchName && req.query.branchName !== 'All') {
      baseCountFilter.branchName = req.query.branchName;
    } else if (req.user.role === 'Reception') {
      baseCountFilter.branchName = req.user.branchName || 'Main';
      baseCountFilter.registeredBy = req.user.id;
    }
    if (status && status !== 'all') baseCountFilter.status = status;

    const [activeCount, clearedCount] = await Promise.all([
      RadiologyCase.countDocuments({ ...baseCountFilter, isCleared: { $ne: true } }),
      RadiologyCase.countDocuments({ ...baseCountFilter, isCleared: true })
    ]);

    res.json({ cases, activeCount, clearedCount });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/radiology/cases/:id
 */
export async function getCase(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal systolicBP diastolicBP'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('radiologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role');

    if (!item) throw new AppError('Radiology case not found.', 404);

    if (['Reception', 'Sample Collector'].includes(req.user.role)) {
      if (!['Approved', 'Ready for Printing'].includes(item.status)) {
        throw new AppError('Only approved radiology reports are accessible.', 403);
      }
      const userBranch = req.user.branchName || 'Main';
      const caseBranch = item.branchName || item.patient?.branchName || 'Main';
      if (req.user.branchName && req.user.branchName !== 'All' && caseBranch !== userBranch) {
        throw new AppError('You are not authorized to view radiology cases from another branch.', 403);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/radiology/templates
 * Standardized template library (MRI, CT, Ultrasound)
 */
export async function getTemplates(req, res, next) {
  try {
    res.json({ templates: RADIOLOGY_TEMPLATES });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/radiology/cases/:id/draft
 * Save draft report (Option A, Option B, or Option C) - Supports both new drafts and editing existing reports
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId registeredBy branchName');
    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Radiologist') {
      throw new AppError('Unauthorized.', 403);
    }

    const { reportType, reportContent, structuredReport, templateReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        examination: String(structuredReport.examination !== undefined ? structuredReport.examination : item.structuredReport?.examination || ''),
        clinicalInformation: String(structuredReport.clinicalInformation !== undefined ? structuredReport.clinicalInformation : item.structuredReport?.clinicalInformation || ''),
        technique: String(structuredReport.technique !== undefined ? structuredReport.technique : item.structuredReport?.technique || ''),
        liver: String(structuredReport.liver !== undefined ? structuredReport.liver : item.structuredReport?.liver || ''),
        gallbladder: String(structuredReport.gallbladder !== undefined ? structuredReport.gallbladder : item.structuredReport?.gallbladder || ''),
        biliarySystem: String(structuredReport.biliarySystem !== undefined ? structuredReport.biliarySystem : item.structuredReport?.biliarySystem || ''),
        pancreas: String(structuredReport.pancreas !== undefined ? structuredReport.pancreas : item.structuredReport?.pancreas || ''),
        spleen: String(structuredReport.spleen !== undefined ? structuredReport.spleen : item.structuredReport?.spleen || ''),
        kidneys: String(structuredReport.kidneys !== undefined ? structuredReport.kidneys : item.structuredReport?.kidneys || ''),
        urinaryBladder: String(structuredReport.urinaryBladder !== undefined ? structuredReport.urinaryBladder : item.structuredReport?.urinaryBladder || ''),
        otherFindings: String(structuredReport.otherFindings !== undefined ? structuredReport.otherFindings : item.structuredReport?.otherFindings || ''),
        findings: String(structuredReport.findings !== undefined ? structuredReport.findings : item.structuredReport?.findings || ''),
        impression: String(structuredReport.impression !== undefined ? structuredReport.impression : item.structuredReport?.impression || ''),
        recommendation: String(structuredReport.recommendation !== undefined ? structuredReport.recommendation : item.structuredReport?.recommendation || ''),
        radiologistNotes: String(structuredReport.radiologistNotes !== undefined ? structuredReport.radiologistNotes : item.structuredReport?.radiologistNotes || '')
      };
    }
    if (templateReport && typeof templateReport === 'object') {
      item.templateReport = {
        category: String(templateReport.category !== undefined ? templateReport.category : item.templateReport?.category || ''),
        templateKey: String(templateReport.templateKey !== undefined ? templateReport.templateKey : item.templateReport?.templateKey || ''),
        examination: String(templateReport.examination !== undefined ? templateReport.examination : item.templateReport?.examination || ''),
        clinicalInformation: String(templateReport.clinicalInformation !== undefined ? templateReport.clinicalInformation : item.templateReport?.clinicalInformation || ''),
        technique: String(templateReport.technique !== undefined ? templateReport.technique : item.templateReport?.technique || ''),
        comparison: String(templateReport.comparison !== undefined ? templateReport.comparison : item.templateReport?.comparison || ''),
        findings: String(templateReport.findings !== undefined ? templateReport.findings : item.templateReport?.findings || ''),
        impression: String(templateReport.impression !== undefined ? templateReport.impression : item.templateReport?.impression || ''),
        recommendation: String(templateReport.recommendation !== undefined ? templateReport.recommendation : item.templateReport?.recommendation || '')
      };
    }
    if (showFooter !== undefined) item.showFooter = Boolean(showFooter);

    if (item.status === 'Queued') {
      item.status = 'In Progress';
    }
    item.radiologist = req.user.id;

    await item.save();

    await recordActivity(
      req.user.id,
      'Radiology draft saved',
      'RadiologyCase',
      item.id,
      `${item.examinationType} for ${item.patient?.patientId || ''}`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('radiology:change', { action: 'draft_saved', caseId: item.id });
    res.json({ case: item, message: 'Draft saved successfully.' });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/radiology/cases/:id/approve
 * Direct Radiologist sign-off & confirmation (and editing approved report)
 * Returns report exclusively to the original sending receptionist account
 */
export async function approveCase(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id)
      .populate('patient', 'name patientId branchName registeredBy');
    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Radiologist') {
      throw new AppError('Only authenticated Radiologists can confirm and approve Radiology reports.', 403);
    }

    const { reportType, reportContent, structuredReport, templateReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        examination: String(structuredReport.examination !== undefined ? structuredReport.examination : item.structuredReport?.examination || ''),
        clinicalInformation: String(structuredReport.clinicalInformation !== undefined ? structuredReport.clinicalInformation : item.structuredReport?.clinicalInformation || ''),
        technique: String(structuredReport.technique !== undefined ? structuredReport.technique : item.structuredReport?.technique || ''),
        liver: String(structuredReport.liver !== undefined ? structuredReport.liver : item.structuredReport?.liver || ''),
        gallbladder: String(structuredReport.gallbladder !== undefined ? structuredReport.gallbladder : item.structuredReport?.gallbladder || ''),
        biliarySystem: String(structuredReport.biliarySystem !== undefined ? structuredReport.biliarySystem : item.structuredReport?.biliarySystem || ''),
        pancreas: String(structuredReport.pancreas !== undefined ? structuredReport.pancreas : item.structuredReport?.pancreas || ''),
        spleen: String(structuredReport.spleen !== undefined ? structuredReport.spleen : item.structuredReport?.spleen || ''),
        kidneys: String(structuredReport.kidneys !== undefined ? structuredReport.kidneys : item.structuredReport?.kidneys || ''),
        urinaryBladder: String(structuredReport.urinaryBladder !== undefined ? structuredReport.urinaryBladder : item.structuredReport?.urinaryBladder || ''),
        otherFindings: String(structuredReport.otherFindings !== undefined ? structuredReport.otherFindings : item.structuredReport?.otherFindings || ''),
        findings: String(structuredReport.findings !== undefined ? structuredReport.findings : item.structuredReport?.findings || ''),
        impression: String(structuredReport.impression !== undefined ? structuredReport.impression : item.structuredReport?.impression || ''),
        recommendation: String(structuredReport.recommendation !== undefined ? structuredReport.recommendation : item.structuredReport?.recommendation || ''),
        radiologistNotes: String(structuredReport.radiologistNotes !== undefined ? structuredReport.radiologistNotes : item.structuredReport?.radiologistNotes || '')
      };
    }
    if (templateReport && typeof templateReport === 'object') {
      item.templateReport = {
        category: String(templateReport.category !== undefined ? templateReport.category : item.templateReport?.category || ''),
        templateKey: String(templateReport.templateKey !== undefined ? templateReport.templateKey : item.templateReport?.templateKey || ''),
        examination: String(templateReport.examination !== undefined ? templateReport.examination : item.templateReport?.examination || ''),
        clinicalInformation: String(templateReport.clinicalInformation !== undefined ? templateReport.clinicalInformation : item.templateReport?.clinicalInformation || ''),
        technique: String(templateReport.technique !== undefined ? templateReport.technique : item.templateReport?.technique || ''),
        comparison: String(templateReport.comparison !== undefined ? templateReport.comparison : item.templateReport?.comparison || ''),
        findings: String(templateReport.findings !== undefined ? templateReport.findings : item.templateReport?.findings || ''),
        impression: String(templateReport.impression !== undefined ? templateReport.impression : item.templateReport?.impression || ''),
        recommendation: String(templateReport.recommendation !== undefined ? templateReport.recommendation : item.templateReport?.recommendation || '')
      };
    }
    if (showFooter !== undefined) item.showFooter = Boolean(showFooter);

    // Validate that report has content
    const hasOptionA = Boolean(item.reportContent && item.reportContent.trim());
    const hasOptionB = Boolean(
      item.structuredReport &&
      Object.values(item.structuredReport).some(v => v && String(v).trim())
    );
    const hasOptionC = Boolean(
      item.templateReport &&
      Object.values(item.templateReport).some(v => v && String(v).trim())
    );

    if (item.reportType === 'Option A' && !hasOptionA) {
      throw new AppError('Cannot approve empty report. Please paste report content or enter structured findings.', 422);
    }
    if (item.reportType === 'Option B' && !hasOptionB) {
      throw new AppError('Cannot approve empty report. Please enter structured findings or paste report content.', 422);
    }
    if (item.reportType === 'Option C' && !hasOptionC) {
      throw new AppError('Cannot approve empty template report. Please select a template or enter examination findings.', 422);
    }

    item.status = 'Approved';
    item.radiologist = item.radiologist || req.user.id;
    item.approvedBy = req.user.id;
    item.approverRole = req.user.role === 'Admin' ? 'Radiologist' : req.user.role;
    item.approvedAt = new Date();

    await item.save();

    // EXCLUSIVELY notify the original sending receptionist account
    const originalReceptionistId = item.registeredBy || item.patient?.registeredBy;
    const examLabel = item.customExaminationName || item.ultrasoundSubtype ? `Ultrasound (${item.customExaminationName || item.ultrasoundSubtype})` : item.examinationType;
    const msg = `Radiology report (${examLabel}) for ${item.patient?.name || 'Patient'} is approved and ready for printing.`;

    if (originalReceptionistId) {
      await Notification.create({
        recipient: originalReceptionistId,
        type: 'Radiology Report Ready',
        message: msg,
        entity: item._id,
        entityType: 'RadiologyCase'
      });
      emit('notifications:change', { action: 'new', recipient: originalReceptionistId });
    } else {
      // Fallback only if original receptionist is unrecorded: notify active receptionists of that branch
      const receptionists = await User.find({ role: 'Reception', branchName: item.branchName, status: 'Active' }).select('_id');
      if (receptionists.length > 0) {
        await Notification.insertMany(receptionists.map(r => ({
          recipient: r._id,
          type: 'Radiology Report Ready',
          message: msg,
          entity: item._id,
          entityType: 'RadiologyCase'
        })));
        emit('notifications:change', { action: 'new' });
      }
    }

    await recordActivity(
      req.user.id,
      'Approved Radiology report',
      'RadiologyCase',
      item.id,
      `${item.examinationType} for ${item.patient?.patientId || ''}`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('radiology:change', { action: 'approved', caseId: item.id });
    emit('reception:change', { action: 'report_ready', caseId: item.id });

    res.json({
      case: item,
      message: `Radiology report for ${item.patient?.name || 'patient'} approved successfully and returned to original Receptionist.`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/radiology/catalog
 */
export async function getCatalog(req, res, next) {
  try {
    let category = await LaboratoryTestCategory.findOne({
      name: { $regex: /^(Radiology & Imaging|Radiology|Imaging)$/i }
    });
    if (!category) {
      category = await LaboratoryTestCategory.create({
        name: 'Radiology & Imaging',
        code: 'RAD',
        description: 'Radiology & Diagnostic Imaging Examinations',
        status: 'Active'
      });
    }

    const tests = await LaboratoryTest.find({ category: category._id })
      .populate('category', 'name')
      .populate('requiredSampleTypes', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({ category, tests });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/radiology/catalog/:id and /api/radiology/catalog/:id/price
 */
export async function updateTest(req, res, next) {
  try {
    const { name, subcategory, price, description, status } = req.body;
    const test = await LaboratoryTest.findById(req.params.id);
    if (!test) throw new AppError('Radiology examination not found.', 404);

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) throw new AppError('Examination name cannot be empty.', 422);
      
      const existing = await LaboratoryTest.findOne({
        category: test.category,
        name: trimmedName,
        _id: { $ne: test._id }
      });
      if (existing) {
        throw new AppError(`A radiology examination with the name "${trimmedName}" already exists.`, 409);
      }
      test.name = trimmedName;
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new AppError('Valid numeric price in ETB (>= 0) is required.', 422);
      }
      test.price = numPrice;
    }

    if (subcategory !== undefined) {
      test.subcategory = String(subcategory).trim() || 'Ultrasound';
    }

    if (description !== undefined) {
      test.description = String(description).trim();
    }

    if (status !== undefined) {
      if (!['Active', 'Inactive'].includes(status)) {
        throw new AppError('Status must be either Active or Inactive.', 422);
      }
      test.status = status;
    }

    await test.save();

    await recordActivity(
      req.user.id,
      'Updated radiology examination',
      'LaboratoryTest',
      test.id,
      `${test.name} (${test.price} ETB, ${test.status})`
    );

    res.json({ test, message: `Radiology examination "${test.name}" updated successfully.` });
  } catch (e) {
    next(e);
  }
}

export const updateTestPrice = updateTest;

/**
 * POST /api/radiology/catalog
 */
export async function createTest(req, res, next) {
  try {
    let category = await LaboratoryTestCategory.findOne({
      name: { $regex: /^(Radiology & Imaging|Radiology|Imaging)$/i }
    });
    if (!category) {
      category = await LaboratoryTestCategory.create({
        name: 'Radiology & Imaging',
        code: 'RAD',
        description: 'Radiology & Diagnostic Imaging Examinations',
        status: 'Active'
      });
    }

    const { name, subcategory, price, description, status } = req.body;
    const trimmedName = String(name || '').trim();
    if (!trimmedName) throw new AppError('Examination name is required.', 422);

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new AppError('Valid numeric price in ETB (>= 0) is required.', 422);
    }

    const existing = await LaboratoryTest.findOne({
      category: category._id,
      name: trimmedName
    });
    if (existing) {
      throw new AppError(`A radiology examination with the name "${trimmedName}" already exists.`, 409);
    }

    const test = await LaboratoryTest.create({
      name: trimmedName,
      code: `RAD-${Date.now().toString(36).toUpperCase()}`,
      category: category._id,
      subcategory: String(subcategory || 'Ultrasound').trim(),
      price: numPrice,
      description: String(description || '').trim(),
      status: status && ['Active', 'Inactive'].includes(status) ? status : 'Active'
    });

    await recordActivity(req.user.id, 'Created radiology examination', 'LaboratoryTest', test.id, `${test.name} (${test.price} ETB)`);
    res.status(201).json({ test, message: `Radiology examination "${test.name}" created successfully.` });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/radiology/catalog/:id
 */
export async function deleteTest(req, res, next) {
  try {
    const test = await LaboratoryTest.findById(req.params.id);
    if (!test) throw new AppError('Radiology examination not found.', 404);

    const inUse = await RadiologyCase.exists({ laboratoryTest: test._id });
    if (inUse) {
      test.status = 'Inactive';
      await test.save();
      await recordActivity(req.user.id, 'Deactivated radiology examination with case history', 'LaboratoryTest', test.id, test.name);
      return res.json({ message: `"${test.name}" has existing patient case history, so it was set to Inactive.` });
    }

    await LaboratoryTest.findByIdAndDelete(test._id);
    await recordActivity(req.user.id, 'Deleted radiology examination', 'LaboratoryTest', test.id, test.name);
    res.json({ message: `Radiology examination "${test.name}" deleted successfully.` });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/radiology/cases/:id/clear
 * Move patient examination from active queue to cleared queue (Soft clear - zero data deletion)
 */
export async function clearCase(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Radiology examination not found.', 404);

    if (item.isCleared) {
      return res.json({ message: 'Case is already cleared.', case: item });
    }

    item.isCleared = true;
    item.clearedAt = new Date();
    item.clearedBy = req.user.id;
    await item.save();

    await recordActivity(
      req.user.id,
      'Cleared radiology examination from active queue',
      'RadiologyCase',
      item.id,
      `Case ${item.caseNumber || item._id} for ${item.patient?.name || 'Patient'} (${item.patient?.patientId || ''})`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('radiology:change', { action: 'case_cleared', caseId: item.id });

    res.json({
      success: true,
      message: 'Patient successfully cleared from active queue.',
      case: item
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/radiology/cases/:id/restore
 * Restore patient examination from cleared queue back to active queue
 */
export async function restoreCase(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Radiology examination not found.', 404);

    if (!item.isCleared) {
      return res.json({ message: 'Case is already in the active queue.', case: item });
    }

    item.isCleared = false;
    item.clearedAt = null;
    item.clearedBy = null;
    await item.save();

    await recordActivity(
      req.user.id,
      'Restored radiology examination to active queue',
      'RadiologyCase',
      item.id,
      `Case ${item.caseNumber || item._id} for ${item.patient?.name || 'Patient'} (${item.patient?.patientId || ''})`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('radiology:change', { action: 'case_restored', caseId: item.id });

    res.json({
      success: true,
      message: 'Patient successfully restored to active queue.',
      case: item
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/radiology/transactions
 * Dedicated Radiology Transaction / Income Dashboard
 * Monitors ONLY income generated from Radiology-related tests at the individual test level.
 * Applies existing proportional discount logic without double counting.
 */
function isRadiologyTest(test) {
  const catName = String(test?.category?.name || test?.categoryName || '').toUpperCase();
  const testName = String(test?.name || '').toUpperCase();
  const subcat = String(test?.subcategory || '').toUpperCase();

  return catName.includes('RADIOLOGY') ||
    testName.includes('CT SCAN') || testName.includes('X-RAY') || testName.includes('XRAY') || testName.includes('ULTRASOUND') ||
    testName.includes('MRI') ||
    subcat.includes('CT SCAN') || subcat.includes('X-RAY') || subcat.includes('XRAY') || subcat.includes('ULTRASOUND') ||
    subcat.includes('MRI');
}

export async function transactions(req, res, next) {
  try {
    const dateFilter = req.query.dateFilter || req.query.datePreset || 'today';
    const singleDate = req.query.singleDate || req.query.date || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const branch = (req.user.role !== 'Admin' && req.user.branchName)
      ? req.user.branchName
      : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);

    let dateRange = null;
    if (dateFilter === 'single' || dateFilter === 'single_date' || (singleDate && !startDate && !endDate)) {
      dateRange = getDateRange('single', singleDate || dateFilter);
    } else if (dateFilter === 'range' || dateFilter === 'date_range' || dateFilter === 'custom' || startDate || endDate) {
      dateRange = getDateRange('range', startDate, endDate);
    } else {
      dateRange = getDateRange(dateFilter);
    }

    const query = { paymentStatus: 'Paid' };
    if (branch) query.branchName = branch;
    if (dateRange) {
      query.$or = [
        { paymentDate: dateRange },
        { registrationDate: dateRange }
      ];
    }

    const patients = await Patient.find(query)
      .populate({
        path: 'laboratoryTests',
        select: 'name price category subcategory',
        populate: { path: 'category', select: 'name' }
      })
      .populate('registeredBy', 'fullName username role')
      .populate('collectedBy', 'fullName username role')
      .sort({ paymentDate: -1, registrationDate: -1 })
      .lean();

    const pendingQuery = { paymentStatus: { $in: ['Waiting for Payment', 'Unpaid'] } };
    if (branch) pendingQuery.branchName = branch;
    if (dateRange) pendingQuery.registrationDate = dateRange;
    const pendingPatients = await Patient.find(pendingQuery)
      .populate({
        path: 'laboratoryTests',
        select: 'name price category subcategory',
        populate: { path: 'category', select: 'name' }
      })
      .lean();

    let pendingAmount = 0;
    pendingPatients.forEach(p => {
      const pTests = (p.laboratoryTests || []).filter(isRadiologyTest);
      const discountPct = Number(p.discountPercent || 0);
      pTests.forEach(t => {
        const net = Number(t.price || 0) * (1 - discountPct / 100);
        pendingAmount += net;
      });
    });

    let totalIncome = 0;
    let totalGross = 0;
    let totalDiscount = 0;
    const breakdown = {
      ultrasound: { count: 0, revenue: 0 },
      ctScan: { count: 0, revenue: 0 },
      mri: { count: 0, revenue: 0 },
      xRay: { count: 0, revenue: 0 },
      other: { count: 0, revenue: 0 }
    };

    const transactionRows = [];

    patients.forEach(p => {
      const tests = p.laboratoryTests || [];
      const radTests = tests.filter(isRadiologyTest);
      if (!radTests.length) return;

      const discountPct = Number(p.discountPercent || 0);
      let txRadGross = 0;
      let txRadNet = 0;
      const testNames = [];

      radTests.forEach(t => {
        const gross = Number(t.price || 0);
        const net = gross * (1 - discountPct / 100);
        txRadGross += gross;
        txRadNet += net;
        testNames.push(t.name);

        const lowerName = (t.name || '').toLowerCase() + ' ' + (t.subcategory || '').toLowerCase();
        if (/ultrasound|sonograph/i.test(lowerName)) {
          breakdown.ultrasound.count += 1;
          breakdown.ultrasound.revenue += net;
        } else if (/ct scan|computed tomo/i.test(lowerName)) {
          breakdown.ctScan.count += 1;
          breakdown.ctScan.revenue += net;
        } else if (/mri|magnetic res/i.test(lowerName)) {
          breakdown.mri.count += 1;
          breakdown.mri.revenue += net;
        } else if (/x-ray|xray|radiograph/i.test(lowerName)) {
          breakdown.xRay.count += 1;
          breakdown.xRay.revenue += net;
        } else {
          breakdown.other.count += 1;
          breakdown.other.revenue += net;
        }
      });

      const txDiscount = txRadGross - txRadNet;
      totalIncome += txRadNet;
      totalGross += txRadGross;
      totalDiscount += txDiscount;

      transactionRows.push({
        _id: p._id,
        patientId: p.patientId,
        patientName: p.name,
        receiptNumber: p.receiptNumber || `RC-${p.patientId}`,
        date: p.paymentDate || p.registrationDate,
        branchName: p.branchName || 'Main',
        paymentMethod: p.paymentMethod || 'Cash',
        paymentStatus: p.paymentStatus,
        discountPercent: discountPct,
        radiologyExams: testNames,
        tests: testNames.join(', '),
        grossAmount: Math.round(txRadGross * 100) / 100,
        discountAmount: Math.round(txDiscount * 100) / 100,
        netAmount: Math.round(txRadNet * 100) / 100,
        grandTotal: Math.round(txRadNet * 100) / 100,
        registeredBy: p.registeredBy?.fullName || 'Receptionist',
        receivedBy: p.collectedBy?.fullName || p.registeredBy?.fullName || 'Receptionist'
      });
    });

    res.json({
      success: true,
      department: 'Radiology',
      dateFilter,
      singleDate: singleDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      branch: branch || 'All',
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalGross: Math.round(totalGross * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        transactionCount: transactionRows.length,
        paidAmount: Math.round(totalIncome * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        breakdown: {
          ultrasound: { count: breakdown.ultrasound.count, revenue: Math.round(breakdown.ultrasound.revenue * 100) / 100 },
          ctScan: { count: breakdown.ctScan.count, revenue: Math.round(breakdown.ctScan.revenue * 100) / 100 },
          mri: { count: breakdown.mri.count, revenue: Math.round(breakdown.mri.revenue * 100) / 100 },
          xRay: { count: breakdown.xRay.count, revenue: Math.round(breakdown.xRay.revenue * 100) / 100 },
          other: { count: breakdown.other.count, revenue: Math.round(breakdown.other.revenue * 100) / 100 }
        }
      },
      transactions: transactionRows
    });
  } catch (e) {
    next(e);
  }
}

