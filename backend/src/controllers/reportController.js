import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import StockItem from '../models/StockItem.js';
import Patient from '../models/Patient.js';
import SampleCollection from '../models/SampleCollection.js';
import User from '../models/User.js';
import { stockLevel } from '../constants/stock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLogoPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'backend', 'src', 'picture', 'logo.jpg'),
    path.resolve(process.cwd(), 'src', 'picture', 'logo.jpg'),
    path.resolve(__dirname, '../picture/logo.jpg')
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
      return `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (e) {}
  return '';
};

const rows=async()=>{const items=await StockItem.find().populate('category','name').sort({itemName:1});return items.map(i=>({name:i.itemName,code:i.itemCode,category:i.category?.name||'',unit:i.unit,price:i.purchasePrice,current:i.currentQuantity,used:i.usedQuantity,remaining:i.currentQuantity-i.usedQuantity,level:stockLevel(i).label}));};const meta=(req)=>`Generated ${new Date().toLocaleString()} by ${req.user.fullName}`;
export async function exportCsv(req,res,next){try{const data=await rows();const esc=(v)=>`"${String(v).replaceAll('"','""')}"`;const csv=['Item Name,Item Code,Category,Unit,Purchase Price,Current Quantity,Used Quantity,Remaining Quantity,Stock Status',...data.map(r=>[r.name,r.code,r.category,r.unit,r.price,r.current,r.used,r.remaining,r.level].map(esc).join(','))].join('\n');res.attachment('etu-stock-report.csv').type('text/csv').send(csv);}catch(e){next(e)}}
export async function exportExcel(req,res,next){try{const data=await rows();const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Stock Report');sheet.mergeCells('A1:I1');sheet.getCell('A1').value='ETU Diagnostic Laboratory - Stock Report';sheet.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};sheet.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF075C91'}};sheet.addRow([meta(req)]);sheet.mergeCells('A2:I2');sheet.addRow([]);sheet.addRow(['Item Name','Item Code','Category','Unit','Purchase Price','Current','Used','Remaining','Stock Status']);sheet.getRow(4).font={bold:true};data.forEach(r=>sheet.addRow([r.name,r.code,r.category,r.unit,r.price,r.current,r.used,r.remaining,r.level]));sheet.columns.forEach(c=>c.width=18);sheet.getColumn(1).width=28;sheet.getColumn(5).numFmt='#,##0.00';res.attachment('etu-stock-report.xlsx');await book.xlsx.write(res);res.end();}catch(e){next(e)}}
export async function exportPdf(req,res,next){try{const data=await rows();res.attachment('etu-stock-report.pdf');const doc=new PDFDocument({margin:36,size:'A4',layout:'landscape'});doc.pipe(res);doc.fillColor('#075C91').fontSize(20).text('ETU Diagnostic Laboratory');doc.fillColor('#263238').fontSize(13).text('Stock Management Report');doc.fontSize(8).fillColor('#546E7A').text(meta(req));doc.moveDown();const x=[36,165,235,320,378,438,493,545,602], headers=['Item','Code','Category','Unit','Price','Current','Used','Remain','Status'];doc.fillColor('#075C91').fontSize(8);headers.forEach((h,i)=>doc.text(h,x[i],120,{width:(x[i+1]||760)-x[i]-4}));let y=138;data.forEach(r=>{if(y>530){doc.addPage();y=50;}doc.fillColor('#263238').fontSize(7);[r.name,r.code,r.category,r.unit,r.price,r.current,r.used,r.remaining,r.level].forEach((v,i)=>doc.text(String(v),x[i],y,{width:(x[i+1]||760)-x[i]-4,height:16,ellipsis:true}));doc.moveTo(36,y+16).lineTo(760,y+16).strokeColor('#E0E7E9').stroke();y+=20;});doc.end();}catch(e){next(e)}}

/**
 * GET /api/reports/transactions
 * Returns internal transaction records filtered by Single Date or Date Range, Receptionist, and Sample Collector.
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
      const selectedDateStr = String(date || new Date().toISOString().slice(0, 10)).trim();
      const [year, month, day] = selectedDateStr.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      reportDateLabel = selectedDateStr;
    }

    const query = {
      registrationDate: { $gte: startDate, $lte: endDate }
    };

    if (receptionist && receptionist !== 'all' && mongoose.Types.ObjectId.isValid(receptionist)) {
      query.registeredBy = receptionist;
    }

    let patients = await Patient.find(query)
      .populate('registeredBy', 'fullName username role')
      .populate('collectedBy', 'fullName username role')
      .populate('laboratoryTests', 'name category')
      .populate('sampleTypes', 'name price')
      .sort({ registrationDate: -1 })
      .lean();

    const patientIds = patients.map(p => p._id);
    const collections = await SampleCollection.find({ patient: { $in: patientIds } })
      .populate('collector', 'fullName username role')
      .lean();

    const collectionMap = new Map();
    collections.forEach(col => {
      collectionMap.set(String(col.patient), col);
    });

    if (collector && collector !== 'all' && mongoose.Types.ObjectId.isValid(collector)) {
      patients = patients.filter(p => {
        const col = collectionMap.get(String(p._id));
        const colId = String(p.collectedBy?._id || col?.collector?._id || '');
        return colId === String(collector);
      });
    }

    const transactions = patients.map(p => {
      const col = collectionMap.get(String(p._id));
      const collectorUser = p.collectedBy || col?.collector;
      const testsList = [
        ...(p.laboratoryTests || []).map(t => t.name),
        ...(p.sampleTypes || []).map(s => s.name)
      ].filter(Boolean);

      return {
        _id: p._id,
        transactionId: p.receiptNumber || p.patientId,
        patientId: p.patientId,
        barcode: p.barcode,
        patientName: p.name,
        age: p.age,
        sex: p.sex,
        phone: p.phone,
        registrationDate: p.registrationDate,
        tests: testsList.length ? testsList.join(', ') : (p.serviceType || 'Counseling Only'),
        grandTotal: p.grandTotal || 0,
        paymentStatus: p.paymentStatus || 'Unpaid',
        paymentMethod: p.paymentMethod || 'Cash',
        receptionist: p.registeredBy?.fullName || 'System',
        receptionistId: p.registeredBy?._id,
        collector: collectorUser?.fullName || '—',
        collectorId: collectorUser?._id,
        collectionStatus: col?.status || (collectorUser ? 'Completed' : 'Queued')
      };
    });

    const [receptionists, collectors] = await Promise.all([
      User.find({ role: 'Reception' }).select('_id fullName username').sort({ fullName: 1 }).lean(),
      User.find({ role: 'Sample Collector' }).select('_id fullName username').sort({ fullName: 1 }).lean()
    ]);

    const logoBase64 = getLogoBase64();
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);

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
