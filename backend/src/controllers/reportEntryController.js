import LabReport from '../models/LabReport.js';
import LabTestParameter from '../models/LabTestParameter.js';
import ActivityLog from '../models/ActivityLog.js';
import { AppError } from '../utils/appError.js';
import { equipmentPayload } from '../constants/equipment.js';

export function parameters(req, res) {
  res.json(equipmentPayload());
}

/**
 * GET /api/report-entry/catalog
 * Returns all active laboratory parameters grouped by category and subcategory.
 */
export async function getCatalog(req, res, next) {
  try {
    const list = await LabTestParameter.find({ status: 'Active' })
      .sort({ category: 1, displayOrder: 1, parameterName: 1 })
      .lean();

    const categoriesMap = {};
    list.forEach(p => {
      if (!categoriesMap[p.category]) {
        categoriesMap[p.category] = {
          name: p.category,
          subcategories: {},
          parameters: []
        };
      }

      const catObj = categoriesMap[p.category];
      const paramItem = {
        _id: p._id,
        parameterName: p.parameterName,
        category: p.category,
        subcategory: p.subcategory || '',
        unit: p.unit || '',
        referenceValue: p.referenceValue || '',
        normalMin: p.normalMin,
        normalMax: p.normalMax,
        displayOrder: p.displayOrder,
        editable: p.editable !== false
      };

      catObj.parameters.push(paramItem);

      if (p.subcategory) {
        if (!catObj.subcategories[p.subcategory]) {
          catObj.subcategories[p.subcategory] = [];
        }
        catObj.subcategories[p.subcategory].push(paramItem);
      }
    });

    res.json({ categories: Object.values(categoriesMap), rawParameters: list });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/report-entry/admin/parameters
 * Admin management list of all parameters (active & inactive).
 */
export async function listAdminParameters(req, res, next) {
  try {
    const parameters = await LabTestParameter.find().sort({ category: 1, displayOrder: 1 }).lean();
    res.json({ parameters });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/report-entry/admin/parameters
 * Create a new parameter definition.
 */
export async function createParameter(req, res, next) {
  try {
    const { parameterName, category, subcategory, unit, referenceValue, normalMin, normalMax, displayOrder } = req.body;
    if (!parameterName?.trim() || !category?.trim()) {
      throw new AppError('Parameter Name and Category are required.', 422);
    }
    const created = await LabTestParameter.create({
      parameterName: parameterName.trim(),
      category: category.trim().toUpperCase(),
      subcategory: subcategory?.trim() || '',
      unit: unit?.trim() || '',
      referenceValue: referenceValue?.trim() || '',
      normalMin: typeof normalMin === 'number' ? normalMin : null,
      normalMax: typeof normalMax === 'number' ? normalMax : null,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0
    });

    await ActivityLog.create({
      action: 'Created laboratory parameter',
      entityType: 'LabTestParameter',
      user: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: JSON.stringify({ parameterName: created.parameterName, category: created.category })
    });

    res.status(201).json({ parameter: created });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/report-entry/admin/parameters/:id
 * Update reference ranges, SI units, display order, etc.
 */
export async function updateParameter(req, res, next) {
  try {
    const { parameterName, category, subcategory, unit, referenceValue, normalMin, normalMax, displayOrder, status } = req.body;
    const param = await LabTestParameter.findById(req.params.id);
    if (!param) throw new AppError('Parameter not found.', 404);

    if (parameterName) param.parameterName = parameterName.trim();
    if (category) param.category = category.trim().toUpperCase();
    if (subcategory !== undefined) param.subcategory = subcategory.trim();
    if (unit !== undefined) param.unit = unit.trim();
    if (referenceValue !== undefined) param.referenceValue = referenceValue.trim();
    if (normalMin !== undefined) param.normalMin = typeof normalMin === 'number' ? normalMin : null;
    if (normalMax !== undefined) param.normalMax = typeof normalMax === 'number' ? normalMax : null;
    if (displayOrder !== undefined) param.displayOrder = typeof displayOrder === 'number' ? displayOrder : 0;
    if (status) param.status = status;

    await param.save();

    await ActivityLog.create({
      action: 'Updated laboratory parameter',
      entityType: 'LabTestParameter',
      user: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: JSON.stringify({ id: param._id, name: param.parameterName })
    });

    res.json({ parameter: param });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/report-entry/admin/parameters/:id
 * Delete or soft-delete parameter.
 */
export async function deleteParameter(req, res, next) {
  try {
    const param = await LabTestParameter.findByIdAndDelete(req.params.id);
    if (!param) throw new AppError('Parameter not found.', 404);

    await ActivityLog.create({
      action: 'Deleted laboratory parameter',
      entityType: 'LabTestParameter',
      user: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: JSON.stringify({ name: param.parameterName })
    });

    res.json({ message: 'Parameter deleted successfully.' });
  } catch (error) {
    next(error);
  }
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
