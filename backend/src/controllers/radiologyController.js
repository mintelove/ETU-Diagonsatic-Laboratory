import mongoose from 'mongoose';
import RadiologyCase from '../models/RadiologyCase.js';
import Patient from '../models/Patient.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LaboratoryTestCategory from '../models/LaboratoryTestCategory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';

/**
 * GET /api/radiology/queue
 * List radiology examination queue for Radiologist & Admin
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

    let cases = await RadiologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('radiologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role')
      .sort({ createdDate: -1 })
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

    res.json({ cases });
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
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registrationDate paymentStatus paymentMethod receiptNumber grandTotal systolicBP diastolicBP'
      })
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('radiologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role');

    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Sub Admin') {
      if (item.branchName !== (req.user.branchName || 'Main')) {
        throw new AppError('Radiology case not found for your branch.', 404);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/radiology/cases/:id/draft
 * Save draft report (Option A or Option B)
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId');
    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && item.branchName !== (req.user.branchName || 'Main')) {
      throw new AppError('Unauthorized for this branch case.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        examination: String(structuredReport.examination || ''),
        clinicalInformation: String(structuredReport.clinicalInformation || ''),
        technique: String(structuredReport.technique || ''),
        liver: String(structuredReport.liver || ''),
        gallbladder: String(structuredReport.gallbladder || ''),
        biliarySystem: String(structuredReport.biliarySystem || ''),
        pancreas: String(structuredReport.pancreas || ''),
        spleen: String(structuredReport.spleen || ''),
        kidneys: String(structuredReport.kidneys || ''),
        urinaryBladder: String(structuredReport.urinaryBladder || ''),
        otherFindings: String(structuredReport.otherFindings || ''),
        findings: String(structuredReport.findings || ''),
        impression: String(structuredReport.impression || ''),
        recommendation: String(structuredReport.recommendation || ''),
        radiologistNotes: String(structuredReport.radiologistNotes || '')
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
 * Direct Radiologist sign-off & confirmation (No intermediate Admin approval required)
 */
export async function approveCase(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId branchName');
    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Radiologist') {
      throw new AppError('Only authenticated Radiologists can confirm and approve Radiology reports.', 403);
    }

    if (req.user.role !== 'Admin' && item.branchName !== (req.user.branchName || 'Main')) {
      throw new AppError('Unauthorized for this branch case.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

    if (reportType) item.reportType = reportType;
    if (reportContent !== undefined) item.reportContent = String(reportContent || '');
    if (structuredReport && typeof structuredReport === 'object') {
      item.structuredReport = {
        examination: String(structuredReport.examination || ''),
        clinicalInformation: String(structuredReport.clinicalInformation || ''),
        technique: String(structuredReport.technique || ''),
        liver: String(structuredReport.liver || ''),
        gallbladder: String(structuredReport.gallbladder || ''),
        biliarySystem: String(structuredReport.biliarySystem || ''),
        pancreas: String(structuredReport.pancreas || ''),
        spleen: String(structuredReport.spleen || ''),
        kidneys: String(structuredReport.kidneys || ''),
        urinaryBladder: String(structuredReport.urinaryBladder || ''),
        otherFindings: String(structuredReport.otherFindings || ''),
        findings: String(structuredReport.findings || ''),
        impression: String(structuredReport.impression || ''),
        recommendation: String(structuredReport.recommendation || ''),
        radiologistNotes: String(structuredReport.radiologistNotes || '')
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
    item.radiologist = item.radiologist || req.user.id;
    item.approvedBy = req.user.id;
    item.approverRole = req.user.role === 'Admin' ? 'Radiologist' : req.user.role;
    item.approvedAt = new Date();

    await item.save();

    // Notify Receptionist that report is ready for printing
    const receptionists = await User.find({
      role: 'Reception',
      branchName: item.branchName,
      status: 'Active'
    }).select('_id');

    if (receptionists.length > 0) {
      const examLabel = item.customExaminationName || item.ultrasoundSubtype ? `Ultrasound (${item.customExaminationName || item.ultrasoundSubtype})` : item.examinationType;
      const msg = `Radiology report (${examLabel}) for ${item.patient?.name || 'Patient'} is ready for printing.`;
      await Notification.insertMany(
        receptionists.map(r => ({
          recipient: r._id,
          type: 'Radiology Report Ready',
          message: msg,
          entity: item._id,
          entityType: 'RadiologyCase'
        }))
      );
      emit('notifications:change', { action: 'new' });
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
    emit('reception:change', { action: 'report_ready' });

    res.json({
      case: item,
      message: `Radiology report for ${item.patient?.name || 'patient'} approved successfully and sent to Reception Desk for printing.`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/radiology/catalog
 * Get Radiology category, subcategories & test list
 */
export async function getCatalog(req, res, next) {
  try {
    const category = await LaboratoryTestCategory.findOne({ name: /^RADIOLOGY$/i });
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
 * PUT /api/radiology/catalog/:id/price
 * Admin only: update radiology test price
 */
export async function updateTestPrice(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can modify Radiology test prices and configurations.', 403);
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
 * POST /api/radiology/catalog
 * Admin only: Add new subcategory / test to Radiology
 */
export async function createTest(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can create Radiology tests.', 403);
    }
    const category = await LaboratoryTestCategory.findOne({ name: /^RADIOLOGY$/i });
    if (!category) throw new AppError('Radiology category not found in catalog.', 404);

    const { name, subcategory, price, description } = req.body;
    if (!name || !name.trim()) throw new AppError('Test name is required.', 422);

    const test = await LaboratoryTest.create({
      name: name.trim(),
      subcategory: (subcategory || 'Ultrasound').trim(),
      category: category._id,
      price: Number(price || 0),
      description: (description || '').trim(),
      status: 'Active'
    });

    await recordActivity(
      req.user.id,
      `Created Radiology test ${test.name} (${test.price} ETB)`,
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
 * DELETE /api/radiology/catalog/:id
 * Admin only: Delete radiology test
 */
export async function deleteTest(req, res, next) {
  try {
    if (req.user.role !== 'Admin') {
      throw new AppError('Access denied. Only Main Admin can delete Radiology tests.', 403);
    }
    const test = await LaboratoryTest.findByIdAndDelete(req.params.id);
    if (!test) throw new AppError('Test not found.', 404);

    await recordActivity(
      req.user.id,
      `Deleted Radiology test ${test.name}`,
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
