import LabReport from '../models/LabReport.js';
import LabTestParameter from '../models/LabTestParameter.js';
import { AppError } from '../utils/appError.js';
import { equipmentPayload } from '../constants/equipment.js';

export function parameters(req, res) {
  res.json(equipmentPayload());
}

export async function catalog(req, res, next) {
  try {
    const list = await LabTestParameter.find({ status: 'Active' })
      .sort({ displayOrder: 1, category: 1, subcategory: 1, parameterName: 1 })
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
      .populate({ path: 'patient', select: 'patientId barcode name age sex phone laboratoryTests sampleTypes', populate: [{ path: 'laboratoryTests', select: 'name category', populate: { path: 'category', select: 'name' } }, { path: 'sampleTypes', select: 'name' }] })
      .populate('technician', 'fullName');
    if (!report) throw new AppError('Save a draft before generating the laboratory report.', 422);
    res.json({ report });
  } catch (error) { next(error); }
}

/* Admin Catalog Management Controller Methods */
export async function getAllParameters(req, res, next) {
  try {
    const list = await LabTestParameter.find({})
      .sort({ category: 1, subcategory: 1, displayOrder: 1, parameterName: 1 })
      .lean();
    res.json({ parameters: list });
  } catch (e) { next(e); }
}

export async function createParameter(req, res, next) {
  try {
    const { parameterName, category, subcategory, unit, referenceValue, normalMin, normalMax } = req.body;
    if (!parameterName?.trim() || !category?.trim()) {
      throw new AppError('Parameter Name and Category are required.', 422);
    }
    const created = await LabTestParameter.create({
      parameterName: parameterName.trim(),
      category: category.trim().toUpperCase(),
      subcategory: subcategory ? subcategory.trim() : '',
      unit: unit ? unit.trim() : '',
      referenceValue: referenceValue ? referenceValue.trim() : '',
      normalMin: normalMin !== undefined && normalMin !== '' ? Number(normalMin) : null,
      normalMax: normalMax !== undefined && normalMax !== '' ? Number(normalMax) : null,
      status: 'Active'
    });
    res.status(201).json({ parameter: created });
  } catch (e) { next(e); }
}

export async function updateParameter(req, res, next) {
  try {
    const { parameterName, category, subcategory, unit, referenceValue, normalMin, normalMax, status } = req.body;
    const update = {};
    if (parameterName) update.parameterName = parameterName.trim();
    if (category) update.category = category.trim().toUpperCase();
    if (subcategory !== undefined) update.subcategory = subcategory.trim();
    if (unit !== undefined) update.unit = unit.trim();
    if (referenceValue !== undefined) update.referenceValue = referenceValue.trim();
    if (normalMin !== undefined) update.normalMin = normalMin === '' || normalMin === null ? null : Number(normalMin);
    if (normalMax !== undefined) update.normalMax = normalMax === '' || normalMax === null ? null : Number(normalMax);
    if (status) update.status = status;

    const updated = await LabTestParameter.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) throw new AppError('Parameter not found.', 404);
    res.json({ parameter: updated });
  } catch (e) { next(e); }
}

export async function deleteParameter(req, res, next) {
  try {
    const deleted = await LabTestParameter.findByIdAndDelete(req.params.id);
    if (!deleted) throw new AppError('Parameter not found.', 404);
    res.json({ message: 'Parameter removed successfully.', id: req.params.id });
  } catch (e) { next(e); }
}
