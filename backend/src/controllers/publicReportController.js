import LabReport from '../models/LabReport.js';
import LaboratorySettings from '../models/LaboratorySettings.js';
import ReferralHospital from '../models/ReferralHospital.js';
import { AppError } from '../utils/appError.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

/**
 * GET /api/reports/public/:token or GET /api/public/reports/:token
 * Public endpoint — no authentication required.
 * Returns ONLY sanitized approved laboratory results. No internal data exposed.
 */
export async function viewPublicReport(req, res, next) {
  try {
    const { token } = req.params;
    if (!token || token.length < 3) throw new AppError('Report not found.', 404);

    // 1. Search database for report matching token
    const report = await LabReport.findOne({
      'publicReport.token': token
    })
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType referralHospital laboratoryTests sampleTypes',
        populate: [
          { path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } },
          { path: 'sampleTypes', select: 'name' }
        ]
      })
      .populate({ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } })
      .populate('approvedBy', 'fullName')
      .populate('technician', 'fullName');

    // 2. Verify existence
    if (!report) {
      throw new AppError('Report not found.', 404);
    }

    // 3. Verify approval status
    if (!['Approved', 'Ready for Printing'].includes(report.status)) {
      throw new AppError('This report is not available for public viewing.', 403);
    }

    // 4. Check global system settings if sharing is enabled
    const settings = await LaboratorySettings.findOne({ key: 'default' }).lean();
    if (settings?.publicReportSharing?.enabled === false || report.publicReport?.enabled === false) {
      throw new AppError('Public report sharing is currently disabled.', 403);
    }

    // 5. Check token expiry
    if (report.publicReport?.expiresAt && new Date() > new Date(report.publicReport.expiresAt)) {
      throw new AppError('This report link has expired. Please contact the laboratory for a new link.', 410);
    }

    // Increment view count asynchronously
    LabReport.updateOne(
      { _id: report._id },
      { $inc: { 'publicReport.viewCount': 1 } }
    ).catch(() => {});

    // Build sanitized public data payload
    const patient = report.patient || {};
    const testCategories = new Map();
    const rawTests = report.laboratoryTests?.length ? report.laboratoryTests : (patient.laboratoryTests || []);
    const testsList = [];

    rawTests.forEach(t => {
      if (!t) return;
      let tName = '';
      let cat = 'GENERAL LABORATORY';
      if (typeof t === 'string') tName = t;
      else if (typeof t === 'object') {
        tName = t.name || '';
        cat = t.category?.name || 'GENERAL LABORATORY';
      }
      if (!tName) return;
      testsList.push(tName);
      if (!testCategories.has(cat)) testCategories.set(cat, []);
      if (!testCategories.get(cat).includes(tName)) testCategories.get(cat).push(tName);
    });

    const formattedTests = Array.from(testCategories.entries()).map(([catName, params]) => ({
      categoryName: catName,
      testName: params.join(', '),
      parameters: params.map(pName => ({ name: pName }))
    }));

    const results = (report.results || []).map(r => ({
      name: r.sampleName,
      sampleName: r.sampleName,
      parameter: r.sampleName,
      result: r.result,
      unit: r.unit || '',
      referenceValue: r.referenceValue || '',
      flag: r.flag || '',
      remarks: r.remarks || ''
    }));

    const publicData = {
      laboratoryName: 'ETU DIAGNOSTIC LABORATORY',
      headerTitle: 'FINAL APPROVED REPORT',
      status: 'FINAL APPROVED',
      reportNumber: report.reportNumber || '',
      patientName: patient.name || '',
      patientId: patient.patientId || '',
      age: patient.age || '',
      sex: patient.sex || '',
      reportDate: report.approvedDate || report.approvalDate || report.updatedDate || report.createdDate,
      referralHospital: patient.referralHospital || '',
      sampleTypes: (patient.sampleTypes || []).map(s => s?.name || s).filter(Boolean),
      testCategories: Object.fromEntries(testCategories),
      tests: formattedTests.length ? formattedTests : [{ categoryName: 'GENERAL LABORATORY', testName: testsList.join(', ') || 'Diagnostic Investigation', parameters: [] }],
      equipment: report.equipment || [],
      results,
      comments: report.comments || '',
      collectorName: report.technician?.fullName || '',
      approvedBy: report.approvedBy?.fullName || '',
      approvedDate: report.approvedDate || report.approvalDate || '',
      branchName: report.branchName || 'Main',
      allowPdfDownload: settings?.publicReportSharing?.allowPdfDownload !== false
    };

    res.json({ report: publicData });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/reports/public/:token/pdf or GET /api/public/reports/:token/pdf
 * Public endpoint — download PDF of an approved report.
 */
