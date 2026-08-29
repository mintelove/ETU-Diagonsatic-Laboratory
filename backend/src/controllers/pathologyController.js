import mongoose from 'mongoose';
import PathologyCase from '../models/PathologyCase.js';
import Patient from '../models/Patient.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';

// Helper: check overdue deadlines and create alerts
async function checkOverdueDeadlines(cases) {
  const now = new Date();
  for (const c of cases) {
    if (['Queued', 'In Progress'].includes(c.status) && !c.deadlineNotified && c.reportingDeadline < now) {
      c.deadlineNotified = true;
      await c.save();

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

/**
 * GET /api/pathology/queue
 * List pathology examination queue for Pathologist (global cross-branch) & Admin
 */
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;

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

    let cases = await PathologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('pathologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role')
      .sort({ createdDate: -1 })
      .lean();

    // Check overdue notifications
    await checkOverdueDeadlines(cases);

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

    res.json({ cases });
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

    if (req.user.role === 'Reception') {
      const regId = String(item.registeredBy?._id || item.registeredBy || item.patient?.registeredBy?._id || item.patient?.registeredBy || '');
      if (regId !== String(req.user.id)) {
        throw new AppError('You are not authorized to view pathology cases registered by another receptionist.', 403);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/pathology/cases/:id/draft
 * Save draft report (Option A or Option B) - Supports both new drafts and editing existing reports
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId registeredBy branchName');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Pathologist') {
      throw new AppError('Unauthorized.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

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

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

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
    if (showFooter !== undefined) item.showFooter = Boolean(showFooter);

    // Validate that report has content
    const hasOptionA = Boolean(item.reportContent && item.reportContent.trim());
    const hasOptionB = Boolean(
      item.structuredReport &&
      Object.values(item.structuredReport).some(v => v && String(v).trim())
    );

    if (item.reportType === 'Option A' && !hasOptionA) {
      throw new AppError('Cannot approve empty report. Please paste report content or enter structured findings.', 422);
    }
    if (item.reportType === 'Option B' && !hasOptionB) {
      throw new AppError('Cannot approve empty report. Please enter structured findings or paste report content.', 422);
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
    const category = await LaboratoryTestCategory.findOne({ name: /^Pathology$/i });
    if (!category) return res.json({ tests: [] });

    const tests = await LaboratoryTest.find({ category: category._id })
      .populate('category', 'name')
      .populate('requiredSampleTypes', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({ tests });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/pathology/catalog/:id/price
 */
export async function updateTestPrice(req, res, next) {
  try {
    const { price } = req.body;
    if (price === undefined || Number(price) < 0) {
      throw new AppError('Valid price is required.', 422);
    }
    const test = await LaboratoryTest.findByIdAndUpdate(
      req.params.id,
      { $set: { price: Number(price) } },
      { new: true }
    );
    if (!test) throw new AppError('Pathology test not found.', 404);

    await recordActivity(req.user.id, 'Updated pathology test price', 'LaboratoryTest', test.id, `${test.name} -> ${price} ETB`);
    res.json({ test, message: 'Price updated successfully.' });
  } catch (e) {
    next(e);
  }
}

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
        description: 'Pathology & Cytopathology Examinations'
      });
    }

    const { name, subcategory, price, description } = req.body;
    if (!name || !price) throw new AppError('Name and price are required.', 422);

    const test = await LaboratoryTest.create({
      name,
      code: `PATH-${Date.now().toString(36).toUpperCase()}`,
      category: category._id,
      subcategory: subcategory || 'Biopsy',
      price: Number(price),
      description: description || '',
      status: 'Active'
    });

    await recordActivity(req.user.id, 'Created pathology test', 'LaboratoryTest', test.id, test.name);
    res.status(201).json({ test, message: 'Pathology test created successfully.' });
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
      return res.json({ message: 'Pathology test set to Inactive as it has associated case history.' });
    }

    await LaboratoryTest.findByIdAndDelete(test._id);
    await recordActivity(req.user.id, 'Deleted pathology test', 'LaboratoryTest', test.id, test.name);
    res.json({ message: 'Pathology test deleted successfully.' });
  } catch (e) {
    next(e);
  }
}
