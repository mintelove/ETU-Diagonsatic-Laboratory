import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import SampleCollection from '../models/SampleCollection.js';
import LabReport from '../models/LabReport.js';
import CounsellingRecord from '../models/CounsellingRecord.js';
import ReferralHospital from '../models/ReferralHospital.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';

const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const startOfDay = value => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; };
const endOfDay = value => { const date = new Date(value); date.setHours(23, 59, 59, 999); return date; };
const number = (value, fallback, max) => Math.min(max, Math.max(1, Number(value) || fallback));

function patientFilter(query) {
  const filter = {};
  const q = String(query.q || '').trim();
  if (q) filter.$or = ['patientId', 'name', 'phone', 'barcode', 'referralHospital'].map(field => ({ [field]: { $regex: q, $options: 'i' } }));
  if (query.patientType && ['Self', 'Referral'].includes(query.patientType)) filter.registrationType = query.patientType;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.sampleType) filter.sampleTypes = query.sampleType;
  if (query.referralHospital) filter.referralHospital = query.referralHospital;
  if (query.receptionist) filter.registeredBy = query.receptionist;
  let from, to;
  const today = startOfDay(new Date());
  if (query.period === 'today') [from, to] = [today, endOfDay(today)];
  if (query.period === 'yesterday') { const d = new Date(today); d.setDate(d.getDate() - 1); [from, to] = [d, endOfDay(d)]; }
  if (query.period === 'week') { from = new Date(today); from.setDate(from.getDate() - 6); to = endOfDay(today); }
  if (query.period === 'lastWeek') { to = new Date(today); to.setDate(to.getDate() - 1); to = endOfDay(to); from = new Date(to); from.setDate(from.getDate() - 6); from = startOfDay(from); }
  if (query.period === 'month') { from = new Date(today.getFullYear(), today.getMonth(), 1); to = endOfDay(today); }
  if (query.period === 'lastMonth') { from = new Date(today.getFullYear(), today.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); to = endOfDay(to); }
  if (query.period === 'year') { from = new Date(today.getFullYear(), 0, 1); to = endOfDay(today); }
  if (query.date) [from, to] = [startOfDay(query.date), endOfDay(query.date)];
  if (query.from) from = startOfDay(query.from); if (query.to) to = endOfDay(query.to);
  if (from || to) filter.registrationDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  return filter;
}
function reportStatus(patientId) { return { $lookup: { from: 'labreports', let: { patientId }, pipeline: [{ $match: { $expr: { $eq: ['$patient', '$$patientId'] } } }, { $sort: { createdDate: -1 } }, { $limit: 1 }], as: 'report' } }; }
function normalise(patient) { return { ...patient, samples: patient.sampleTypes?.map(s => s.name).join(', ') || '—', sampleCount: patient.sampleTypes?.length || 0, reportStatus: patient.report?.[0]?.status || 'Not started', collectionStatus: patient.collection?.[0]?.status || 'Pending' }; }

