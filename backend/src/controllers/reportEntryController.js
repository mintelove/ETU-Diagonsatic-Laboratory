import LabReport from '../models/LabReport.js';
import LabTestParameter from '../models/LabTestParameter.js';
import { AppError } from '../utils/appError.js';
import { equipmentPayload } from '../constants/equipment.js';
import { seedParameterCatalog } from '../config/parameterCatalogSeeder.js';

export function parameters(req, res) {
  res.json(equipmentPayload());
}

export async function catalog(req, res, next) {
  try {
    await seedParameterCatalog();
    const list = await LabTestParameter.find({ status: 'Active' })
      .sort({ category: 1, displayOrder: 1, subcategory: 1, parameterName: 1 })
      .lean();

    const grouped = {};
    for (const item of list) {
      const cat = item.category || 'OTHER';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    res.json({ catalog: list, grouped });
  } catch (error) { next(error); }
}

export async function draft(req, res, next) {
  try {
    const report = await LabReport.findOne({ patient: req.params.patientId, technician: req.user.id, status: { $in: ['Draft', 'Rejected'] } });
    res.json({ report });
  } catch (error) { next(error); }
}

export async function generate(req, res, next) {
  try {
    const report = await LabReport.findOne({ patient: req.params.patientId, technician: req.user.id, status: 'Draft' })
      .populate({ path: 'patient', select: 'patientId barcode name age sex phone laboratoryTests sampleTypes', populate: [{ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } }, { path: 'sampleTypes', select: 'name' }] })
      .populate('technician', 'fullName');
    if (!report) throw new AppError('Save a draft before generating the laboratory report.', 422);
    res.json({ report });
  } catch (error) { next(error); }
}

/* Admin Catalog Management Controller Methods */
export async function getAllParameters(req, res, next) {
  try {
    const list = await LabTestParameter.find({})
      .sort({ category: 1, displayOrder: 1, subcategory: 1, parameterName: 1 })
      .lean();
    res.json({ parameters: list });
  } catch (e) { next(e); }
}

export async function createParameter(req, res, next) {
  try {
    const {
      parameterName,
      category,
      subcategory,
      unit,
      referenceValue,
      normalMin,
      normalMax,
      criticalLow,
      criticalHigh,
      methodOrAnalyzer,
      analyzerTestCode,
      specimenType,
      resultType,
      cutoffType,
      referenceSource,
      verificationStatus,
      notes,
      demographicRanges
    } = req.body;

    if (!parameterName?.trim() || !category?.trim()) {
      throw new AppError('Parameter Name and Category are required.', 422);
    }
    const cleanName = parameterName.trim();
    const cleanCat = category.trim().toUpperCase();
    const cleanSub = subcategory ? subcategory.trim() : '';

    const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check for exact duplicate: same category + subcategory + parameterName
    const exactDuplicate = await LabTestParameter.findOne({
      category: cleanCat,
      subcategory: cleanSub,
      parameterName: new RegExp(`^${escapeRegex(cleanName)}$`, 'i')
    });

    if (exactDuplicate) {
      return res.status(409).json({
        message: 'Parameter already exists in this category.',
        parameter: exactDuplicate
      });
    }

    const isVerified = verificationStatus === 'Verified';
    const created = await LabTestParameter.create({
      parameterName: cleanName,
      category: cleanCat,
      subcategory: cleanSub,
      unit: unit ? unit.trim() : '',
      referenceValue: referenceValue ? referenceValue.trim() : '',
      normalMin: normalMin !== undefined && normalMin !== '' && normalMin !== null ? Number(normalMin) : null,
      normalMax: normalMax !== undefined && normalMax !== '' && normalMax !== null ? Number(normalMax) : null,
      criticalLow: criticalLow !== undefined && criticalLow !== '' && criticalLow !== null ? Number(criticalLow) : null,
      criticalHigh: criticalHigh !== undefined && criticalHigh !== '' && criticalHigh !== null ? Number(criticalHigh) : null,
      methodOrAnalyzer: methodOrAnalyzer ? methodOrAnalyzer.trim() : '',
      analyzerTestCode: analyzerTestCode ? analyzerTestCode.trim() : '',
      specimenType: specimenType ? specimenType.trim() : '',
      resultType: resultType ? resultType.trim() : 'Numeric',
      cutoffType: cutoffType ? cutoffType.trim() : 'Two-sided',
      referenceSource: referenceSource ? referenceSource.trim() : '',
      verificationStatus: isVerified ? 'Verified' : 'Requires Laboratory Verification',
      verifiedBy: isVerified ? (req.user?.fullName || 'Admin') : '',
      verifiedAt: isVerified ? new Date() : null,
      notes: notes ? notes.trim() : '',
      demographicRanges: Array.isArray(demographicRanges) ? demographicRanges : [],
      status: 'Active'
    });
    res.status(201).json({ parameter: created });
  } catch (e) { next(e); }
}

