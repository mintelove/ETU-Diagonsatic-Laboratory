import mongoose from 'mongoose';import Patient from '../models/Patient.js';import SampleCollection from '../models/SampleCollection.js';import SampleTransfer from '../models/SampleTransfer.js';import StockItem from '../models/StockItem.js';import StockHistory from '../models/StockHistory.js';import LaboratoryTest from '../models/LaboratoryTest.js';import LaboratorySettings from '../models/LaboratorySettings.js';import ExtraStockRequest from '../models/ExtraStockRequest.js';import LabReport from '../models/LabReport.js';import PathologyCase from '../models/PathologyCase.js';import RadiologyCase from '../models/RadiologyCase.js';import CounsellingRecord from '../models/CounsellingRecord.js';import User from '../models/User.js';import Notification from '../models/Notification.js';import {AppError}from'../utils/appError.js';import {recordActivity}from'../services/activityService.js';import {notifyStockLevel}from'../services/stockService.js';import {emit}from'../services/sseService.js';import {equipmentPayload,calculateFlag}from'../constants/equipment.js';import {calculateSubtotalWithCbcGroup}from'../utils/cbcPricing.js';
function isPathologyOrRadiologyTest(test){const catName=String(test?.category?.name||test?.categoryName||'').toUpperCase(),testName=String(test?.name||'').toUpperCase(),subcat=String(test?.subcategory||'').toUpperCase();const isPath=catName.includes('PATHOLOGY')||testName.includes('BIOPSY')||testName.includes('FNAC')||testName.includes('PERIPHERAL MORPHOLOGY')||testName.includes('HISTOPATHOLOGY')||testName.includes('CYTOPATHOLOGY')||subcat.includes('BIOPSY')||subcat.includes('FNAC')||subcat.includes('PERIPHERAL MORPHOLOGY')||subcat.includes('HISTOPATHOLOGY')||subcat.includes('CYTOPATHOLOGY');const isRad=catName.includes('RADIOLOGY')||testName.includes('CT SCAN')||testName.includes('X-RAY')||testName.includes('XRAY')||testName.includes('ULTRASOUND')||testName.includes('MRI')||subcat.includes('CT SCAN')||subcat.includes('X-RAY')||subcat.includes('XRAY')||subcat.includes('ULTRASOUND')||subcat.includes('MRI');return isPath||isRad;}
const equipment={"Mindray BS120 Fully Automated Chemistry Analyzer":[['ALT','0–41 U/L'],['AST','0–40 U/L'],['ALP','44–147 U/L'],['Creatinine','53–115 µmol/L'],['Urea','2.5–7.8 mmol/L'],['Glucose','3.9–7.8 mmol/L'],['Cholesterol','<5.2 mmol/L'],['Triglycerides','<1.7 mmol/L'],['Bilirubin','5–21 µmol/L'],['Albumin','35–50 g/L'],['Total Protein','60–80 g/L']],"BC3000 Plus Hematology Analyzer":[['Hemoglobin','12–17 g/dL'],['WBC','4–11 ×10⁹/L'],['Platelets','150–450 ×10⁹/L'],['RBC','4.0–5.9 ×10¹²/L'],['Hematocrit','36–52%']],"K-Lite 8 Electrolyte Analyzer":[['Sodium','135–145 mmol/L'],['Potassium','3.5–5.1 mmol/L'],['Chloride','98–107 mmol/L']],"Finecare HbA1c Reader":[['HbA1c','4.0–5.6%']],"Semi Automatic 2-Part Coagulation Analyzer":[['PT','11–13.5 sec'],['INR','0.8–1.2'],['APTT','25–35 sec']]};
async function notifyRoles(roles,type,message,entity){const users=await User.find({role:{$in:roles},status:'Active'}).select('_id');if(users.length)await Notification.insertMany(users.map(u=>({recipient:u._id,type,message,entity,entityType:'LabReport'})))}
export async function dashboard(req,res,next){try{const start=new Date();start.setHours(0,0,0,0);const branch=req.user.role!=='Admin'?(req.user.branchName||'Main'):(req.query.branchName&&req.query.branchName!=='All'?req.query.branchName:null);const cFilter=status=>branch?{status,branchName:branch}:{status};const doneFilter=branch?{status:'Completed',completedAt:{$gte:start},branchName:branch}:{status:'Completed',completedAt:{$gte:start}};const reportMatch=branch?[{$match:{branchName:branch}},{$group:{_id:'$status',count:{$sum:1}}}]:[{$group:{_id:'$status',count:{$sum:1}}}];const [queued,progress,done,reports,critical,activities]=await Promise.all([SampleCollection.countDocuments(cFilter('Queued')),SampleCollection.countDocuments(cFilter('In Progress')),SampleCollection.countDocuments(doneFilter),LabReport.aggregate(reportMatch),StockItem.countDocuments({$expr:{$lte:[{$subtract:['$currentQuantity','$usedQuantity']},'$minimumThreshold']}}),SampleCollection.find(branch?{collector:req.user.id,branchName:branch}:{collector:req.user.id}).populate('patient','patientId name').sort({updatedDate:-1}).limit(8)]);const count=s=>reports.find(x=>x._id===s)?.count||0;res.json({summary:{todayCollections:done,pendingCollections:queued,completedCollections:done,inProgress:progress,pendingApprovals:count('Submitted')+count('Pending'),approved:count('Approved'),rejected:count('Rejected'),criticalStock:critical},activities})}catch(e){next(e)}}
export async function queue(req, res, next) {
  try {
    const q = String(req.query.q || '').trim(), status = req.query.status;
    const branch = req.user.role !== 'Admin' ? (req.user.branchName || 'Main') : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);
    
    const andClauses = [
      { $or: [{ paymentStatus: 'Paid' }, { registrationType: { $in: ['Self', 'Referral', 'Self Aware'] } }] }
    ];

    if (branch) andClauses.push({ branchName: branch });

    if (q) {
      andClauses.push({
        $or: [
          { patientId: { $regex: q, $options: 'i' } },
          { barcode: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } }
        ]
      });
    }

    // Time period filtering for Sample Collector Queue
    const period = String(req.query.period || '').trim().toLowerCase();
    let fromDate, toDate;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (period === 'today' || period === "today's") {
      fromDate = today;
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'lastweek' || period === 'last week') {
      const day = now.getDay();
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
      fromDate = new Date(thisMon);
      fromDate.setDate(fromDate.getDate() - 7);
      toDate = new Date(thisMon);
      toDate.setDate(toDate.getDate() - 1);
      toDate.setHours(23, 59, 59, 999);
    } else if (period === 'lastmonth' || period === 'last month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (req.query.dateFrom || req.query.dateTo) {
      if (req.query.dateFrom) {
        fromDate = new Date(req.query.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
      }
      if (req.query.dateTo) {
        toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999);
      }
    }

    if (fromDate || toDate) {
      const dateCond = {};
      if (fromDate) dateCond.$gte = fromDate;
      if (toDate) dateCond.$lte = toDate;
      andClauses.push({ registrationDate: dateCond });
    }

    const patientFilter = { $and: andClauses };

    const patients = await Patient.find(patientFilter).populate({
      path: 'laboratoryTests',
      select: 'name category consumables requiredSampleTypes',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'consumables.item', select: 'itemName unit' },
        { path: 'requiredSampleTypes', select: 'name' }
      ]
    }).populate('sampleTypes', 'name');

    // Sample Collector must NOT see patients who only have Pathology or Radiology tests (and 0 routine lab tests)
    const filteredPatients = (req.user.role === 'Sample Collector')
      ? patients.filter(p => {
          const tests = p.laboratoryTests || [];
          if (!tests.length) return true; // Self-aware awaiting investigation
          return tests.some(t => !isPathologyOrRadiologyTest(t));
        })
      : patients;

    const patientIds = filteredPatients.map(p => p.id);
    const [existing, history, transfers] = await Promise.all([
      SampleCollection.find({ patient: { $in: patientIds } }).populate('collector', 'fullName'),
      StockHistory.find({ patient: { $in: patientIds }, action: { $in: ['Automatic Deduction', 'Manual Deduction'] } }).populate('item', 'itemName unit'),
      SampleTransfer.find({ patient: { $in: patientIds } }).lean()
    ]);

    const map = new Map(existing.map(x => [String(x.patient), x]));
    const historyByPatient = new Map();
    history.forEach(h => {
      const pid = String(h.patient);
      if (!historyByPatient.has(pid)) historyByPatient.set(pid, []);
      historyByPatient.get(pid).push(h);
    });

    const transfersByPatient = new Map();
    (transfers || []).forEach(t => {
      const pid = String(t.patient);
      if (!transfersByPatient.has(pid)) transfersByPatient.set(pid, []);
      transfersByPatient.get(pid).push(t);
    });

    const rows = filteredPatients.map(p => {
      const pHistory = historyByPatient.get(String(p.id)) || [];
      const pTransfers = transfersByPatient.get(String(p.id)) || [];
      const tests = p.laboratoryTests || [];
      const allocationByTest = {};
      const transferStatusByTest = {};

      tests.forEach(test => {
        allocationByTest[test.name] = [];
        const tId = String(test._id || test.id || test);
        const match = pTransfers.find(t => String(t.laboratoryTest) === tId || (t.testName && t.testName.toUpperCase() === (test.name || '').toUpperCase()));
        if (match) {
          transferStatusByTest[tId] = {
            transferId: match.transferId,
            status: match.status,
            sourceBranch: match.sourceBranch,
            destinationBranch: match.destinationBranch,
            priority: match.priority
          };
        }
      });

      const testItemMap = new Map();
      tests.forEach(test => {
        (test.consumables || []).forEach(c => {
          const itemId = String(c.item?._id || c.item);
          if (!testItemMap.has(itemId)) testItemMap.set(itemId, []);
          testItemMap.get(itemId).push({ testName: test.name, configuredQty: c.quantity });
        });
      });

      pHistory.forEach(h => {
        if (!h.item) return;
        const itemId = String(h.item._id || h.item);
        const itemName = h.item.itemName || 'Supply Item';
        const unit = h.item.unit || '';
        const qty = h.quantityDeducted || 0;
        const source = h.action === 'Manual Deduction' ? 'Manual' : 'Smart';

        if (h.testName && allocationByTest[h.testName] !== undefined) {
          const list = allocationByTest[h.testName];
          const existingItem = list.find(x => x.itemName === itemName);
          if (existingItem) existingItem.quantity += qty;
          else list.push({ itemName, unit, quantity: qty, source });
        } else if (Array.isArray(h.orderedTests) && h.orderedTests.length === 1 && allocationByTest[h.orderedTests[0]] !== undefined) {
          const tName = h.orderedTests[0];
          const list = allocationByTest[tName];
          const existingItem = list.find(x => x.itemName === itemName);
          if (existingItem) existingItem.quantity += qty;
          else list.push({ itemName, unit, quantity: qty, source });
        } else {
          const mappedTests = testItemMap.get(itemId) || [];
          if (mappedTests.length > 0) {
            mappedTests.forEach(m => {
              if (allocationByTest[m.testName]) {
                const list = allocationByTest[m.testName];
                const existingItem = list.find(x => x.itemName === itemName);
                const itemQty = source === 'Smart' ? (m.configuredQty || qty) : qty;
                if (existingItem) existingItem.quantity += itemQty;
                else list.push({ itemName, unit, quantity: itemQty, source });
              }
            });
          } else {
            const targetTests = (Array.isArray(h.orderedTests) && h.orderedTests.length > 0) ? h.orderedTests : tests.map(t => t.name);
            targetTests.forEach(tn => {
              if (allocationByTest[tn]) {
                const list = allocationByTest[tn];
                const existingItem = list.find(x => x.itemName === itemName);
                if (existingItem) existingItem.quantity += qty;
                else list.push({ itemName, unit, quantity: qty, source });
              }
            });
          }
        }
      });

      return {
        patient: p,
        collection: map.get(String(p.id)) || { status: 'Queued' },
        allocationByTest,
        transferStatusByTest
      };
    }).filter(x => x.collection?.status !== 'Cancelled' && (!status || status === 'all' || x.collection?.status === status));

    res.json({ queue: rows });
  } catch (e) {
    next(e);
  }
}

