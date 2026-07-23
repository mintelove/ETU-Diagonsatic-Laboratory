import LabReport from '../models/LabReport.js';
import { AppError } from '../utils/appError.js';
import { equipmentPayload } from '../constants/equipment.js';

export function parameters(req, res) { res.json(equipmentPayload()); }

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
