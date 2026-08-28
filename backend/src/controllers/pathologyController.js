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
 * List pathology examination queue for Pathologist & Admin
 */
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;
    const branch = req.user.role !== 'Admin'
      ? (req.user.branchName || 'Main')
      : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);

    const filter = {};
    if (branch) filter.branchName = branch;
    if (status && status !== 'all') filter.status = status;

    let cases = await PathologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
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
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registrationDate paymentStatus paymentMethod receiptNumber grandTotal systolicBP diastolicBP'
      })
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('pathologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role');

    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Sub Admin') {
      if (item.branchName !== (req.user.branchName || 'Main')) {
        throw new AppError('Pathology case not found for your branch.', 404);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/pathology/cases/:id/draft
 * Save draft report (Option A or Option B)
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && item.branchName !== (req.user.branchName || 'Main')) {
      throw new AppError('Unauthorized for this branch case.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        clinicalHistory: String(structuredReport.clinicalHistory || ''),
        specimen: String(structuredReport.specimen || ''),
        procedure: String(structuredReport.procedure || ''),
        grossDescription: String(structuredReport.grossDescription || ''),
        microscopicDescription: String(structuredReport.microscopicDescription || ''),
        cytologicalFindings: String(structuredReport.cytologicalFindings || ''),
        rbcMorphology: String(structuredReport.rbcMorphology || ''),
        wbcMorphology: String(structuredReport.wbcMorphology || ''),
        plateletMorphology: String(structuredReport.plateletMorphology || ''),
        peripheralBloodFindings: String(structuredReport.peripheralBloodFindings || ''),
        impression: String(structuredReport.impression || ''),
        diagnosis: String(structuredReport.diagnosis || ''),
        comments: String(structuredReport.comments || ''),
        recommendation: String(structuredReport.recommendation || ''),
        pathologistNotes: String(structuredReport.pathologistNotes || '')
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
 * Direct Pathologist sign-off & confirmation (No intermediate Admin approval required)
 */
export async function approveCase(req, res, next) {
  try {
    const item = await PathologyCase.findById(req.params.id).populate('patient', 'name patientId branchName');
    if (!item) throw new AppError('Pathology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Pathologist') {
      throw new AppError('Only authenticated Pathologists can confirm and approve Pathology reports.', 403);
    }

    if (req.user.role !== 'Admin' && item.branchName !== (req.user.branchName || 'Main')) {
      throw new AppError('Unauthorized for this branch case.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        clinicalHistory: String(structuredReport.clinicalHistory || ''),
        specimen: String(structuredReport.specimen || ''),
        procedure: String(structuredReport.procedure || ''),
        grossDescription: String(structuredReport.grossDescription || ''),
        microscopicDescription: String(structuredReport.microscopicDescription || ''),
        cytologicalFindings: String(structuredReport.cytologicalFindings || ''),
        rbcMorphology: String(structuredReport.rbcMorphology || ''),
        wbcMorphology: String(structuredReport.wbcMorphology || ''),
        plateletMorphology: String(structuredReport.plateletMorphology || ''),
        peripheralBloodFindings: String(structuredReport.peripheralBloodFindings || ''),
        impression: String(structuredReport.impression || ''),
        diagnosis: String(structuredReport.diagnosis || ''),
        comments: String(structuredReport.comments || ''),
        recommendation: String(structuredReport.recommendation || ''),
        pathologistNotes: String(structuredReport.pathologistNotes || '')
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

    // Notify Receptionist that report is ready for printing
    const receptionists = await User.find({
      role: 'Reception',
      branchName: item.branchName,
      status: 'Active'
    }).select('_id');

    if (receptionists.length > 0) {
      const msg = `Pathology report (${item.testType}) for ${item.patient?.name || 'Patient'} is ready for printing.`;
      await Notification.insertMany(
        receptionists.map(r => ({
          recipient: r._id,
          type: 'Pathology Report Ready',
          message: msg,
          entity: item._id,
          entityType: 'PathologyCase'
        }))
      );
      emit('notifications:change', { action: 'new' });
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
    emit('reception:change', { action: 'report_ready' });

    res.json({
      case: item,
      message: `Pathology report for ${item.patient?.name || 'patient'} approved successfully and sent to Reception Desk for printing.`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/pathology/catalog
 * Get Pathology category, subcategories & test list
 */
export async function getCatalog(req, res, next) {
  try {
    const category = await LaboratoryTestCategory.findOne({ name: /^PATHOLOGY$/i });
    if (!category) {
      return res.json({ category: null, tests: [] });
    }
    const tests = await LaboratoryTest.find({ category: category._id }).sort({ displayOrder: 1, name: 1 });
    res.json({ category, tests });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/pathology/catalog/:id/price
 * Admin only: update pathology test price
 */
export async function updateTestPrice(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can modify Pathology test prices and configurations.', 403);
    }
    const price = Number(req.body.price);
    if (isNaN(price) || price < 0) {
      throw new AppError('Valid price in ETB is required.', 422);
    }
    const test = await LaboratoryTest.findById(req.params.id);
    if (!test) throw new AppError('Test not found.', 404);

    const oldPrice = test.price;
    test.price = price;
    if (req.body.description !== undefined) test.description = String(req.body.description || '').trim();
    if (req.body.status) test.status = req.body.status;
    await test.save();

    await recordActivity(
      req.user.id,
      `Updated ${test.name} price from ${oldPrice} ETB to ${price} ETB`,
      'LaboratoryTest',
      test.id,
      test.name,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('catalog:change', { action: 'updated' });
    res.json({ test, message: 'Price updated successfully.' });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/pathology/catalog
 * Admin only: Add new subcategory / test to Pathology
 */
export async function createTest(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can create Pathology tests.', 403);
    }
    const category = await LaboratoryTestCategory.findOne({ name: /^PATHOLOGY$/i });
    if (!category) throw new AppError('Pathology category not found in catalog.', 404);

    const { name, subcategory, price, description } = req.body;
    if (!name || !name.trim()) throw new AppError('Test name is required.', 422);

    const test = await LaboratoryTest.create({
      name: name.trim(),
      subcategory: (subcategory || name).trim(),
      category: category._id,
      price: Number(price || 0),
      description: (description || '').trim(),
      status: 'Active'
    });

    await recordActivity(
      req.user.id,
      `Created Pathology test ${test.name} (${test.price} ETB)`,
      'LaboratoryTest',
      test.id,
      test.name,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('catalog:change', { action: 'created' });
    res.status(201).json({ test, message: 'Test created successfully.' });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/pathology/catalog/:id
 * Admin only: Delete pathology test
 */
export async function deleteTest(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can delete Pathology tests.', 403);
    }
    const test = await LaboratoryTest.findByIdAndDelete(req.params.id);
    if (!test) throw new AppError('Test not found.', 404);

    await recordActivity(
      req.user.id,
      `Deleted Pathology test ${test.name}`,
      'LaboratoryTest',
      test.id,
      test.name,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('catalog:change', { action: 'deleted' });
    res.json({ message: 'Test deleted successfully.' });
  } catch (e) {
    next(e);
  }
}