export async function history(req,res,next){try{const patient=await Patient.findById(req.params.patientId).populate({path:'laboratoryTests',select:'name category requiredSampleTypes',populate:[{path:'category',select:'name'},{path:'requiredSampleTypes',select:'name'}]}).populate('sampleTypes','name');if(!patient)throw new AppError('Patient not found.',404);const [visits,reports]=await Promise.all([Patient.find({phone:patient.phone}).select('patientId registrationDate referralHospital laboratoryTests sampleTypes branchName').populate({path:'laboratoryTests',select:'name category requiredSampleTypes',populate:[{path:'category',select:'name'},{path:'requiredSampleTypes',select:'name'}]}).populate('sampleTypes','name'),LabReport.find({patient:patient.id}).sort({createdDate:-1})]);res.json({patient,visits,reports})}catch(e){next(e)}}
export async function reports(req, res, next) {
  try {
    const isCrossBranch = req.user.role === 'Admin' || req.user.branchName === 'All' || (req.user.allowedBranches && req.user.allowedBranches.length > 1);
    const branch = !isCrossBranch ? (req.user.branchName || 'Main') : (req.query.branchName && req.query.branchName !== 'All' ? req.query.branchName : null);
    const filter = ['Admin', 'Sub Admin'].includes(req.user.role) ? {} : { $or: [{ technician: req.user.id }, { submittedBy: req.user.id }] };
    if (branch) filter.branchName = branch;

    const isApprovedQuery = req.query.status === 'Approved';
    if (req.query.status) {
      if (req.query.status === 'Pending') {
        filter.status = { $in: ['Submitted', 'Pending'] };
      } else if (req.query.status === 'Approved') {
        if (req.user.role === 'Sample Collector') {
          delete filter.$or;
        }
        filter.status = { $in: ['Approved', 'Ready for Printing'] };
      } else {
        filter.status = req.query.status;
      }
    }

    const labQuery = LabReport.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',
        populate: [
          { path: 'laboratoryTests', select: 'name category subcategory requiredSampleTypes', populate: [{ path: 'category', select: 'name' }, { path: 'requiredSampleTypes', select: 'name' }] },
          { path: 'sampleTypes', select: 'name' }
        ]
      })
      .populate({ path: 'laboratoryTests', select: 'name category subcategory', populate: { path: 'category', select: 'name' } })
      .populate('technician', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('rejectedBy', 'fullName')
      .sort({ approvedDate: -1, updatedDate: -1 });

    const [labReports, pathCases, radCases] = await Promise.all([
      labQuery.lean(),
      isApprovedQuery
        ? PathologyCase.find({ status: { $in: ['Approved', 'Ready for Printing'] }, ...(branch ? { branchName: branch } : {}) })
            .populate('patient', 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy')
            .populate('pathologist', 'fullName')
            .populate('approvedBy', 'fullName')
            .sort({ approvedAt: -1, updatedDate: -1 })
            .lean()
        : Promise.resolve([]),
      isApprovedQuery
        ? RadiologyCase.find({ status: { $in: ['Approved', 'Ready for Printing'] }, ...(branch ? { branchName: branch } : {}) })
            .populate('patient', 'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy')
            .populate('radiologist', 'fullName')
            .populate('approvedBy', 'fullName')
            .sort({ approvedAt: -1, updatedDate: -1 })
            .lean()
        : Promise.resolve([])
    ]);

    const formattedLab = (labReports || []).map(r => ({
      ...r,
      docType: 'LabReport',
      department: r.isInternalMedicineForm ? 'Internal Medicine' : 'Laboratory'
    }));

    const formattedPath = (pathCases || []).filter(c => c.patient).map(c => ({
      ...c,
      docType: 'PathologyCase',
      department: 'Pathology',
      reportNumber: c.caseNumber,
      approvedDate: c.approvedAt
    }));

    const formattedRad = (radCases || []).filter(c => c.patient).map(c => ({
      ...c,
      docType: 'RadiologyCase',
      department: 'Radiology',
      reportNumber: c.caseNumber,
      approvedDate: c.approvedAt
    }));

    const combinedReports = isApprovedQuery
      ? [...formattedLab, ...formattedPath, ...formattedRad].sort((a, b) => new Date(b.approvedDate || b.updatedDate || b.createdDate) - new Date(a.approvedDate || a.updatedDate || a.createdDate))
      : formattedLab;

    res.json({ reports: combinedReports });
  } catch (e) {
    next(e);
  }
}
export async function deleteReport(req, res, next) {
  try {
    const isAdmin = ['Admin', 'Sub Admin'].includes(req.user.role);
    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, technician: req.user.id, status: 'Draft' };

    const report = await LabReport.findOne(query).populate('patient');
    if (!report) {
      throw new AppError(isAdmin ? 'Report not found.' : 'Draft report not found or cannot be deleted.', 404);
    }

    if (!isAdmin && ['Approved', 'Ready for Printing'].includes(report.status)) {
      throw new AppError('Approved reports are finalized and cannot be deleted.', 403);
    }

    // 1. Cascade update on transfers to prevent broken references
    const transfers = await SampleTransfer.find({ labReport: report._id });
    for (const tr of transfers) {
      tr.labReport = null;
      if (['COMPLETED', 'RESULT_READY', 'APPROVED', 'READY_TO_RETURN'].includes(tr.status)) {
        tr.status = 'UNDER_INVESTIGATION';
      }
      tr.transferHistory.push({
        status: tr.status,
        action: 'Report Deleted by Admin',
        performedBy: req.user.id,
        timestamp: new Date(),
        notes: `Associated report #${report.reportNumber || report._id} was deleted by Admin ${req.user.fullName}.`
      });
      await tr.save();
    }

    // 2. Financial Safety Check:
    // We strictly DO NOT delete Payment records or patient financial transactions.
    // The report document is safely deleted from LabReport.
    await LabReport.findByIdAndDelete(report._id);

    // 3. Activity / Audit Logging
    await recordActivity(
      req.user.id,
      isAdmin ? 'Admin deleted report' : 'Draft deleted',
      'LabReport',
      report._id,
      `Report #${report.reportNumber || report._id} (${report.status}) deleted by ${req.user.fullName} (${req.user.role}). Patient: ${report.patient?.name || report.patient}.`,
      { role: req.user.role, ipAddress: req.ip }
    );

    // 4. Real-time broadcast
    emit('reports:change', { action: 'deleted', id: report._id });
    emit('transfers:change', { action: 'sync' });
    emit('dashboard:change', { action: 'refresh' });

    res.json({ success: true, message: 'Report deleted successfully and system records updated.' });
  } catch (e) {
    next(e);
  }
}
export const deleteDraft = deleteReport;