export async function downloadPublicPdf(req, res, next) {
  try {
    const { token } = req.params;
    const settings = await LaboratorySettings.findOne({ key: 'default' }).lean();
    if (settings?.publicReportSharing?.enabled === false) throw new AppError('Public report sharing is currently disabled.', 403);
    if (settings?.publicReportSharing?.allowPdfDownload === false) throw new AppError('PDF download is not available for public reports.', 403);

    const report = await LabReport.findOne({
      'publicReport.token': token,
      'publicReport.enabled': true
    });
    if (!report) throw new AppError('Report not found.', 404);
    if (!['Approved', 'Ready for Printing'].includes(report.status)) throw new AppError('This report is not available for public viewing.', 403);
    if (report.publicReport.expiresAt && new Date() > new Date(report.publicReport.expiresAt)) {
      throw new AppError('This report link has expired.', 410);
    }

    const fullReport = await LabReport.findById(report._id)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType referralHospital laboratoryTests sampleTypes',
        populate: [
          { path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } },
          { path: 'sampleTypes', select: 'name price' }
        ]
      })
      .populate('technician', 'fullName')
      .populate('approvedBy', 'fullName');

    if (!fullReport || !fullReport.patient) throw new AppError('Report data unavailable.', 404);
    const p = fullReport.patient;

    const __filename2 = fileURLToPath(import.meta.url);
    const __dirname2 = path.dirname(__filename2);
    const logoCandidates = [
      path.resolve(process.cwd(), 'backend', 'src', 'picture', 'etu.jpg'),
      path.resolve(process.cwd(), 'src', 'picture', 'etu.jpg'),
      path.resolve(__dirname2, '../picture/etu.jpg'),
      path.resolve(process.cwd(), 'backend', 'src', 'picture', 'logo3.jpg'),
      path.resolve(process.cwd(), 'src', 'picture', 'logo3.jpg'),
      path.resolve(__dirname2, '../picture/logo3.jpg')
    ];
    let logoFile = logoCandidates[0];
    for (const c of logoCandidates) { if (fs.existsSync(c)) { logoFile = c; break; } }

    res.attachment(`ETU-${p.patientId}-report.pdf`).type('application/pdf');
    const d = new PDFDocument({ size: 'A4', margin: 46 });
    d.pipe(res);

    if (fs.existsSync(logoFile)) {
      const logoBuf = fs.readFileSync(logoFile);
      d.image(logoBuf, 167.6, 10, { width: 260, align: 'center' });
      d.fillColor('#075c91').fontSize(22).text('ETU Diagnostic Laboratory', 46, 120, { align: 'center', width: 503 });
    } else {
      d.rect(46, 42, 58, 58).fill('#075c91');
      d.fillColor('#fff').fontSize(20).text('ETU', 55, 62);
      d.fillColor('#075c91').fontSize(22).text('ETU Diagnostic Laboratory', 116, 48);
    }
    d.moveTo(46, 168).lineTo(549, 168).stroke('#075c91');
    d.fillColor('#1f3640').fontSize(11)
      .text(`Patient Name: ${p.name}`, 46, 180)
      .text(`Patient ID: ${p.patientId}`, 46, 198)
      .text(`Age / Sex: ${p.age} / ${p.sex}`, 300, 180)
      .text(`Phone: ${p.phone || 'Not recorded'}`, 300, 198);

    let curY = 222;
    if (p.referralHospital) {
      const refDoc = await ReferralHospital.findOne({ name: p.referralHospital }).lean();
      const refAddress = refDoc?.address || refDoc?.city || p.address || 'Not recorded';
      d.text(`Referral Hospital Name: ${p.referralHospital}`, 46, 218)
        .text(`Referral Hospital Address: ${refAddress}`, 300, 218);
      curY = 242;
    }

    const categoriesMap = new Map();
    (p.laboratoryTests || []).forEach(t => {
      const catName = t.category?.name || 'GENERAL LABORATORY';
      if (!categoriesMap.has(catName)) categoriesMap.set(catName, []);
      categoriesMap.get(catName).push(t.name || t);
    });
    d.fontSize(11.5).fillColor('#075c91').text('REQUESTED LABORATORY TEST TYPES', 46, curY); curY += 18;
    if (categoriesMap.size > 0) {
      categoriesMap.forEach((testsList, catName) => {
        d.fontSize(10.5).fillColor('#075c91').text(catName.toUpperCase(), 46, curY); curY += 15;
        testsList.forEach(tn => { d.fontSize(10).fillColor('#1f3640').text(`• ${tn}`, 56, curY); curY += 14; });
        curY += 4;
      });
    } else { d.fontSize(10).fillColor('#1f3640').text('• Not recorded', 56, curY); curY += 14; }

    d.fontSize(11.5).fillColor('#075c91').text('Equipment Used', 46, curY); curY += 16;
    d.fillColor('#1f3640').fontSize(10).text(fullReport.equipment.join(', ') || 'Standard Analyzer', 46, curY, { width: 500 }); curY += 24;

    let y = curY;
    d.fillColor('#075c91').rect(46, y, 503, 24).fill();
    d.fillColor('#fff').fontSize(10.5).text('Parameter', 55, y + 6).text('Result', 205, y + 6).text('SI Unit', 285, y + 6).text('Reference Range', 350, y + 6).text('Flag', 490, y + 6);
    y += 24;
    fullReport.results.forEach((x, i) => {
      if (y > 710) { d.addPage(); y = 55; }
      if (i % 2 === 0) d.fillColor('#f1f7fa').rect(46, y, 503, 24).fill();
      const flagVal = x.flag || '—';
      d.fillColor('#1f3640').fontSize(10)
        .text(x.sampleName, 55, y + 6, { width: 145 })
        .text(x.result, 205, y + 6, { width: 75 })
        .text(x.unit || '', 285, y + 6, { width: 60 })
        .text(x.referenceValue, 350, y + 6, { width: 125 });
      d.fillColor('#1f3640').fontSize(10.5).text(flagVal, 490, y + 6);
      y += 24;
    });
    d.fillColor('#1f3640').fontSize(11)
      .text(`Collected by: ${fullReport.technician?.fullName || 'Not recorded'}`, 46, y + 28)
      .text(`Approved by: ${fullReport.approvedBy?.fullName || 'Not recorded'}`, 46, y + 46)
      .text(`Date and time: ${new Date(fullReport.approvedDate || fullReport.updatedDate).toLocaleString()}`, 46, y + 64);
    d.fontSize(10).fillColor('#075c91').text('ETU Diagnostic Laboratory', 46, 788, { align: 'center', width: 503 });
    d.end();
  } catch (e) {
    next(e);
  }
}