export async function patients(req, res, next) { try {
  const filter = patientFilter(req.query), page = number(req.query.page, 1, 100000), limit = number(req.query.limit, 15, 100), sortField = ['registrationDate','name','grandTotal','patientId'].includes(req.query.sort) ? req.query.sort : 'registrationDate', direction = req.query.order === 'asc' ? 1 : -1;
  const pipeline = [{ $match: filter }, { $lookup: { from: 'sampletypes', localField: 'sampleTypes', foreignField: '_id', as: 'sampleTypes' } }, { $lookup: { from: 'users', localField: 'registeredBy', foreignField: '_id', as: 'registeredBy' } }, { $lookup: { from: 'samplecollections', localField: '_id', foreignField: 'patient', as: 'collection' } }, reportStatus('$_id')];
  if (req.query.reportStatus) pipeline.push({ $match: { 'report.status': req.query.reportStatus } });
  const [data] = await Patient.aggregate([...pipeline, { $facet: { rows: [{ $sort: { [sortField]: direction } }, { $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } }]);
  res.json({ patients: data.rows.map(normalise), pagination: { page, limit, total: data.total[0]?.count || 0, pages: Math.ceil((data.total[0]?.count || 0) / limit) } });
} catch (error) { next(error); } }

export async function patientProfile(req, res, next) { try {
  const patient = await Patient.findById(req.params.id).populate('sampleTypes','name price').populate('registeredBy','fullName').populate('collectedBy','fullName');
  if (!patient) throw new AppError('Patient not found.', 404);
  const [payment, collection, report, counselling, previousVisits] = await Promise.all([Payment.findOne({ patient: patient.id }).populate('receivedBy','fullName'), SampleCollection.findOne({ patient: patient.id }).populate('collector','fullName'), LabReport.findOne({ patient: patient.id }).sort({ createdDate: -1 }).populate('approvedBy','fullName'), CounsellingRecord.find({ patient: patient.id }).populate('counselledBy','fullName').sort({ completedAt: -1, createdDate: -1 }), Patient.find({ phone: patient.phone }).select('patientId registrationDate').sort({ registrationDate: -1 })]);
  res.json({ patient, payment, collection, report, counselling, previousVisits });
} catch (error) { next(error); } }

export async function dashboard(req, res, next) { try {
  const today = startOfDay(new Date()), week = new Date(today); week.setDate(week.getDate() - 6);
  const [summary, samples, gender, age, topSamples, topHospitals, trend, income] = await Promise.all([
    Patient.aggregate([{ $facet: { total: [{ $count: 'count' }], today: [{ $match: { registrationDate: { $gte: today } } }, { $count: 'count' }], week: [{ $match: { registrationDate: { $gte: week } } }, { $count: 'count' }], referral: [{ $match: { registrationType: 'Referral' } }, { $count: 'count' }], self: [{ $match: { registrationType: 'Self' } }, { $count: 'count' }], todayIncome: [{ $match: { paymentStatus: 'Paid', paymentDate: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }], totalIncome: [{ $match: { paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }] } }]),
    SampleCollection.countDocuments(), Patient.aggregate([{ $group: { _id: '$sex', value: { $sum: 1 } } }]), Patient.aggregate([{ $bucket: { groupBy: '$age', boundaries: [0, 18, 31, 46, 61, 131], default: 'Other', output: { value: { $sum: 1 } } } }]),
    Patient.aggregate([{ $unwind: '$sampleTypes' }, { $lookup: { from: 'sampletypes', localField: 'sampleTypes', foreignField: '_id', as: 'sample' } }, { $unwind: '$sample' }, { $group: { _id: '$sample.name', value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 6 }]), Patient.aggregate([{ $match: { registrationType: 'Referral', referralHospital: { $ne: '' } } }, { $group: { _id: '$referralHospital', value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 6 }]),
    Patient.aggregate([{ $match: { registrationDate: { $gte: week } } }, { $group: { _id: { $dateToString: { format: '%d %b', date: '$registrationDate' } }, value: { $sum: 1 } } }, { $sort: { _id: 1 } }]), Patient.aggregate([{ $match: { paymentStatus: 'Paid', paymentDate: { $gte: week } } }, { $group: { _id: { $dateToString: { format: '%d %b', date: '$paymentDate' } }, value: { $sum: '$grandTotal' } } }, { $sort: { _id: 1 } }])
  ]);
  const s = summary[0]; res.json({ summary: { total: s.total[0]?.count || 0, today: s.today[0]?.count || 0, week: s.week[0]?.count || 0, referral: s.referral[0]?.count || 0, self: s.self[0]?.count || 0, todayIncome: s.todayIncome[0]?.total || 0, totalIncome: s.totalIncome[0]?.total || 0, samples }, charts: { gender: gender.map(x => ({ name: x._id, value: x.value })), age: age.map(x => ({ name: x._id === 0 ? '0–17' : x._id === 18 ? '18–30' : x._id === 31 ? '31–45' : x._id === 46 ? '46–60' : '61+', value: x.value })), topSamples: topSamples.map(x => ({ name: x._id, value: x.value })), topHospitals: topHospitals.map(x => ({ name: x._id, value: x.value })), trend: trend.map(x => ({ name: x._id, value: x.value })), income: income.map(x => ({ name: x._id, value: x.value })) } });
} catch (error) { next(error); } }

export async function hospitals(req, res, next) { try { res.json({ hospitals: await ReferralHospital.find().populate('createdBy','fullName').sort({ name: 1 }) }); } catch (error) { next(error); } }
export async function createHospital(req, res, next) { try { const hospital = await ReferralHospital.create({ ...req.body, createdBy: req.user.id }); await recordActivity(req.user.id,'Created referral hospital','ReferralHospital',hospital.id,hospital.name); res.status(201).json({ hospital }); } catch (error) { next(error); } }
export async function updateHospital(req, res, next) { try { const hospital = await ReferralHospital.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!hospital) throw new AppError('Referral hospital not found.',404); await recordActivity(req.user.id,'Updated referral hospital','ReferralHospital',hospital.id,hospital.name); res.json({ hospital }); } catch (error) { next(error); } }
export async function setHospitalStatus(req, res, next) { try { const hospital = await ReferralHospital.findByIdAndUpdate(req.params.id,{ active:req.body.active },{ new:true }); if (!hospital) throw new AppError('Referral hospital not found.',404); res.json({ hospital }); } catch (error) { next(error); } }
export async function deleteHospital(req, res, next) { try { const hospital = await ReferralHospital.findByIdAndDelete(req.params.id); if (!hospital) throw new AppError('Referral hospital not found.',404); await recordActivity(req.user.id,'Deleted referral hospital','ReferralHospital',hospital.id,hospital.name); res.status(204).send(); } catch (error) { next(error); } }

export async function exportPatients(req, res, next) { try { const list = await Patient.find(patientFilter(req.query)).populate('sampleTypes','name').populate('registeredBy','fullName').sort({registrationDate:-1}); const headers=['Patient ID','Barcode','Patient Name','Age','Sex','Phone Number','Patient Type','Referral Hospital','Sample Types','Number of Tests','Total Amount Paid','Payment Status','Receptionist Name','Registration Date','Registration Time','Current Status']; const rows=list.map(p=>[p.patientId,p.barcode,p.name,p.age,p.sex,p.phone,p.registrationType,p.referralHospital,p.sampleTypes.map(s=>s.name).join('; '),p.sampleTypes.length,p.grandTotal,p.paymentStatus,p.registeredBy?.fullName||'',p.registrationDate.toLocaleDateString(),p.registrationDate.toLocaleTimeString(),p.active?'Active':'Inactive']); const format=req.params.format;
  await recordActivity(req.user.id,'Exported patient registry','Export',null,format); if(format==='csv')return res.attachment('etu-patient-registry.csv').type('text/csv').send([headers,...rows].map(row=>row.map(escape).join(',')).join('\n')); if(format==='xlsx'){const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Patient Registry');sheet.addRow(['ETU Diagnostic Laboratory — Patient Registry']);sheet.mergeCells(1,1,1,headers.length);sheet.getRow(1).font={bold:true,size:16,color:{argb:'FF075C91'}};sheet.addRow(headers);sheet.getRow(2).font={bold:true};rows.forEach(row=>sheet.addRow(row));sheet.columns.forEach(column=>column.width=20);res.attachment('etu-patient-registry.xlsx');await book.xlsx.write(res);return res.end();} if(format==='pdf'){res.attachment('etu-patient-registry.pdf');const doc=new PDFDocument({margin:28,size:'A4',layout:'landscape'});doc.pipe(res);doc.fontSize(17).fillColor('#075C91').text('ETU Diagnostic Laboratory');doc.fontSize(10).fillColor('#263238').text(`Patient Registry  •  Generated ${new Date().toLocaleString()} by ${req.user.fullName}`);doc.moveDown();doc.fontSize(6).text(headers.join(' | '));rows.forEach(row=>doc.text(row.join(' | ')));return doc.end();}throw new AppError('Unsupported export format.',422);
} catch(error){next(error);} }