export async function updateReport(req, res, next) {
  try {
    const isAdmin = ['Admin', 'Sub Admin'].includes(req.user.role);
    if (!isAdmin && req.user.role !== 'Sample Collector') {
      throw new AppError('Unauthorized to update report.', 403);
    }

    const report = await LabReport.findById(req.params.id).populate('patient');
    if (!report) throw new AppError('Report not found.', 404);

    if (!isAdmin && ['Approved', 'Ready for Printing'].includes(report.status)) {
      throw new AppError('Approved reports are finalized and read-only.', 403);
    }

    const { comments, equipment: eqList, priority, results, status, testPrices } = req.body;

    if (comments !== undefined) report.comments = String(comments).trim();
    if (Array.isArray(eqList)) report.equipment = eqList;
    if (priority && ['Routine', 'Urgent', 'Critical'].includes(priority)) report.priority = priority;

    if (Array.isArray(results)) {
      report.results = sanitizeResults(results, report.patient?.sex || '');
    }

    if (isAdmin && status && ['Draft', 'Submitted', 'Pending', 'Approved', 'Ready for Printing', 'Rejected'].includes(status)) {
      report.status = status;
      if (status === 'Approved') {
        report.approvedBy = req.user.id;
        report.approvedDate = new Date();
      }
    }

    // Price editing by Admin
    if (isAdmin && Array.isArray(testPrices) && testPrices.length > 0) {
      for (const tp of testPrices) {
        if (!tp.testId || tp.newPrice === undefined || isNaN(Number(tp.newPrice))) continue;
        const newPrice = Math.max(0, Number(tp.newPrice));
        const labTest = await LaboratoryTest.findById(tp.testId);
        if (labTest) {
          const oldPrice = labTest.price;
          labTest.price = newPrice;
          await labTest.save();

          await recordActivity(
            req.user.id,
            'Admin updated report price',
            'LaboratoryTest',
            labTest._id,
            `Admin ${req.user.fullName} updated price for test "${labTest.name}" from ${oldPrice} to ${newPrice} ETB.`,
            { role: req.user.role, ipAddress: req.ip }
          );

          // If patient order is not paid yet, update patient subtotal and grandTotal
          if (report.patient && report.patient.paymentStatus !== 'Paid') {
            const pRec = await Patient.findById(report.patient._id || report.patient);
            if (pRec && pRec.paymentStatus !== 'Paid') {
              const allTests = await LaboratoryTest.find({ _id: { $in: pRec.laboratoryTests } });
              const newSub = allTests.reduce((acc, curr) => acc + (curr.price || 0), 0);
              pRec.subtotal = newSub;
              pRec.grandTotal = Math.max(0, newSub - (pRec.discountAmount || 0));
              await pRec.save();
            }
          }
          // If already paid, historical payments are strictly preserved.
        }
      }
    }

    report.lastEditedAt = new Date();
    await report.save();

    await recordActivity(
      req.user.id,
      'Admin edited report',
      'LabReport',
      report._id,
      `Report #${report.reportNumber || report._id} updated by ${req.user.fullName}.`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('reports:change', { action: 'updated', id: report._id });
    emit('dashboard:change', { action: 'refresh' });

    res.json({ success: true, message: 'Report updated successfully.', report });
  } catch (e) {
    next(e);
  }
}

export async function beginCollection(req,res,next){const session=await mongoose.startSession();try{const patient=await Patient.findOne({_id:req.params.patientId, $or:[{paymentStatus:'Paid'},{registrationType:{$in:['Self','Referral','Self Aware']}}]});if(!patient)throw new AppError('Patient order for sample collection not found.',422);const userBranch=req.user.branchName||patient.branchName||'Main';const tests=await LaboratoryTest.find({_id:{$in:patient.laboratoryTests}}).populate('consumables.item','itemName').populate('category','name');let updated=[],deficits=[];await session.withTransaction(async()=>{let collection=await SampleCollection.findOne({patient:patient.id}).session(session);if(collection?.status==='Completed')throw new AppError('This collection is already complete.',422);if(!collection){const allConsumables=[];tests.forEach(test=>(test.consumables||[]).forEach(c=>allConsumables.push({testName:test.name,itemId:String(c.item._id||c.item),quantity:c.quantity})));const itemIds=[...new Set(allConsumables.map(x=>x.itemId))],items=await StockItem.find({_id:{$in:itemIds}}).session(session),byId=new Map(items.map(i=>[String(i.id),i]));const totals=new Map();allConsumables.forEach(c=>totals.set(c.itemId,(totals.get(c.itemId)||0)+c.quantity));const allocated=[...totals].flatMap(([id,quantity])=>byId.has(id)?[{item:byId.get(id).id,quantity}]:[]);[collection]=await SampleCollection.create([{patient:patient.id,collector:req.user.id,branchName:userBranch,status:'In Progress',startedAt:new Date(),allocation:allocated}],{session});for(const test of tests){for(const c of (test.consumables||[])){const item=byId.get(String(c.item._id||c.item));if(!item)continue;const qty=c.quantity;const before=item.currentQuantity-item.usedQuantity;item.usedQuantity+=qty;await item.save({session});const after=item.currentQuantity-item.usedQuantity;await StockHistory.create([{item:item.id,action:'Automatic Deduction',user:req.user.id,patient:patient.id,patientId:patient.patientId,testName:test.name,orderedTests:[test.name],previousQuantity:before,quantityDeducted:qty,newQuantity:after,reason:`Automatic deduction for ${test.name} during patient sample collection.`,field:'remainingQuantity'}],{session});if(!updated.some(u=>String(u._id)===String(item._id)))updated.push(item);if(after<0)deficits.push({item,before,required:qty,after})}}}else if(collection.status==='Queued'){collection.status='In Progress';collection.collector=req.user.id;collection.startedAt=new Date();await collection.save({session})}const isInternalMed = Boolean(patient.examinationFormType === 'Internal Medicine Speciality Examination Form');
await LabReport.findOneAndUpdate({patient:patient.id,status:{$in:['Draft','Rejected']}},{$setOnInsert:{patient:patient.id,collection:collection.id,laboratoryTests:patient.laboratoryTests||[],technician:req.user.id,submittedBy:req.user.id,branchName:userBranch,equipment:[],results:[],comments:'',isInternalMedicineForm:isInternalMed,status:'Draft',approvalStatus:'Draft'}},{upsert:true,session})});for(const item of updated)await notifyStockLevel(item);if(deficits.length){const admins=await User.find({role:'Admin',status:'Active'}).select('_id');if(admins.length)await Notification.insertMany(deficits.flatMap(d=>admins.map(admin=>({recipient:admin.id,item:d.item.id,entity:patient.id,entityType:'StockDeficit',type:'Critical Stock Deficit',message:`CRITICAL STOCK DEFICIT: ${d.item.itemName} is now ${d.after}. Patient ${patient.patientId} (${patient.name}); collector ${req.user.fullName}.`}))));emit('notifications:change',{action:'new'})}await recordActivity(req.user.id,'Sample collection started','SampleCollection',patient.id,patient.patientId,{role:req.user.role,ipAddress:req.ip});emit('collection:change',{action:'started'});if(updated.length)emit('stock:change',{action:'quantity'});res.json({message:'Collection started and recorded in Unfinished Collections.'})}catch(e){next(e)}finally{await session.endSession()}}
export async function patientAllocation(req,res,next){try{const patient=await Patient.findById(req.params.patientId).populate({path:'laboratoryTests',select:'name consumables',populate:{path:'consumables.item',select:'itemName unit'}});if(!patient)return res.json({allocationByTest:{}});const tests=patient.laboratoryTests||[];const history=await StockHistory.find({patient:req.params.patientId,action:{$in:['Automatic Deduction','Manual Deduction']}}).populate('item','itemName unit');const allocationByTest={};tests.forEach(test=>{allocationByTest[test.name]=[]});const testItemMap=new Map();tests.forEach(test=>{(test.consumables||[]).forEach(c=>{const itemId=String(c.item?._id||c.item);if(!testItemMap.has(itemId))testItemMap.set(itemId,[]);testItemMap.get(itemId).push({testName:test.name,configuredQty:c.quantity})})});history.forEach(h=>{if(!h.item)return;const itemId=String(h.item._id||h.item);const itemName=h.item.itemName||'Supply Item';const unit=h.item.unit||'';const qty=h.quantityDeducted||0;const source=h.action==='Manual Deduction'?'Manual':'Smart';if(h.testName&&allocationByTest[h.testName]!==undefined){const list=allocationByTest[h.testName];const existing=list.find(x=>x.itemName===itemName);if(existing){existing.quantity+=qty}else{list.push({itemName,unit,quantity:qty,source})}}else if(Array.isArray(h.orderedTests)&&h.orderedTests.length===1&&allocationByTest[h.orderedTests[0]]!==undefined){const tName=h.orderedTests[0];const list=allocationByTest[tName];const existing=list.find(x=>x.itemName===itemName);if(existing){existing.quantity+=qty}else{list.push({itemName,unit,quantity:qty,source})}}else{const mappedTests=testItemMap.get(itemId)||[];if(mappedTests.length>0){mappedTests.forEach(m=>{if(allocationByTest[m.testName]){const list=allocationByTest[m.testName];const existing=list.find(x=>x.itemName===itemName);const itemQty=source==='Smart'?(m.configuredQty||qty):qty;if(existing){existing.quantity+=itemQty}else{list.push({itemName,unit,quantity:itemQty,source})}}})}else{const targetTests=(Array.isArray(h.orderedTests)&&h.orderedTests.length>0)?h.orderedTests:tests.map(t=>t.name);targetTests.forEach(tn=>{if(allocationByTest[tn]){const list=allocationByTest[tn];const existing=list.find(x=>x.itemName===itemName);if(existing){existing.quantity+=qty}else{list.push({itemName,unit,quantity:qty,source})}}})}}});res.json({allocationByTest});}catch(e){next(e)}}
export async function stock(req,res,next){try{const items=await StockItem.find({status:'Active'}).sort({itemName:1});res.json({items:items.map(x=>({...x.toJSON(),remainingQuantity:x.currentQuantity-x.usedQuantity}))})}catch(e){next(e)}}
export async function extraRequest(req,res,next){try{const patient=await Patient.findById(req.body.patient);const item=await StockItem.findById(req.body.item);const collection=await SampleCollection.findOne({patient:req.body.patient,collector:req.user.id,status:'In Progress'});if(!patient||!item)throw new AppError('Patient or stock item not found.',404);if(!collection){const message='Extra consumables can only be requested during an active collection assigned to you.';await recordActivity(req.user.id,'Unauthorized extra stock request','ExtraStockRequest',req.body.patient,message,{role:req.user.role,ipAddress:req.ip});await notifyRoles(['Admin'],'Critical Laboratory Message',message,req.body.patient);throw new AppError(message,403)}if(item.status!=='Active')throw new AppError('Select an active stock item.',422);const number=`ESR-${Date.now().toString(36).toUpperCase()}`;const request=await ExtraStockRequest.create({...req.body,requestNumber:number,requestedBy:req.user.id});await notifyRoles(['Admin','Approver'],'Critical Laboratory Message',`Extra consumable request ${number} requires review.`,request.id);await recordActivity(req.user.id,'Extra stock request submitted','ExtraStockRequest',request.id,number,{role:req.user.role,ipAddress:req.ip});emit('extraRequests:change',{action:'created'});emit('notifications:change',{action:'new'});res.status(201).json({request})}catch(e){next(e)}}
export async function equipmentParameters(req,res){res.json(equipmentPayload())}
function sanitizeResults(raw, sex = ''){if(!Array.isArray(raw))return[];return raw.filter(row=>row&&row.sampleName&&String(row.sampleName).trim()&&row.result!==undefined&&row.result!==null&&String(row.result).trim()!=='').map(row=>{const result=String(row.result).trim();const referenceValue=String(row.referenceValue||'').trim();const computedFlag=calculateFlag(result,referenceValue,sex);const rawFlag=(row.flag||computedFlag||'').toString().trim();const flag=['CH','Critical High','CRITICAL HIGH'].includes(rawFlag)?'CH':['CL','Critical Low','CRITICAL LOW'].includes(rawFlag)?'CL':['H','High'].includes(rawFlag)?'H':['L','Low'].includes(rawFlag)?'L':['N','Normal'].includes(rawFlag)?'N':'';return{sampleName:String(row.sampleName).trim(),result,unit:String(row.unit||'').trim(),referenceValue,flag,remarks:String(row.remarks||'').trim(),category:String(row.category||'').trim(),subcategory:String(row.subcategory||'').trim(),isTransferred:Boolean(row.isTransferred),transferredFrom:row.transferredFrom||null,performedAt:row.performedAt||null,transferId:row.transferId||null,testId:row.testId||null}})}
export async function saveReport(req,res,next){try{let collection=await SampleCollection.findOne({patient:req.params.patientId,collector:req.user.id});if(!collection){collection=await SampleCollection.findOne({patient:req.params.patientId});if(collection&&collection.status!=='Completed'){collection.collector=req.user.id;await collection.save();}}if(!collection){try{collection=await SampleCollection.create({patient:req.params.patientId,collector:req.user.id,branchName:req.user.branchName||'Main',status:'In Progress',startedAt:new Date()});}catch(_){collection=await SampleCollection.findOne({patient:req.params.patientId});}}if(!collection)throw new AppError('Start the collection before creating a report.',422);if(await ExtraStockRequest.exists({patient:req.params.patientId,requestedBy:req.user.id,status:'Rejected'}))throw new AppError('A requested extra item was rejected. Resolve it with an approver before continuing.',422);const patient=await Patient.findById(req.params.patientId).populate({path:'laboratoryTests',select:'name category subcategory',populate:{path:'category',select:'name'}});if(patient && (req.body.systolicBP!==undefined || req.body.diastolicBP!==undefined)){const sys = req.body.systolicBP ? Number(req.body.systolicBP) : null;const dia = req.body.diastolicBP ? Number(req.body.diastolicBP) : null;if(sys && (sys<50 || sys>300)) throw new AppError('Systolic BP must be between 50 and 300 mmHg.',422);if(dia && (dia<30 || dia>200)) throw new AppError('Diastolic BP must be between 30 and 200 mmHg.',422);patient.systolicBP = sys;patient.diastolicBP = dia;await patient.save();emit('reception:change',{action:'vitals_updated'});emit('collection:change',{action:'vitals_updated'});}const userBranch=req.user.branchName||collection.branchName||'Main';const isInternalMed=Boolean(req.body.isInternalMedicineForm === true || patient?.examinationFormType === 'Internal Medicine Speciality Examination Form');const internalMedicineReport=req.body.internalMedicineReport||{};const results=sanitizeResults(req.body.results,patient?.sex);const equipment=Array.isArray(req.body.equipment)?req.body.equipment:[];const comments=req.body.comments||'';const sampleCollectorComments=Array.isArray(req.body.sampleCollectorComments)?req.body.sampleCollectorComments.filter(c=>c&&c.mainCategory&&typeof c.comment==='string').map(c=>({mainCategory:String(c.mainCategory).trim(),subcategory:c.subcategory?String(c.subcategory).trim():null,comment:String(c.comment||'').trim()})):[];const testInterpretations=Array.isArray(req.body.testInterpretations)?req.body.testInterpretations.filter(t=>t&&t.testName&&Array.isArray(t.interpretations)).map(t=>({laboratoryTest:t.laboratoryTest||null,testName:String(t.testName).trim(),subcategory:t.subcategory?String(t.subcategory).trim():'',interpretations:(t.interpretations||[]).filter(i=>i&&i.title&&i.interpretation).map(i=>({interpretationId:String(i.interpretationId||'').trim(),title:String(i.title).trim(),interpretation:String(i.interpretation).trim()}))})):[];let existingDraft=await LabReport.findOne({patient:req.params.patientId,technician:req.user.id,status:{$in:['Draft','Rejected']}});if(!existingDraft){existingDraft=await LabReport.findOne({patient:req.params.patientId,status:{$in:['Draft','Rejected']}});}const isCross=Boolean(existingDraft?.isCrossBranchTransfer);const origBranch=existingDraft?.originalBranch||null;const perfBranch=existingDraft?.performingBranch||null;const trfId=existingDraft?.transfer||null;const reportQuery=existingDraft?{_id:existingDraft._id}:{patient:req.params.patientId,technician:req.user.id,status:{$in:['Draft','Rejected']}};const report=await LabReport.findOneAndUpdate(reportQuery,{patient:req.params.patientId,collection:collection.id,laboratoryTests:(isCross&&existingDraft?.laboratoryTests?.length)?existingDraft.laboratoryTests:(patient?.laboratoryTests||[]),technician:req.user.id,submittedBy:req.user.id,branchName:userBranch,isCrossBranchTransfer:isCross,originalBranch:origBranch,performingBranch:perfBranch,transfer:trfId,equipment,results,comments,sampleCollectorComments,testInterpretations,isInternalMedicineForm:isInternalMed,internalMedicineReport:isInternalMed?internalMedicineReport:undefined,status:'Draft',approvalStatus:'Draft'},{new:true,upsert:true,setDefaultsOnInsert:true}).populate({path:'patient',select:'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',populate:[{path:'laboratoryTests',select:'name category subcategory',populate:{path:'category',select:'name'}},{path:'sampleTypes',select:'name'}]});if(trfId){await SampleTransfer.findByIdAndUpdate(trfId,{status:'UNDER_INVESTIGATION',labReport:report.id});}await recordActivity(req.user.id,'Report saved or returned report amended','LabReport',report.id,'Draft',{role:req.user.role,ipAddress:req.ip});res.json({report})}catch(e){next(e)}}
export async function submitReport(req,res,next){try{if(await ExtraStockRequest.exists({patient:req.params.patientId,requestedBy:req.user.id,status:'Rejected'}))throw new AppError('A requested extra item was rejected. This collection cannot continue.',422);const patient=await Patient.findById(req.params.patientId).populate({path:'laboratoryTests',select:'name category subcategory',populate:{path:'category',select:'name'}});if(patient && (req.body.systolicBP!==undefined || req.body.diastolicBP!==undefined)){const sys = req.body.systolicBP ? Number(req.body.systolicBP) : null;const dia = req.body.diastolicBP ? Number(req.body.diastolicBP) : null;if(sys && (sys<50 || sys>300)) throw new AppError('Systolic BP must be between 50 and 300 mmHg.',422);if(dia && (dia<30 || dia>200)) throw new AppError('Diastolic BP must be between 30 and 200 mmHg.',422);patient.systolicBP = sys;patient.diastolicBP = dia;await patient.save();emit('reception:change',{action:'vitals_updated'});emit('collection:change',{action:'vitals_updated'});}let report=await LabReport.findOne({patient:req.params.patientId,technician:req.user.id,status:{$in:['Draft','Rejected']}});if(!report){report=await LabReport.findOne({patient:req.params.patientId,status:{$in:['Draft','Rejected']}});}if(!report)throw new AppError('Draft report not found.',404);const isInternalMed=Boolean(report.isInternalMedicineForm === true || patient?.examinationFormType === 'Internal Medicine Speciality Examination Form');report.isInternalMedicineForm=isInternalMed;if(isInternalMed){if(!report.internalMedicineReport||!report.internalMedicineReport.examinationResult){throw new AppError('Please complete the medical examination assessment and result before submitting for approval.',422);}}else{const cleanResults=sanitizeResults(report.results,patient?.sex);if(cleanResults.length===0)throw new AppError('Cannot submit report without laboratory results. Please enter at least one result.',422);report.results=cleanResults;}const submittedAt=new Date();report.status='Submitted';report.approvalStatus='Pending Approval';report.submittedBy=req.user.id;report.submittedDate=submittedAt;report.submittedAt=submittedAt;report.rejectionReason='';report.rejectedBy=undefined;report.rejectedDate=undefined;if(!report.branchName)report.branchName=req.user.branchName||'Main';if(!report.reportNumber)report.reportNumber=`RPT-${Date.now().toString(36).toUpperCase()}`;if(report.transfer||report.isCrossBranchTransfer){const trf=report.transfer?await SampleTransfer.findById(report.transfer):await SampleTransfer.findOne({patient:report.patient?._id||report.patient,status:{$nin:['COMPLETED','CANCELLED']}});if(trf){trf.status='RESULT_READY';trf.investigationCompletedAt=submittedAt;trf.labReport=report._id;trf.transferHistory.push({status:'RESULT_READY',action:`Investigation completed by ${req.user.fullName||req.user.username} at ${trf.destinationBranch}, submitted for approval`,performedBy:req.user.id,timestamp:submittedAt});await trf.save();emit('transfers:change',{action:'result_ready',transferId:trf._id});}}await report.save();await report.populate({path:'patient',select:'patientId barcode name age sex phone address nationality dateOfBirth passportNumber passportIssueDate maritalStatus jobTitle patientPhoto examinationFormType laboratoryTests sampleTypes branchName referralHospital registeredBy',populate:[{path:'laboratoryTests',select:'name category subcategory',populate:{path:'category',select:'name'}},{path:'sampleTypes',select:'name'}]});if(!report.transfer && !report.isCrossBranchTransfer){await SampleCollection.findOneAndUpdate({patient:req.params.patientId},{status:'Completed',completedAt:new Date()});}await notifyRoles(['Admin','Approver'],'New Approved Report',`Laboratory report ${report.reportNumber} is awaiting review and approval.`,report.id);await recordActivity(req.user.id,'Report submitted for approval','LabReport',report.id,report.reportNumber,{role:req.user.role,ipAddress:req.ip});emit('reports:change',{action:'submitted'});emit('collection:change',{action:'completed'});emit('notifications:change',{action:'new'});res.json({report})}catch(e){next(e)}}
export async function updatePatientVitals(req,res,next){try{const {patientId}=req.params;const {systolicBP,diastolicBP}=req.body;const patient=await Patient.findById(patientId);if(!patient)throw new AppError('Patient not found.',404);const sys = systolicBP ? Number(systolicBP) : null;const dia = diastolicBP ? Number(diastolicBP) : null;if(sys && (sys<50 || sys>300)) throw new AppError('Systolic BP must be between 50 and 300 mmHg.',422);if(dia && (dia<30 || dia>200)) throw new AppError('Diastolic BP must be between 30 and 200 mmHg.',422);patient.systolicBP = sys;patient.diastolicBP = dia;await patient.save();await recordActivity(req.user.id,'Updated patient vital signs','Patient',patient.id,patient.patientId,{role:req.user.role,ipAddress:req.ip});emit('reception:change',{action:'vitals_updated'});emit('collection:change',{action:'vitals_updated'});res.json({patient});}catch(e){next(e)}}
export async function counsellingQueue(req,res,next){try{const q=String(req.query.q||'').trim(),branch=req.user.role!=='Admin'?(req.user.branchName||'Main'):(req.query.branchName&&req.query.branchName!=='All'?req.query.branchName:null);const filter={status:{$in:['Waiting for Counseling','In Progress']}};if(branch)filter.branchName=branch;if(q)filter.$or=[{'patientId.patientId':{$regex:q,$options:'i'}}];const records=await CounsellingRecord.find(filter).populate({path:'patient',select:'patientId barcode name age sex phone registrationType referralHospital registrationDate branchName'}).populate('registeredBy','fullName').sort({createdDate:1});const filtered=q?records.filter(r=>`${r.patient?.patientId||''} ${r.patient?.barcode||''} ${r.patient?.name||''} ${r.patient?.phone||''}`.toLowerCase().includes(q.toLowerCase())):records;res.json({records:filtered})}catch(e){next(e)}}
export async function counsellingHistory(req,res,next){try{const q=String(req.query.q||'').trim(),branch=req.user.role!=='Admin'?(req.user.branchName||'Main'):(req.query.branchName&&req.query.branchName!=='All'?req.query.branchName:null);const filter={status:'Completed'};if(branch)filter.branchName=branch;if(req.query.counsellor)filter.counselledBy=req.query.counsellor;if(req.query.date){const start=new Date(req.query.date),end=new Date(req.query.date);start.setHours(0,0,0,0);end.setHours(23,59,59,999);filter.completedAt={$gte:start,$lte:end}}const records=await CounsellingRecord.find(filter).populate({path:'patient',select:'patientId barcode name phone referralHospital registrationType branchName'}).populate('counselledBy','fullName').sort({completedAt:-1}).limit(200);const filtered=q?records.filter(r=>`${r.patient?.patientId||''} ${r.patient?.name||''} ${r.patient?.phone||''} ${r.patient?.referralHospital||''} ${r.counselledBy?.fullName||''}`.toLowerCase().includes(q.toLowerCase())):records;res.json({records:filtered})}catch(e){next(e)}}
export async function saveCounselling(req,res,next){try{const record=await CounsellingRecord.findById(req.params.id);if(!record)throw new AppError('Counseling record not found.',404);if(record.status==='Completed')throw new AppError('Completed counseling records cannot be changed.',422);const fields=['chiefComplaint','reason','symptoms','observations','adviceGiven','recommendedTests','followUp','additionalNotes','durationMinutes'];for(const field of fields)if(req.body[field]!==undefined)record[field]=req.body[field];if(req.body.recommendedDoctorVisit!==undefined)record.recommendedDoctorVisit=Boolean(req.body.recommendedDoctorVisit);record.status='In Progress';record.counselledBy=req.user.id;record.counselledAt=new Date();await record.save();await recordActivity(req.user.id,'Counseling saved','CounsellingRecord',record.id,record.reason,{role:req.user.role,ipAddress:req.ip});res.json({record})}catch(e){next(e)}}
export async function completeCounselling(req,res,next){try{const record=await CounsellingRecord.findById(req.params.id).populate('patient','patientId');if(!record)throw new AppError('Counseling record not found.',404);if(record.status==='Completed')throw new AppError('This counseling session is already completed.',422);const fields=['chiefComplaint','reason','symptoms','observations','adviceGiven','recommendedTests','followUp','additionalNotes','durationMinutes'];for(const field of fields)if(req.body[field]!==undefined)record[field]=req.body[field];if(req.body.recommendedDoctorVisit!==undefined)record.recommendedDoctorVisit=Boolean(req.body.recommendedDoctorVisit);record.status='Completed';record.counselledBy=req.user.id;record.counselledAt=record.counselledAt||new Date();record.completedAt=new Date();await record.save();await notifyRoles(['Admin'],'Counselling Reminder',`Counseling completed for ${record.patient?.patientId||'a patient'}.`,record.id);await recordActivity(req.user.id,'Counseling completed','CounsellingRecord',record.id,record.reason,{role:req.user.role,ipAddress:req.ip});emit('counselling:change',{action:'completed'});emit('notifications:change',{action:'new'});res.json({record})}catch(e){next(e)}}

export async function investigationQueue(req,res,next){try{const q=String(req.query.q||'').trim();const branch=req.user.role!=='Admin'?(req.user.branchName||'Main'):(req.query.branchName&&req.query.branchName!=='All'?req.query.branchName:null);const filter={registrationType:'Self Aware',paymentStatus:'Unpaid'};if(branch)filter.branchName=branch;if(q)filter.$or=[{patientId:{$regex:q,$options:'i'}},{name:{$regex:q,$options:'i'}},{phone:{$regex:q,$options:'i'}}];const patients=await Patient.find(filter).populate('registeredBy','fullName').populate('laboratoryTests','name price').populate('sampleTypes','name').sort({registrationDate:1});res.json({patients});}catch(e){next(e)}}

export async function saveInvestigationDraft(req,res,next){try{const {patientId}=req.params;const {laboratoryTests=[],symptoms='',systolicBP,diastolicBP}=req.body;const patient=await Patient.findOne({_id:patientId,registrationType:'Self Aware',paymentStatus:'Unpaid'});if(!patient)throw new AppError('Self-Aware patient waiting for investigation not found.',404);if(Array.isArray(laboratoryTests)){const settings=await LaboratorySettings.findOne({key:'default'});const tests=await LaboratoryTest.find({_id:{$in:laboratoryTests},status:'Active'}).populate('requiredSampleTypes').populate('category','name');const subtotal=calculateSubtotalWithCbcGroup(tests,settings);const samples=[...new Map(tests.flatMap(t=>t.requiredSampleTypes||[]).map(s=>[String(s._id),s])).values()];patient.laboratoryTests=tests.map(t=>t.id);patient.sampleTypes=samples.map(s=>s.id);patient.subtotal=subtotal;patient.grandTotal=subtotal;}if(symptoms!==undefined)patient.investigationNotes=symptoms;if(systolicBP!==undefined){if(systolicBP&&(Number(systolicBP)<50||Number(systolicBP)>300))throw new AppError('Systolic BP must be between 50 and 300 mmHg.',422);patient.systolicBP=systolicBP?Number(systolicBP):null;}if(diastolicBP!==undefined){if(diastolicBP&&(Number(diastolicBP)<30||Number(diastolicBP)>200))throw new AppError('Diastolic BP must be between 30 and 200 mmHg.',422);patient.diastolicBP=diastolicBP?Number(diastolicBP):null;}await patient.save();await recordActivity(req.user.id,'Saved investigation draft','Patient',patient.id,patient.patientId,{role:req.user.role,ipAddress:req.ip});res.json({patient});}catch(e){next(e)}}

export async function submitInvestigation(req,res,next){try{const {patientId}=req.params;const {laboratoryTests,symptoms='',systolicBP,diastolicBP}=req.body;if(!Array.isArray(laboratoryTests)||!laboratoryTests.length)throw new AppError('Select at least one laboratory test.',422);const patient=await Patient.findOne({_id:patientId,registrationType:'Self Aware',paymentStatus:'Unpaid'});if(!patient)throw new AppError('Self-Aware patient waiting for investigation not found.',404);const settings=await LaboratorySettings.findOne({key:'default'});const tests=await LaboratoryTest.find({_id:{$in:laboratoryTests},status:'Active'}).populate('requiredSampleTypes').populate('category','name');if(tests.length!==laboratoryTests.length)throw new AppError('One or more selected laboratory tests are unavailable.',422);const subtotal=calculateSubtotalWithCbcGroup(tests,settings);const samples=[...new Map(tests.flatMap(t=>t.requiredSampleTypes||[]).map(s=>[String(s._id),s])).values()];patient.laboratoryTests=tests.map(t=>t.id);patient.sampleTypes=samples.map(s=>s.id);patient.subtotal=subtotal;patient.grandTotal=subtotal;if(symptoms)patient.investigationNotes=symptoms;if(systolicBP!==undefined){if(systolicBP&&(Number(systolicBP)<50||Number(systolicBP)>300))throw new AppError('Systolic BP must be between 50 and 300 mmHg.',422);patient.systolicBP=systolicBP?Number(systolicBP):null;}if(diastolicBP!==undefined){if(diastolicBP&&(Number(diastolicBP)<30||Number(diastolicBP)>200))throw new AppError('Diastolic BP must be between 30 and 200 mmHg.',422);patient.diastolicBP=diastolicBP?Number(diastolicBP):null;}patient.paymentStatus='Waiting for Payment';await patient.save();await recordActivity(req.user.id,'Investigation completed & sent for payment','Patient',patient.id,patient.patientId,{role:req.user.role,ipAddress:req.ip});emit('reception:change',{action:'investigation_submitted'});emit('collection:change',{action:'investigation_submitted'});res.json({patient});}catch(e){next(e)}}

export async function deleteQueueItem(req, res, next) {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('Patient queue record not found.', 404);
    }

    // Branch authorization check
    const isSuperAdmin = req.user.role === 'Admin' || req.user.isCEO;
    if (!isSuperAdmin && req.user.branchName && patient.branchName && req.user.branchName !== patient.branchName) {
      throw new AppError(`Unauthorized: You do not have permission to manage queues in ${patient.branchName} branch.`, 403);
    }

    // Safety check 1: Active cross-branch transfer
    const activeTransfer = await SampleTransfer.findOne({
      patient: patient._id,
      status: { $in: ['PENDING_TRANSFER', 'RECEIVED', 'UNDER_INVESTIGATION', 'RESULT_READY', 'READY_TO_RETURN'] }
    });
    if (activeTransfer) {
      throw new AppError(`Cannot remove patient from queue: An active cross-branch transfer is currently in progress (${activeTransfer.status.replace('_', ' ')}).`, 400);
    }

    // Safety check 2: Active or approved Lab Report
    const activeReport = await LabReport.findOne({
      patient: patient._id,
      status: { $in: ['Submitted', 'Pending', 'Approved', 'Ready for Printing'] }
    });
    if (activeReport) {
      throw new AppError(`Cannot remove patient from queue: Laboratory report is currently ${activeReport.status} and cannot be removed.`, 400);
    }

    // Safely mark SampleCollection as Cancelled without touching Patient medical history or payment
    await SampleCollection.findOneAndUpdate(
      { patient: patient._id },
      {
        status: 'Cancelled',
        collector: req.user.id,
        branchName: patient.branchName || req.user.branchName || 'Main'
      },
      { upsert: true, new: true }
    );

    // If an empty draft report exists, clean it up
    const draftReport = await LabReport.findOne({ patient: patient._id, status: 'Draft' });
    if (draftReport && (!draftReport.results || draftReport.results.length === 0)) {
      await LabReport.findByIdAndDelete(draftReport._id);
    }

    await recordActivity(
      req.user.id,
      'Removed patient from sample collection queue',
      'SampleCollection',
      patient._id,
      patient.patientId,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('collection:change', { action: 'queue_removed', patientId: patient._id });

    res.json({
      success: true,
      message: `Patient ${patient.patientId} (${patient.name}) successfully removed from sample collection queue.`,
      patientId: patient._id
    });
  } catch (err) {
    next(err);
  }
}

