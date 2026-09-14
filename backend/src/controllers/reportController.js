import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import StockItem from '../models/StockItem.js';
import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import Receipt from '../models/Receipt.js';
import SampleCollection from '../models/SampleCollection.js';
import User from '../models/User.js';
import LabReport from '../models/LabReport.js';
import { stockLevel } from '../constants/stock.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';
import { ROLES } from '../constants/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLogoPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'backend', 'src', 'picture', 'etu.jpg'),
    path.resolve(process.cwd(), 'src', 'picture', 'etu.jpg'),
    path.resolve(__dirname, '../picture/etu.jpg'),
    path.resolve(process.cwd(), 'backend', 'src', 'picture', 'logo3.jpg'),
    path.resolve(process.cwd(), 'src', 'picture', 'logo3.jpg'),
    path.resolve(__dirname, '../picture/logo3.jpg')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

const getLogoBase64 = () => {
  try {
    const p = getLogoPath();
    if (fs.existsSync(p)) {
      const ext = path.extname(p).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (e) {}
  return '';
};

const rows = async () => {
  const items = await StockItem.find().populate('category', 'name').sort({ itemName: 1 });
  return items.map(i => ({
    name: i.itemName,
    code: i.itemCode,
    category: i.category?.name || '',
    unit: i.unit,
    price: i.purchasePrice,
    current: i.currentQuantity,
    used: i.usedQuantity,
    remaining: i.currentQuantity - i.usedQuantity,
    level: stockLevel(i).label
  }));
};

const meta = (req) => `Generated ${new Date().toLocaleString()} by ${req.user.fullName}`;

export async function exportCsv(req, res, next) {
  try {
    const data = await rows();
    const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
    const csv = [
      'Item Name,Item Code,Category,Unit,Purchase Price (ETB),Current Quantity,Used Quantity,Remaining Quantity,Stock Status',
      ...data.map(r => [r.name, r.code, r.category, r.unit, r.price, r.current, r.used, r.remaining, r.level].map(esc).join(','))
    ].join('\n');
    res.attachment('etu-stock-report.csv').type('text/csv').send(csv);
  } catch (e) {
    next(e);
  }
}

export async function exportExcel(req, res, next) {
  try {
    const data = await rows();
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Stock Report');
    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'ETU Diagnostic Laboratory - Stock Report';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075C91' } };
    sheet.addRow([meta(req)]);
    sheet.mergeCells('A2:I2');
    sheet.addRow([]);
    sheet.addRow(['Item Name', 'Item Code', 'Category', 'Unit', 'Purchase Price (ETB)', 'Current', 'Used', 'Remaining', 'Stock Status']);
    sheet.getRow(4).font = { bold: true };
    data.forEach(r => sheet.addRow([r.name, r.code, r.category, r.unit, r.price, r.current, r.used, r.remaining, r.level]));
    sheet.columns.forEach(c => c.width = 18);
    sheet.getColumn(1).width = 28;
    sheet.getColumn(5).numFmt = '#,##0.00';
    res.attachment('etu-stock-report.xlsx');
    await book.xlsx.write(res);
    res.end();
  } catch (e) {
    next(e);
  }
}

export async function exportPdf(req, res, next) {
  try {
    const data = await rows();
    res.attachment('etu-stock-report.pdf');
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    doc.pipe(res);
    doc.fillColor('#075C91').fontSize(20).text('ETU Diagnostic Laboratory');
    doc.fillColor('#263238').fontSize(13).text('Stock Management Report');
    doc.fontSize(8).fillColor('#546E7A').text(meta(req));
    doc.moveDown();
    const x = [36, 165, 235, 320, 378, 438, 493, 545, 602], headers = ['Item', 'Code', 'Category', 'Unit', 'Price (ETB)', 'Current', 'Used', 'Remain', 'Status'];
    doc.fillColor('#075C91').fontSize(8);
    headers.forEach((h, i) => doc.text(h, x[i], 120, { width: (x[i + 1] || 760) - x[i] - 4 }));
    let y = 138;
    data.forEach(r => {
      if (y > 530) { doc.addPage(); y = 50; }
      doc.fillColor('#263238').fontSize(7);
      [r.name, r.code, r.category, r.unit, r.price, r.current, r.used, r.remaining, r.level].forEach((v, i) => doc.text(String(v), x[i], y, { width: (x[i + 1] || 760) - x[i] - 4, height: 16, ellipsis: true }));
      doc.moveTo(36, y + 16).lineTo(760, y + 16).strokeColor('#E0E7E9').stroke();
      y += 20;
    });
    doc.end();
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/reports/transactions
 * Returns individual money transactions filtered by Single Date, Date Range, Receptionist, Collector, or Branch.
 */
export async function getTransactionsReport(req, res, next) {
  try {
    const { mode, date, dateFrom, dateTo, receptionist, collector } = req.query;

    let startDate, endDate, reportMode = mode || 'single', reportDateLabel = '';

    if (reportMode === 'range' || (dateFrom && dateTo)) {
      reportMode = 'range';
      const fromStr = String(dateFrom || date || new Date().toISOString().slice(0, 10)).trim();
      const toStr = String(dateTo || date || new Date().toISOString().slice(0, 10)).trim();

      const [fY, fM, fD] = fromStr.split('-').map(Number);
      const [tY, tM, tD] = toStr.split('-').map(Number);

      startDate = new Date(fY, fM - 1, fD, 0, 0, 0, 0);
      endDate = new Date(tY, tM - 1, tD, 23, 59, 59, 999);

      if (startDate > endDate) {
        return res.status(400).json({ message: 'From Date cannot be later than To Date.' });
      }

      reportDateLabel = `${fromStr} — ${toStr}`;
    } else {
      /* Single‑date mode */
      const ds = String(date || new Date().toISOString().slice(0, 10)).trim();
      const [dY, dM, dD] = ds.split('-').map(Number);
      startDate = new Date(dY, dM - 1, dD, 0, 0, 0, 0);
      endDate = new Date(dY, dM - 1, dD, 23, 59, 59, 999);
      reportDateLabel = ds;
    }

    /* Sub Admin clamp */
    const isSubAdmin = req.user.role === 'Sub Admin' || req.user.role === 'sub_admin';
    const now = new Date();
    const fourDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (isSubAdmin) {
      if (!startDate || startDate < fourDaysAgo) startDate = fourDaysAgo;
      if (!endDate || endDate > todayEnd) endDate = todayEnd;
      reportMode = 'range';
      reportDateLabel = `Past 4 Days (${fourDaysAgo.toISOString().slice(0, 10)} to ${todayEnd.toISOString().slice(0, 10)})`;
    }

    const branchFilter = req.user.role !== 'Admin'
      ? (req.user.branchName || 'Main')
      : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : (req.query.branch && req.query.branch !== 'All' ? req.query.branch : null));

    const query = {
      $or: [
        { registrationDate: { $gte: startDate, $lte: endDate } },
        { paymentDate: { $gte: startDate, $lte: endDate } }
      ]
    };
    if (branchFilter) query.branchName = branchFilter;

    if (receptionist && receptionist !== 'all' && mongoose.Types.ObjectId.isValid(receptionist)) {
      query.registeredBy = receptionist;
    }

    let patients = await Patient.find(query)
      .populate('registeredBy', 'fullName username role')
      .populate('collectedBy', 'fullName username role')
      .populate({ path: 'laboratoryTests', select: 'name category subcategory price', populate: { path: 'category', select: 'name' } })
      .populate('sampleTypes', 'name price')
      .sort({ registrationDate: -1 })
      .lean();

    const patientIds = patients.map(p => p._id);
    const [collections, reportsList, paymentsList] = await Promise.all([
      SampleCollection.find({ patient: { $in: patientIds } })
        .populate('collector', 'fullName username role')
        .lean(),
      LabReport.find({ patient: { $in: patientIds } })
        .populate({ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } })
        .sort({ createdDate: -1 })
        .lean(),
      Payment.find({ patient: { $in: patientIds } })
        .populate('receivedBy', 'fullName username role')
        .populate('lastModifiedBy', 'fullName username role')
        .sort({ paidAt: -1 })
        .lean()
    ]);

    const collectionMap = new Map();
    collections.forEach(col => {
      collectionMap.set(String(col.patient), col);
    });

    const reportMap = new Map();
    reportsList.forEach(rep => {
      const pid = String(rep.patient);
      if (!reportMap.has(pid)) reportMap.set(pid, rep);
    });

    const paymentMap = new Map();
    paymentsList.forEach(pm => {
      const pid = String(pm.patient);
      if (!paymentMap.has(pid)) paymentMap.set(pid, pm);
    });

    if (collector && collector !== 'all' && mongoose.Types.ObjectId.isValid(collector)) {
      patients = patients.filter(p => {
        const col = collectionMap.get(String(p._id));
        const colId = String(p.collectedBy?._id || col?.collector?._id || '');
        return colId === String(collector);
      });
    }

    // Filter out patients who have no active payment / whose transaction was deleted or unpaid
    patients = patients.filter(p => {
      if (p.paymentStatus === 'Unpaid') return false;
      const pay = paymentMap.get(String(p._id));
      return Boolean(pay || p.grandTotal > 0);
    });

    const transactions = patients.map(p => {
      const col = collectionMap.get(String(p._id));
      const rep = reportMap.get(String(p._id));
      const pay = paymentMap.get(String(p._id));
      const collectorUser = p.collectedBy || col?.collector;
      const testsList = [
        ...(p.laboratoryTests || []).map(t => t.name),
        ...(p.sampleTypes || []).map(s => s.name)
      ].filter(Boolean);

      const effectiveAmount = pay ? pay.amount : (p.grandTotal || 0);
      const effectiveMethod = pay ? pay.method : (p.paymentMethod || 'Cash');
      const effectiveReceipt = pay?.receiptNumber || p.receiptNumber || p.patientId;
      const effectiveCreator = pay?.receivedBy?.fullName || p.registeredBy?.fullName || 'System';

      return {
        _id: pay ? pay._id : p._id, // Real database transaction ID
        paymentId: pay ? pay._id : null,
        patientMongoId: p._id,
        transactionId: effectiveReceipt,
        patientId: p.patientId,
        barcode: p.barcode,
        patientName: p.name,
        age: p.age,
        sex: p.sex,
        phone: p.phone,
        branchName: pay?.branchName || p.branchName || 'Main',
        registrationDate: p.registrationDate,
        paidAt: pay?.paidAt || p.paymentDate || p.registrationDate,
        tests: testsList.length ? testsList.join(', ') : (p.serviceType || 'Laboratory Order'),
        grandTotal: effectiveAmount,
        amount: effectiveAmount,
        paymentStatus: p.paymentStatus || (pay ? 'Paid' : 'Unpaid'),
        paymentMethod: effectiveMethod,
        receptionist: effectiveCreator,
        receptionistId: pay?.receivedBy?._id || p.registeredBy?._id,
        lastModifiedBy: pay?.lastModifiedBy?.fullName || null,
        lastModifiedAt: pay?.lastModifiedAt || null,
        notes: pay?.notes || '',
        collector: collectorUser?.fullName || '—',
        collectorId: collectorUser?._id,
        collectionStatus: col?.status || (collectorUser ? 'Completed' : 'Queued'),
        report: rep ? {
          _id: rep._id,
          reportNumber: rep.reportNumber,
          equipment: rep.equipment,
          results: rep.results,
          comments: rep.comments,
          status: rep.status,
          approvedDate: rep.approvedDate
        } : null
      };
    });

    const userBranchFilter = branchFilter ? { branchName: branchFilter } : {};
    const [receptionists, collectors] = await Promise.all([
      User.find({ role: 'Reception', ...userBranchFilter }).select('_id fullName username branchName').sort({ fullName: 1 }).lean(),
      User.find({ role: 'Sample Collector', ...userBranchFilter }).select('_id fullName username branchName').sort({ fullName: 1 }).lean()
    ]);

    const logoBase64 = getLogoBase64();
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.filter(t => t.paymentStatus === 'Paid').reduce((sum, t) => sum + (t.grandTotal || 0), 0);

    res.json({
      mode: reportMode,
      reportDate: reportDateLabel,
      dateFrom: req.query.dateFrom || req.query.date,
      dateTo: req.query.dateTo || req.query.date,
      transactions,
      receptionists,
      collectors,
      summary: {
        totalTransactions,
        totalRevenue
      },
      logoBase64
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/reports/transactions
 * Admin adds a new money transaction.
 */
export async function addTransaction(req, res, next) {
  try {
    if (![ROLES.ADMIN, ROLES.SUB_ADMIN].includes(req.user.role)) {
      throw new AppError('Unauthorized. Only Administrators can add transactions.', 403);
    }

    const { patientId, amount, paymentMethod = 'Cash', branchName, notes, transactionDate } = req.body;

    if (!patientId) {
      throw new AppError('Patient identifier is required to record a transaction.', 422);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new AppError('Amount must be a non-negative number.', 422);
    }

    if (!['Cash', 'Card', 'Mobile Payment'].includes(paymentMethod)) {
      throw new AppError('Invalid payment method. Choose Cash, Card, or Mobile Payment.', 422);
    }

    const patientQuery = mongoose.Types.ObjectId.isValid(patientId)
      ? { _id: patientId }
      : { patientId: String(patientId).trim() };

    const patient = await Patient.findOne(patientQuery);
    if (!patient) {
      throw new AppError('Patient not found with the provided identifier.', 404);
    }

    const userBranch = req.user.branchName || 'Main';
    const txBranch = branchName || patient.branchName || userBranch;
    if (req.user.role !== 'Admin' && txBranch !== req.user.branchName) {
      throw new AppError('Unauthorized: cannot create transactions for another branch.', 403);
    }

    const paidAt = transactionDate && !isNaN(new Date(transactionDate).getTime())
      ? new Date(transactionDate)
      : new Date();

    const receiptNumber = patient.receiptNumber || `RC-${patient.patientId || Date.now().toString(36).toUpperCase()}`;

    const payment = await Payment.create({
      patient: patient._id,
      receiptNumber: `${receiptNumber}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      amount: numAmount,
      method: paymentMethod,
      receivedBy: req.user.id,
      branchName: txBranch,
      paidAt,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
      notes: String(notes || '').trim(),
      status: 'Completed'
    });

    patient.paymentStatus = 'Paid';
    patient.grandTotal = numAmount;
    patient.subtotal = Math.max(numAmount, patient.subtotal || numAmount);
    patient.paymentMethod = paymentMethod;
    patient.paymentDate = paidAt;
    if (!patient.receiptNumber) patient.receiptNumber = payment.receiptNumber;
    await patient.save();

    await recordActivity(
      req.user.id,
      'Admin added transaction',
      'Payment',
      payment._id,
      `Admin ${req.user.fullName} added transaction #${payment.receiptNumber} of ${numAmount} ETB (${paymentMethod}) for patient "${patient.name}" (${patient.patientId}).`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('dashboard:change', { action: 'refresh' });
    emit('reports:change', { action: 'transactions_updated' });
    emit('reception:change', { action: 'payment_updated' });

    res.status(201).json({
      success: true,
      message: `Transaction #${payment.receiptNumber} of ${numAmount} ETB added successfully.`,
      transaction: {
        _id: patient._id,
        paymentId: payment._id,
        transactionId: payment.receiptNumber,
        patientName: patient.name,
        patientId: patient.patientId,
        amount: payment.amount,
        grandTotal: payment.amount,
        paymentMethod: payment.method,
        paidAt: payment.paidAt,
        branchName: payment.branchName,
        paymentStatus: 'Paid',
        receptionist: req.user.fullName
      }
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/reports/transactions/:id
 * Admin updates an existing individual transaction (Amount, Payment Method, Status, Notes).
 * Ensures automatic recalculation of Daily Income and database totals without double-counting.
 */
export async function updateTransaction(req, res, next) {
  try {
    if (![ROLES.ADMIN, ROLES.SUB_ADMIN].includes(req.user.role)) {
      throw new AppError('Unauthorized. Only Administrators can edit transactions.', 403);
    }

    const { id } = req.params;
    const { amount, paymentMethod, paymentStatus, notes, transactionDate } = req.body;

    let payment = await Payment.findById(id).populate('patient').populate('receivedBy');
    let patient = payment?.patient;

    if (!payment) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        patient = await Patient.findById(id).populate('registeredBy');
        if (patient) {
          payment = await Payment.findOne({ patient: patient._id }).populate('receivedBy');
        }
      }
    }

    if (!payment && !patient) {
      throw new AppError('Transaction record not found.', 404);
    }

    const txBranch = payment?.branchName || patient?.branchName || 'Main';
    if (req.user.role !== 'Admin' && txBranch !== req.user.branchName) {
      throw new AppError('Unauthorized: cannot edit transactions from another branch.', 403);
    }

    const oldAmount = Number(payment?.amount ?? patient?.grandTotal ?? 0);
    const oldMethod = payment?.method || patient?.paymentMethod || 'Cash';
    const oldStatus = patient?.paymentStatus || 'Paid';

    let targetAmount = oldAmount;
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (isNaN(parsed) || parsed < 0) {
        throw new AppError('Amount must be a non-negative number.', 422);
      }
      targetAmount = parsed;
    }

    let targetMethod = oldMethod;
    if (paymentMethod !== undefined) {
      if (!['Cash', 'Card', 'Mobile Payment'].includes(paymentMethod)) {
        throw new AppError('Invalid payment method. Choose Cash, Card, or Mobile Payment.', 422);
      }
      targetMethod = paymentMethod;
    }

    const targetStatus = paymentStatus && ['Paid', 'Unpaid', 'Waiting for Payment'].includes(paymentStatus)
      ? paymentStatus
      : oldStatus;

    const modifiedAt = new Date();

    if (payment) {
      payment.amount = targetAmount;
      payment.method = targetMethod;
      payment.lastModifiedBy = req.user.id;
      payment.lastModifiedAt = modifiedAt;
      payment.status = 'Modified';
      if (notes !== undefined) payment.notes = String(notes).trim();
      if (transactionDate && !isNaN(new Date(transactionDate).getTime())) {
        payment.paidAt = new Date(transactionDate);
      }
      await payment.save();
    } else if (patient && targetStatus === 'Paid' && targetAmount > 0) {
      payment = await Payment.create({
        patient: patient._id,
        receiptNumber: patient.receiptNumber || `RC-${patient.patientId}`,
        amount: targetAmount,
        method: targetMethod,
        receivedBy: patient.registeredBy?._id || req.user.id,
        branchName: txBranch,
        paidAt: transactionDate && !isNaN(new Date(transactionDate).getTime()) ? new Date(transactionDate) : modifiedAt,
        lastModifiedBy: req.user.id,
        lastModifiedAt: modifiedAt,
        notes: notes ? String(notes).trim() : '',
        status: 'Modified'
      });
    }

    if (patient) {
      patient.grandTotal = targetAmount;
      if (targetAmount > (patient.subtotal || 0)) {
        patient.subtotal = targetAmount;
      }
      patient.paymentMethod = targetMethod;
      patient.paymentStatus = targetStatus;
      if (transactionDate && !isNaN(new Date(transactionDate).getTime())) {
        patient.paymentDate = new Date(transactionDate);
      }
      await patient.save();
    }

    const creatorName = payment?.receivedBy?.fullName || patient?.registeredBy?.fullName || 'Receptionist';

    await recordActivity(
      req.user.id,
      'Admin edited transaction',
      'Payment',
      payment?._id || patient?._id,
      `Admin ${req.user.fullName} updated transaction #${payment?.receiptNumber || patient?.receiptNumber || id}: amount ${oldAmount} -> ${targetAmount} ETB, method: ${oldMethod} -> ${targetMethod}. Original creator preserved: ${creatorName}.`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('dashboard:change', { action: 'refresh' });
    emit('reports:change', { action: 'transactions_updated' });
    emit('reception:change', { action: 'payment_updated' });

    res.json({
      success: true,
      message: `Transaction updated successfully from ${oldAmount} to ${targetAmount} ETB. Financial totals recalculated.`,
      oldAmount,
      newAmount: targetAmount,
      difference: targetAmount - oldAmount,
      transaction: {
        _id: patient?._id || payment?._id,
        paymentId: payment?._id,
        transactionId: payment?.receiptNumber || patient?.receiptNumber,
        patientName: patient?.name,
        patientId: patient?.patientId,
        amount: targetAmount,
        grandTotal: targetAmount,
        paymentMethod: targetMethod,
        paymentStatus: targetStatus,
        lastModifiedBy: req.user.fullName,
        lastModifiedAt: modifiedAt
      }
    });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/reports/transactions/:id
 * Admin safely deletes a single transaction.
 * Automatically recalculates daily income and database totals, while keeping patient/test/report records intact.
 */
export async function deleteTransaction(req, res, next) {
  try {
    if (![ROLES.ADMIN, ROLES.SUB_ADMIN].includes(req.user.role)) {
      throw new AppError('Unauthorized. Only Administrators can delete transactions.', 403);
    }

    const { id } = req.params;
    console.log('[DELETE] User:', req.user.fullName, req.user.role, 'Target ID:', id);

    let payment = null;
    let patient = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      payment = await Payment.findById(id).populate('patient').populate('receivedBy');
      if (!payment) {
        patient = await Patient.findById(id).populate('registeredBy');
        if (patient) {
          payment = await Payment.findOne({ patient: patient._id }).populate('receivedBy');
        }
      } else {
        patient = payment.patient;
      }
    } else {
      const idStr = String(id).trim();
      payment = await Payment.findOne({ receiptNumber: idStr }).populate('patient').populate('receivedBy');
      if (payment) {
        patient = payment.patient;
      } else {
        patient = await Patient.findOne({ $or: [{ patientId: idStr }, { receiptNumber: idStr }] }).populate('registeredBy');
        if (patient) {
          payment = await Payment.findOne({ patient: patient._id }).populate('receivedBy');
        }
      }
    }

    if (!payment && !patient) {
      return res.status(404).json({
        success: false,
        deletedCount: 0,
        message: 'Transaction record not found.'
      });
    }

    const txBranch = payment?.branchName || patient?.branchName || 'Main';
    if (req.user.role !== 'Admin' && txBranch !== req.user.branchName) {
      throw new AppError('Unauthorized: cannot delete transactions from another branch.', 403);
    }

    const deletedAmount = Number(payment?.amount ?? patient?.grandTotal ?? 0);
    const receiptNo = payment?.receiptNumber || patient?.receiptNumber || 'TX';
    const patientName = patient?.name || 'Patient';
    const patientId = patient?.patientId || '';
    const creatorName = payment?.receivedBy?.fullName || patient?.registeredBy?.fullName || 'Receptionist';

    // 1. Delete Payment record and linked receipts from database
    if (payment) {
      await Payment.findByIdAndDelete(payment._id);
      await Receipt.deleteMany({ payment: payment._id });
    }

    // 2. Safely update Patient financial status without deleting clinical/test records
    const targetPatientId = patient?._id || payment?.patient?._id || payment?.patient;
    if (targetPatientId) {
      await Patient.findByIdAndUpdate(targetPatientId, {
        $set: {
          paymentStatus: 'Unpaid',
          grandTotal: 0
        },
        $unset: {
          receiptNumber: 1,
          paymentDate: 1
        }
      });
    }

    // 3. Activity Logging
    await recordActivity(
      req.user.id,
      'Admin deleted transaction',
      'Payment',
      payment?._id || patient?._id,
      `Admin ${req.user.fullName} deleted transaction #${receiptNo} (${deletedAmount} ETB) for patient "${patientName}" (${patientId}). Original receptionist: ${creatorName}. Daily Income updated by -${deletedAmount} ETB.`,
      { role: req.user.role, ipAddress: req.ip }
    );

    // 4. Real-time broadcast
    emit('dashboard:change', { action: 'refresh' });
    emit('reports:change', { action: 'transactions_updated' });
    emit('reception:change', { action: 'payment_updated' });

    console.log('[DELETE] Successfully deleted transaction:', receiptNo, 'Amount:', deletedAmount);

    res.json({
      success: true,
      deletedCount: 1,
      deletedAmount,
      message: `Transaction #${receiptNo} of ${deletedAmount} ETB deleted successfully. Financial totals updated.`
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/reports/transactions/bulk-delete
 * DELETE /api/reports/transactions/bulk
 * Admin bulk deletes multiple money transactions safely.
 * Removes Payment records from MongoDB via deleteMany, resets Patient financial totals
 * (grandTotal = 0, paymentStatus = 'Unpaid'), and recalculates Daily Income and summary
 * aggregates without double-subtraction while preserving patient medical, laboratory test,
 * sample, approval, and report records.
 */
export async function bulkDeleteTransactions(req, res, next) {
  try {
    if (![ROLES.ADMIN, ROLES.SUB_ADMIN].includes(req.user.role)) {
      throw new AppError('Unauthorized. Only Administrators can delete transactions.', 403);
    }

    const rawIds = req.body.transactionIds || req.body.ids;
    const ids = Array.isArray(rawIds) ? rawIds : [];

    console.log('[BULK DELETE] User:', req.user.fullName, req.user.role);
    console.log('[BULK DELETE] Received IDs count:', ids.length, 'IDs:', ids.slice(0, 10));

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        deletedCount: 0,
        message: 'Please select at least one transaction to delete.'
      });
    }

    const branchFilter = (req.user.role !== 'Admin' && req.user.branchName)
      ? { branchName: req.user.branchName }
      : {};

    const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const receiptStrings = ids.filter(id => !mongoose.Types.ObjectId.isValid(id)).map(id => String(id).trim());

    // 1. Find matching Payment documents in MongoDB
    const orClauses = [];
    if (validObjectIds.length > 0) {
      orClauses.push({ _id: { $in: validObjectIds } });
    }
    if (receiptStrings.length > 0) {
      orClauses.push({ receiptNumber: { $in: receiptStrings } });
    }

    let payments = [];
    if (orClauses.length > 0) {
      payments = await Payment.find({
        $or: orClauses,
        ...branchFilter
      }).populate('patient').populate('receivedBy');
    }

    // 2. Also check if any IDs correspond to direct Patient records (legacy records without Payment doc)
    const foundPaymentIds = new Set(payments.map(p => String(p._id)));
    const remainingObjectIds = validObjectIds.filter(vId => !foundPaymentIds.has(String(vId)));

    let legacyPatients = [];
    if (remainingObjectIds.length > 0) {
      legacyPatients = await Patient.find({
        _id: { $in: remainingObjectIds },
        ...branchFilter
      });
      // For any legacy patient found, check if they actually have a payment doc linked
      for (const lp of legacyPatients) {
        const linkedPayment = await Payment.findOne({ patient: lp._id, ...branchFilter });
        if (linkedPayment && !foundPaymentIds.has(String(linkedPayment._id))) {
          payments.push(linkedPayment);
          foundPaymentIds.add(String(linkedPayment._id));
        }
      }
    }

    console.log('[BULK DELETE] Matching payments found:', payments.length, 'Legacy patients found:', legacyPatients.length);

    if (payments.length === 0 && legacyPatients.length === 0) {
      return res.status(404).json({
        success: false,
        deletedCount: 0,
        message: 'No matching transactions were found or permitted to delete.'
      });
    }

    const paymentIdsToDelete = payments.map(p => p._id);
    const patientIdsToReset = new Set();
    let totalDeletedAmount = 0;
    const deletedReceipts = [];

    for (const p of payments) {
      totalDeletedAmount += Number(p.amount || 0);
      deletedReceipts.push(p.receiptNumber);
      if (p.patient) {
        patientIdsToReset.add(String(p.patient._id || p.patient));
      }
    }

    for (const lp of legacyPatients) {
      if (!patientIdsToReset.has(String(lp._id))) {
        totalDeletedAmount += Number(lp.grandTotal || 0);
        deletedReceipts.push(lp.receiptNumber || lp.patientId);
        patientIdsToReset.add(String(lp._id));
      }
    }

    // 3. Delete matching transaction records from Payment collection
    let deletedPaymentsCount = 0;
    if (paymentIdsToDelete.length > 0) {
      const delRes = await Payment.deleteMany({
        _id: { $in: paymentIdsToDelete }
      });
      deletedPaymentsCount = delRes.deletedCount || 0;

      // Also clean up linked receipts
      await Receipt.deleteMany({
        payment: { $in: paymentIdsToDelete }
      });
    }

    // 4. Safely reset financial status on Patient records without deleting medical or test data
    if (patientIdsToReset.size > 0) {
      await Patient.updateMany(
        { _id: { $in: Array.from(patientIdsToReset).map(id => new mongoose.Types.ObjectId(id)) } },
        {
          $set: {
            paymentStatus: 'Unpaid',
            grandTotal: 0
          },
          $unset: {
            receiptNumber: 1,
            paymentDate: 1
          }
        }
      );
    }

    const totalDeletedCount = deletedPaymentsCount + (legacyPatients.filter(lp => !foundPaymentIds.has(String(lp._id))).length);
    console.log('[BULK DELETE] Deleted count:', totalDeletedCount, 'Total amount subtracted:', totalDeletedAmount);

    if (totalDeletedCount === 0) {
      return res.status(404).json({
        success: false,
        deletedCount: 0,
        message: 'No matching transactions were found or permitted to delete.'
      });
    }

    // 5. Activity Logging
    await recordActivity(
      req.user.id,
      'Admin bulk deleted transactions',
      'Payment',
      req.user.id,
      `Admin ${req.user.fullName} bulk deleted ${totalDeletedCount} transactions (Total: -${totalDeletedAmount} ETB). Receipts: ${deletedReceipts.slice(0, 5).join(', ')}${deletedReceipts.length > 5 ? '...' : ''}. Financial totals and Daily Income updated.`,
      { role: req.user.role, ipAddress: req.ip }
    );

    // 6. Real-time broadcasts
    emit('dashboard:change', { action: 'refresh' });
    emit('reports:change', { action: 'transactions_updated' });
    emit('reception:change', { action: 'payment_updated' });

    res.json({
      success: true,
      deletedCount: totalDeletedCount,
      totalDeletedAmount,
      message: `${totalDeletedCount} money transaction${totalDeletedCount === 1 ? '' : 's'} deleted successfully. Financial totals have been updated.`
    });
  } catch (e) {
    next(e);
  }
}