export async function updateParameter(req, res, next) {
  try {
    const existing = await LabTestParameter.findById(req.params.id);
    if (!existing) throw new AppError('Parameter not found.', 404);

    const {
      parameterName,
      category,
      subcategory,
      unit,
      referenceValue,
      normalMin,
      normalMax,
      criticalLow,
      criticalHigh,
      methodOrAnalyzer,
      analyzerTestCode,
      specimenType,
      resultType,
      cutoffType,
      referenceSource,
      verificationStatus,
      notes,
      demographicRanges,
      status,
      reason
    } = req.body;

    const previousSnapshot = {
      parameterName: existing.parameterName,
      unit: existing.unit,
      referenceValue: existing.referenceValue,
      normalMin: existing.normalMin,
      normalMax: existing.normalMax,
      criticalLow: existing.criticalLow,
      criticalHigh: existing.criticalHigh,
      methodOrAnalyzer: existing.methodOrAnalyzer,
      analyzerTestCode: existing.analyzerTestCode,
      specimenType: existing.specimenType,
      resultType: existing.resultType,
      cutoffType: existing.cutoffType,
      referenceSource: existing.referenceSource,
      verificationStatus: existing.verificationStatus,
      verifiedBy: existing.verifiedBy,
      verifiedAt: existing.verifiedAt,
      notes: existing.notes,
      demographicRanges: existing.demographicRanges
    };

    const update = {};
    if (parameterName) update.parameterName = parameterName.trim();
    if (category) update.category = category.trim().toUpperCase();
    if (subcategory !== undefined) update.subcategory = subcategory.trim();
    if (unit !== undefined) update.unit = unit.trim();
    if (referenceValue !== undefined) update.referenceValue = referenceValue.trim();
    if (normalMin !== undefined) update.normalMin = normalMin === '' || normalMin === null ? null : Number(normalMin);
    if (normalMax !== undefined) update.normalMax = normalMax === '' || normalMax === null ? null : Number(normalMax);
    if (criticalLow !== undefined) update.criticalLow = criticalLow === '' || criticalLow === null ? null : Number(criticalLow);
    if (criticalHigh !== undefined) update.criticalHigh = criticalHigh === '' || criticalHigh === null ? null : Number(criticalHigh);
    if (methodOrAnalyzer !== undefined) update.methodOrAnalyzer = methodOrAnalyzer.trim();
    if (analyzerTestCode !== undefined) update.analyzerTestCode = analyzerTestCode.trim();
    if (specimenType !== undefined) update.specimenType = specimenType.trim();
    if (resultType !== undefined) update.resultType = resultType.trim();
    if (cutoffType !== undefined) update.cutoffType = cutoffType.trim();
    if (referenceSource !== undefined) update.referenceSource = referenceSource.trim();
    if (verificationStatus !== undefined) {
      update.verificationStatus = verificationStatus;
      if (verificationStatus === 'Verified') {
        update.verifiedBy = req.user?.fullName || 'Admin';
        update.verifiedAt = new Date();
      } else {
        update.verifiedBy = '';
        update.verifiedAt = null;
      }
    }
    if (notes !== undefined) update.notes = notes.trim();
    if (demographicRanges !== undefined && Array.isArray(demographicRanges)) {
      update.demographicRanges = demographicRanges;
    }
    if (status) update.status = status;

    const auditEntry = {
      changedBy: req.user?.fullName || 'Admin',
      changedAt: new Date(),
      previousValues: previousSnapshot,
      newValues: update,
      reason: reason || 'Reference range updated'
    };

    const updated = await LabTestParameter.findByIdAndUpdate(
      req.params.id,
      {
        $set: update,
        $push: { auditHistory: { $each: [auditEntry], $slice: -20 } }
      },
      { new: true }
    );

    res.json({ parameter: updated });
  } catch (e) { next(e); }
}

export async function restoreParameter(req, res, next) {
  try {
    const existing = await LabTestParameter.findById(req.params.id);
    if (!existing) throw new AppError('Parameter not found.', 404);
    if (!existing.auditHistory || existing.auditHistory.length === 0) {
      throw new AppError('No audit history available to restore.', 400);
    }

    const lastAudit = existing.auditHistory[existing.auditHistory.length - 1];
    const prev = lastAudit.previousValues || {};

    const restored = await LabTestParameter.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          unit: prev.unit ?? existing.unit,
          referenceValue: prev.referenceValue ?? existing.referenceValue,
          normalMin: prev.normalMin ?? null,
          normalMax: prev.normalMax ?? null,
          criticalLow: prev.criticalLow ?? null,
          criticalHigh: prev.criticalHigh ?? null,
          methodOrAnalyzer: prev.methodOrAnalyzer ?? existing.methodOrAnalyzer,
          specimenType: prev.specimenType ?? existing.specimenType,
          resultType: prev.resultType ?? existing.resultType,
          cutoffType: prev.cutoffType ?? existing.cutoffType,
          referenceSource: prev.referenceSource ?? existing.referenceSource,
          verificationStatus: prev.verificationStatus ?? existing.verificationStatus,
          verifiedBy: prev.verifiedBy ?? existing.verifiedBy,
          verifiedAt: prev.verifiedAt ?? existing.verifiedAt,
          notes: prev.notes ?? existing.notes,
          demographicRanges: prev.demographicRanges ?? existing.demographicRanges
        },
        $push: {
          auditHistory: {
            changedBy: req.user?.fullName || 'Admin',
            changedAt: new Date(),
            previousValues: {
              unit: existing.unit,
              referenceValue: existing.referenceValue,
              normalMin: existing.normalMin,
              normalMax: existing.normalMax,
              criticalLow: existing.criticalLow,
              criticalHigh: existing.criticalHigh
            },
            newValues: prev,
            reason: 'Restored previous verified values from audit history'
          }
        }
      },
      { new: true }
    );

    res.json({ parameter: restored, message: 'Previous reference range restored successfully.' });
  } catch (e) { next(e); }
}

export async function deleteParameter(req, res, next) {
  try {
    const deleted = await LabTestParameter.findByIdAndDelete(req.params.id);
    if (!deleted) throw new AppError('Parameter not found.', 404);
    res.json({ message: 'Parameter removed successfully.', id: req.params.id });
  } catch (e) { next(e); }
}

