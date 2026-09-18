import mongoose from 'mongoose';
import PathologyCase from '../models/PathologyCase.js';
import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';
import { PATHOLOGY_TEMPLATES } from '../constants/pathologyTemplates.js';

// Helper: check overdue deadlines and create alerts
async function checkOverdueDeadlines(cases) {
  const now = new Date();
  for (const c of cases) {
    if (['Queued', 'In Progress'].includes(c.status) && !c.deadlineNotified && c.reportingDeadline < now) {
      c.deadlineNotified = true;
      await PathologyCase.updateOne({ _id: c._id }, { $set: { deadlineNotified: true } });

      const admins = await User.find({ role: 'Admin', status: 'Active' }).select('_id');
      const recipients = [...admins.map(a => a._id)];
      if (c.pathologist && !recipients.some(r => String(r) === String(c.pathologist._id || c.pathologist))) {
        recipients.push(c.pathologist._id || c.pathologist);
      }

      const patientCode = c.patient?.patientId || 'Patient';
      const patientName = c.patient?.name || '';
      const msg = `${c.testType} report deadline (${c.deadlineDays === 20 ? '20-day' : '24-hour'}) reached for ${patientName} (${patientCode}).`;

      if (recipients.length > 0) {
        await Notification.insertMany(
          recipients.map(recipient => ({
            recipient,
            type: 'Pathology Deadline Alert',
            message: msg,
            entity: c._id,
            entityType: 'PathologyCase'
          }))
        );
        emit('notifications:change', { action: 'new' });
      }
    }
  }
}

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
 * GET /api/pathology/queue
 * List pathology examination queue for Pathologist (global cross-branch) & Admin
 * Supports ?cleared=true|false and ?dateFilter=today|yesterday|this_week|last_week|all
 */
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;
    const isCleared = req.query.cleared === 'true' || req.query.cleared === true;
    const dateFilter = req.query.dateFilter || 'all';

    // Pathologist is GLOBAL across all branches (Main and Otona combined)
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

    let cases = await PathologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('pathologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role')
      .populate('clearedBy', 'fullName username role')
      .sort(sortOption)
      .lean();

    // Check overdue notifications on active cases
    if (!isCleared) {
      await checkOverdueDeadlines(cases);
    }

    if (q) {
      const lower = q.toLowerCase();
      cases = cases.filter(c => {
        const p = c.patient;
        return (
          c.caseNumber?.toLowerCase().includes(lower) ||
          c.testType?.toLowerCase().includes(lower) ||
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
      PathologyCase.countDocuments({ ...baseCountFilter, isCleared: { $ne: true } }),
      PathologyCase.countDocuments({ ...baseCountFilter, isCleared: true })
    ]);

    res.json({ cases, activeCount, clearedCount });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/pathology/cases/:id
 */
export async function getCase(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal systolicBP diastolicBP'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('pathologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role');

    if (!item) throw new AppError('Pathology case not found.', 404);

    if (['Reception', 'Sample Collector'].includes(req.user.role)) {
      if (!['Approved', 'Ready for Printing'].includes(item.status)) {
        throw new AppError('Only approved pathology reports are accessible.', 403);
      }
      const userBranch = req.user.branchName || 'Main';
      const caseBranch = item.branchName || item.patient?.branchName || 'Main';
      if (req.user.branchName && req.user.branchName !== 'All' && caseBranch !== userBranch) {
        throw new AppError('You are not authorized to view pathology cases from another branch.', 403);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/pathology/templates
 * Standardized template library for Pathology (Biopsy, FNAC, Blood Film)
 */
export async function getTemplates(req, res, next) {
  try {
    res.json({ templates: PATHOLOGY_TEMPLATES });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/pathology/cases/:id/draft
 * Save draft report (Option A, Option B, or Option C) - Supports both new drafts and editing existing reports
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId registeredBy branchName');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Pathologist') {
      throw new AppError('Unauthorized.', 403);
    }

    const { reportType, reportContent, structuredReport, templateReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        clinicalHistory: String(structuredReport.clinicalHistory !== undefined ? structuredReport.clinicalHistory : item.structuredReport?.clinicalHistory || ''),
        specimen: String(structuredReport.specimen !== undefined ? structuredReport.specimen : item.structuredReport?.specimen || ''),
        procedure: String(structuredReport.procedure !== undefined ? structuredReport.procedure : item.structuredReport?.procedure || ''),
        grossDescription: String(structuredReport.grossDescription !== undefined ? structuredReport.grossDescription : item.structuredReport?.grossDescription || ''),
        microscopicDescription: String(structuredReport.microscopicDescription !== undefined ? structuredReport.microscopicDescription : item.structuredReport?.microscopicDescription || ''),
        cytologicalFindings: String(structuredReport.cytologicalFindings !== undefined ? structuredReport.cytologicalFindings : item.structuredReport?.cytologicalFindings || ''),
        rbcMorphology: String(structuredReport.rbcMorphology !== undefined ? structuredReport.rbcMorphology : item.structuredReport?.rbcMorphology || ''),
        wbcMorphology: String(structuredReport.wbcMorphology !== undefined ? structuredReport.wbcMorphology : item.structuredReport?.wbcMorphology || ''),
        plateletMorphology: String(structuredReport.plateletMorphology !== undefined ? structuredReport.plateletMorphology : item.structuredReport?.plateletMorphology || ''),
        peripheralBloodFindings: String(structuredReport.peripheralBloodFindings !== undefined ? structuredReport.peripheralBloodFindings : item.structuredReport?.peripheralBloodFindings || ''),
        impression: String(structuredReport.impression !== undefined ? structuredReport.impression : item.structuredReport?.impression || ''),
        diagnosis: String(structuredReport.diagnosis !== undefined ? structuredReport.diagnosis : item.structuredReport?.diagnosis || ''),
        comments: String(structuredReport.comments !== undefined ? structuredReport.comments : item.structuredReport?.comments || ''),
        recommendation: String(structuredReport.recommendation !== undefined ? structuredReport.recommendation : item.structuredReport?.recommendation || ''),
        pathologistNotes: String(structuredReport.pathologistNotes !== undefined ? structuredReport.pathologistNotes : item.structuredReport?.pathologistNotes || '')
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
    item.pathologist = req.user.id;

    await item.save();

    await recordActivity(
      req.user.id,
      'Pathology draft saved',
      'PathologyCase',
      item.id,
      `${item.testType} for ${item.patient?.patientId || ''}`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('pathology:change', { action: 'draft_saved', caseId: item.id });
    res.json({ case: item, message: 'Draft saved successfully.' });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/pathology/cases/:id/approve
 * Direct Pathologist sign-off & confirmation (and editing approved report)
 * Returns report exclusively to the original sending receptionist account
 */
export async function approveCase(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id)
      .populate('patient', 'name patientId branchName registeredBy');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Pathologist') {
      throw new AppError('Only authenticated Pathologists can confirm and approve Pathology reports.', 403);
    }

    const { reportType, reportContent, structuredReport, templateReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        clinicalHistory: String(structuredReport.clinicalHistory !== undefined ? structuredReport.clinicalHistory : item.structuredReport?.clinicalHistory || ''),
        specimen: String(structuredReport.specimen !== undefined ? structuredReport.specimen : item.structuredReport?.specimen || ''),
        procedure: String(structuredReport.procedure !== undefined ? structuredReport.procedure : item.structuredReport?.procedure || ''),
        grossDescription: String(structuredReport.grossDescription !== undefined ? structuredReport.grossDescription : item.structuredReport?.grossDescription || ''),
        microscopicDescription: String(structuredReport.microscopicDescription !== undefined ? structuredReport.microscopicDescription : item.structuredReport?.microscopicDescription || ''),
        cytologicalFindings: String(structuredReport.cytologicalFindings !== undefined ? structuredReport.cytologicalFindings : item.structuredReport?.cytologicalFindings || ''),
        rbcMorphology: String(structuredReport.rbcMorphology !== undefined ? structuredReport.rbcMorphology : item.structuredReport?.rbcMorphology || ''),
        wbcMorphology: String(structuredReport.wbcMorphology !== undefined ? structuredReport.wbcMorphology : item.structuredReport?.wbcMorphology || ''),
        plateletMorphology: String(structuredReport.plateletMorphology !== undefined ? structuredReport.plateletMorphology : item.structuredReport?.plateletMorphology || ''),
        peripheralBloodFindings: String(structuredReport.peripheralBloodFindings !== undefined ? structuredReport.peripheralBloodFindings : item.structuredReport?.peripheralBloodFindings || ''),
        impression: String(structuredReport.impression !== undefined ? structuredReport.impression : item.structuredReport?.impression || ''),
        diagnosis: String(structuredReport.diagnosis !== undefined ? structuredReport.diagnosis : item.structuredReport?.diagnosis || ''),
        comments: String(structuredReport.comments !== undefined ? structuredReport.comments : item.structuredReport?.comments || ''),
        recommendation: String(structuredReport.recommendation !== undefined ? structuredReport.recommendation : item.structuredReport?.recommendation || ''),
        pathologistNotes: String(structuredReport.pathologistNotes !== undefined ? structuredReport.pathologistNotes : item.structuredReport?.pathologistNotes || '')
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
    item.pathologist = item.pathologist || req.user.id;
    item.approvedBy = req.user.id;
    item.approverRole = req.user.role === 'Admin' ? 'Pathologist' : req.user.role;
    item.approvedAt = new Date();

    await item.save();

    // EXCLUSIVELY notify the original sending receptionist account
    const originalReceptionistId = item.registeredBy || item.patient?.registeredBy;
    const msg = `Pathology report (${item.testType}) for ${item.patient?.name || 'Patient'} is approved and ready for printing.`;

    if (originalReceptionistId) {
      await Notification.create({
        recipient: originalReceptionistId,
        type: 'Pathology Report Ready',
        message: msg,
        entity: item._id,
        entityType: 'PathologyCase'
      });
      emit('notifications:change', { action: 'new', recipient: originalReceptionistId });
    } else {
      // Fallback only if original receptionist is unrecorded: notify active receptionists of that branch
      const receptionists = await User.find({ role: 'Reception', branchName: item.branchName, status: 'Active' }).select('_id');
      if (receptionists.length > 0) {
        await Notification.insertMany(receptionists.map(r => ({
          recipient: r._id,
          type: 'Pathology Report Ready',
          message: msg,
          entity: item._id,
          entityType: 'PathologyCase'
        })));
        emit('notifications:change', { action: 'new' });
      }
    }

    await recordActivity(
      req.user.id,
      'Approved Pathology report',
      'PathologyCase',
      item.id,
      `${item.testType} for ${item.patient?.patientId || ''}`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('pathology:change', { action: 'approved', caseId: item.id });
    emit('reception:change', { action: 'report_ready', caseId: item.id });

    res.json({
      case: item,
      message: `Pathology report for ${item.patient?.name || 'patient'} approved successfully and returned to original Receptionist.`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/pathology/catalog
 */
export async function getCatalog(req, res, next) {
  try {
    let category = await LaboratoryTestCategory.findOne({ name: /^Pathology$/i });
    if (!category) {
      category = await LaboratoryTestCategory.create({
        name: 'Pathology',
        code: 'PATH',
        description: 'Pathology & Cytopathology Examinations',
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
 * PUT /api/pathology/catalog/:id and /api/pathology/catalog/:id/price
 */
export async function updateTest(req, res, next) {
  try {
    const { name, subcategory, price, description, status } = req.body;
    const test = await LaboratoryTest.findById(req.params.id);
    if (!test) throw new AppError('Pathology test not found.', 404);

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) throw new AppError('Test name cannot be empty.', 422);
      
      const existing = await LaboratoryTest.findOne({
        category: test.category,
        name: trimmedName,
        _id: { $ne: test._id }
      });
      if (existing) {
        throw new AppError(`A pathology test with the name "${trimmedName}" already exists.`, 409);
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
      test.subcategory = String(subcategory).trim() || 'Biopsy';
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
      'Updated pathology test',
      'LaboratoryTest',
      test.id,
      `${test.name} (${test.price} ETB, ${test.status})`
    );

    res.json({ test, message: `Pathology test "${test.name}" updated successfully.` });
  } catch (e) {
    next(e);
  }
}

export const updateTestPrice = updateTest;

/**
 * POST /api/pathology/catalog
 */
export async function createTest(req, res, next) {
  try {
    let category = await LaboratoryTestCategory.findOne({ name: /^Pathology$/i });
    if (!category) {
      category = await LaboratoryTestCategory.create({
        name: 'Pathology',
        code: 'PATH',
        description: 'Pathology & Cytopathology Examinations',
        status: 'Active'
      });
    }

    const { name, subcategory, price, description, status } = req.body;
    const trimmedName = String(name || '').trim();
    if (!trimmedName) throw new AppError('Name is required.', 422);

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new AppError('Valid numeric price in ETB (>= 0) is required.', 422);
    }

    const existing = await LaboratoryTest.findOne({
      category: category._id,
      name: trimmedName
    });
    if (existing) {
      throw new AppError(`A pathology test with the name "${trimmedName}" already exists.`, 409);
    }

    const test = await LaboratoryTest.create({
      name: trimmedName,
      code: `PATH-${Date.now().toString(36).toUpperCase()}`,
      category: category._id,
      subcategory: String(subcategory || 'Biopsy').trim(),
      price: numPrice,
      description: String(description || '').trim(),
      status: status && ['Active', 'Inactive'].includes(status) ? status : 'Active'
    });

    await recordActivity(req.user.id, 'Created pathology test', 'LaboratoryTest', test.id, `${test.name} (${test.price} ETB)`);
    res.status(201).json({ test, message: `Pathology test "${test.name}" created successfully.` });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/pathology/catalog/:id
 */
export async function deleteTest(req, res, next) {
  try {
    const test = await LaboratoryTest.findById(req.params.id);
    if (!test) throw new AppError('Pathology test not found.', 404);

    const inUse = await PathologyCase.exists({ laboratoryTest: test._id });
    if (inUse) {
      test.status = 'Inactive';
      await test.save();
      await recordActivity(req.user.id, 'Deactivated pathology test with case history', 'LaboratoryTest', test.id, test.name);
      return res.json({ message: `"${test.name}" has existing patient case history, so it was set to Inactive.` });
    }

    await LaboratoryTest.findByIdAndDelete(test._id);
    await recordActivity(req.user.id, 'Deleted pathology test', 'LaboratoryTest', test.id, test.name);
    res.json({ message: `Pathology test "${test.name}" deleted successfully.` });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/pathology/cases/:id/clear
 * Move patient case from active queue to cleared queue (Soft clear - zero data deletion)
 */
export async function clearCase(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (item.isCleared) {
      return res.json({ message: 'Case is already cleared.', case: item });
    }

    item.isCleared = true;
    item.clearedAt = new Date();
    item.clearedBy = req.user.id;
    await item.save();

    await recordActivity(
      req.user.id,
      'Cleared pathology case from active queue',
      'PathologyCase',
      item.id,
      `Case ${item.caseNumber || item._id} for ${item.patient?.name || 'Patient'} (${item.patient?.patientId || ''})`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('pathology:change', { action: 'case_cleared', caseId: item.id });

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
 * POST /api/pathology/cases/:id/restore
 * Restore patient case from cleared queue back to active queue
 */
export async function restoreCase(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (!item.isCleared) {
      return res.json({ message: 'Case is already in the active queue.', case: item });
    }

    item.isCleared = false;
    item.clearedAt = null;
    item.clearedBy = null;
    await item.save();

    await recordActivity(
      req.user.id,
      'Restored pathology case to active queue',
      'PathologyCase',
      item.id,
      `Case ${item.caseNumber || item._id} for ${item.patient?.name || 'Patient'} (${item.patient?.patientId || ''})`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('pathology:change', { action: 'case_restored', caseId: item.id });

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
 * GET /api/pathology/transactions
 * Dedicated Pathology Transaction / Income Dashboard
 * Monitors ONLY income generated from Pathology-related tests at the individual test level.
 * Applies existing proportional discount logic without double counting.
 */
function isPathologyTest(test) {
  const catName = String(test?.category?.name || test?.categoryName || '').toUpperCase();
  const testName = String(test?.name || '').toUpperCase();
  const subcat = String(test?.subcategory || '').toUpperCase();

  return catName.includes('PATHOLOGY') ||
    testName.includes('BIOPSY') || testName.includes('FNAC') || testName.includes('PERIPHERAL MORPHOLOGY') ||
    testName.includes('HISTOPATHOLOGY') || testName.includes('CYTOPATHOLOGY') ||
    subcat.includes('BIOPSY') || subcat.includes('FNAC') || subcat.includes('PERIPHERAL MORPHOLOGY') ||
    subcat.includes('HISTOPATHOLOGY') || subcat.includes('CYTOPATHOLOGY');
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
      const pTests = (p.laboratoryTests || []).filter(isPathologyTest);
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
      biopsy: { count: 0, revenue: 0 },
      fnac: { count: 0, revenue: 0 },
      peripheralMorphology: { count: 0, revenue: 0 },
      other: { count: 0, revenue: 0 }
    };

    const transactionRows = [];

    patients.forEach(p => {
      const tests = p.laboratoryTests || [];
      const pathTests = tests.filter(isPathologyTest);
      if (!pathTests.length) return;

      const discountPct = Number(p.discountPercent || 0);
      let txPathGross = 0;
      let txPathNet = 0;
      const testNames = [];

      pathTests.forEach(t => {
        const gross = Number(t.price || 0);
        const net = gross * (1 - discountPct / 100);
        txPathGross += gross;
        txPathNet += net;
        testNames.push(t.name);

        const lowerName = (t.name || '').toLowerCase() + ' ' + (t.subcategory || '').toLowerCase();
        if (/biopsy|histopath/i.test(lowerName)) {
          breakdown.biopsy.count += 1;
          breakdown.biopsy.revenue += net;
        } else if (/fnac|cytopath/i.test(lowerName)) {
          breakdown.fnac.count += 1;
          breakdown.fnac.revenue += net;
        } else if (/morphology|blood film/i.test(lowerName)) {
          breakdown.peripheralMorphology.count += 1;
          breakdown.peripheralMorphology.revenue += net;
        } else {
          breakdown.other.count += 1;
          breakdown.other.revenue += net;
        }
      });

      const txDiscount = txPathGross - txPathNet;
      totalIncome += txPathNet;
      totalGross += txPathGross;
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
        pathologyTests: testNames,
        tests: testNames.join(', '),
        grossAmount: Math.round(txPathGross * 100) / 100,
        discountAmount: Math.round(txDiscount * 100) / 100,
        netAmount: Math.round(txPathNet * 100) / 100,
        grandTotal: Math.round(txPathNet * 100) / 100,
        registeredBy: p.registeredBy?.fullName || 'Receptionist',
        receivedBy: p.collectedBy?.fullName || p.registeredBy?.fullName || 'Receptionist'
      });
    });

    res.json({
      success: true,
      department: 'Pathology',
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
          biopsy: { count: breakdown.biopsy.count, revenue: Math.round(breakdown.biopsy.revenue * 100) / 100 },
          fnac: { count: breakdown.fnac.count, revenue: Math.round(breakdown.fnac.revenue * 100) / 100 },
          peripheralMorphology: { count: breakdown.peripheralMorphology.count, revenue: Math.round(breakdown.peripheralMorphology.revenue * 100) / 100 },
          other: { count: breakdown.other.count, revenue: Math.round(breakdown.other.revenue * 100) / 100 }
        }
      },
      transactions: transactionRows
    });
  } catch (e) {
    next(e);
  }
}

