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
 * List radiology examination queue for Radiologist (global cross-branch) & Admin
 */
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;
    
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

    let cases = await RadiologyCase.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal'
      })
      .populate('registeredBy', 'fullName username role branchName')
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
        select: 'patientId barcode name age sex phone address referralHospital registrationType branchName registeredBy registrationDate paymentStatus paymentMethod receiptNumber grandTotal systolicBP diastolicBP'
      })
      .populate('registeredBy', 'fullName username role branchName')
      .populate('laboratoryTest', 'name price subcategory description')
      .populate('radiologist', 'fullName username role')
      .populate('approvedBy', 'fullName username role');

    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role === 'Reception') {
      const regId = String(item.registeredBy?._id || item.registeredBy || item.patient?.registeredBy?._id || item.patient?.registeredBy || '');
      if (regId !== String(req.user.id)) {
        throw new AppError('You are not authorized to view radiology cases registered by another receptionist.', 403);
      }
    }

    res.json({ case: item });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/radiology/cases/:id/draft
 * Save draft report (Option A or Option B) - Supports both new drafts and editing existing reports
 */
export async function saveDraft(req, res, next) {
  try {
    const item = await RadiologyCase.findById(req.params.id).populate('patient', 'name patientId registeredBy branchName');
    if (!item) throw new AppError('Radiology case not found.', 404);

    if (req.user.role !== 'Admin' && req.user.role !== 'Radiologist') {
      throw new AppError('Unauthorized.', 403);
    }

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

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

    const { reportType, reportContent, structuredReport, showFooter } = req.body;

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
    const category = await LaboratoryTestCategory.findOne({ name: /^Radiology & Imaging$/i });
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
 * PUT /api/radiology/catalog/:id/price
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
    if (!test) throw new AppError('Radiology test not found.', 404);

    await recordActivity(req.user.id, 'Updated radiology test price', 'LaboratoryTest', test.id, `${test.name} -> ${price} ETB`);
    res.json({ test, message: 'Price updated successfully.' });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/radiology/catalog
 */
export async function createTest(req, res, next) {
  try {
    let category = await LaboratoryTestCategory.findOne({ name: /^Radiology & Imaging$/i });
    if (!category) {
      category = await LaboratoryTestCategory.create({
        name: 'Radiology & Imaging',
        code: 'RAD',
        description: 'Radiology & Diagnostic Imaging Examinations'
      });
    }

    const { name, subcategory, price, description } = req.body;
    if (!name || !price) throw new AppError('Name and price are required.', 422);

    const test = await LaboratoryTest.create({
      name,
      code: `RAD-${Date.now().toString(36).toUpperCase()}`,
      category: category._id,
      subcategory: subcategory || 'Ultrasound',
      price: Number(price),
      description: description || '',
      status: 'Active'
    });

    await recordActivity(req.user.id, 'Created radiology test', 'LaboratoryTest', test.id, test.name);
    res.status(201).json({ test, message: 'Radiology examination created successfully.' });
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
    if (!test) throw new AppError('Radiology test not found.', 404);

    const inUse = await RadiologyCase.exists({ laboratoryTest: test._id });
    if (inUse) {
      test.status = 'Inactive';
      await test.save();
      return res.json({ message: 'Radiology examination set to Inactive as it has associated case history.' });
    }

    await LaboratoryTest.findByIdAndDelete(test._id);
    await recordActivity(req.user.id, 'Deleted radiology test', 'LaboratoryTest', test.id, test.name);
    res.json({ message: 'Radiology examination deleted successfully.' });
  } catch (e) {
    next(e);
  }
}
