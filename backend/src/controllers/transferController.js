import SampleTransfer from '../models/SampleTransfer.js';
import Patient from '../models/Patient.js';
import LaboratoryTest from '../models/LaboratoryTest.js';
import LabReport from '../models/LabReport.js';
import SampleCollection from '../models/SampleCollection.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { recordActivity } from '../services/activityService.js';
import { emit } from '../services/sseService.js';

function getNextTransferId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${ts}-${rand}`;
}

export async function createTransfer(req, res, next) {
  try {
    const { patientId, testId, testIds: rawTestIds, priority, notes } = req.body;
    const testIds = Array.isArray(rawTestIds) && rawTestIds.length ? rawTestIds : (testId ? [testId] : []);

    if (!patientId || !testIds.length) {
      throw new AppError('Patient ID and Laboratory Test ID(s) are required.', 400);
    }

    // Determine branches securely from user session
    const userBranch = req.user.branchName || 'Main';
    let sourceBranch = userBranch;
    if (req.user.role === 'Admin' && req.body.sourceBranch) {
      sourceBranch = req.body.sourceBranch;
    }
    const destinationBranch = sourceBranch === 'Main' ? 'Otona' : 'Main';

    const patient = await Patient.findById(patientId).populate({
      path: 'laboratoryTests',
      select: 'name category subcategory',
      populate: { path: 'category', select: 'name' }
    });
    if (!patient) throw new AppError('Patient not found.', 404);

    if (req.user.role !== 'Admin' && patient.branchName && patient.branchName !== sourceBranch) {
      throw new AppError(`Patient registered at ${patient.branchName} branch cannot be transferred from ${sourceBranch}.`, 403);
    }

    // Check if patient already has an approved report containing tests to transfer (Requirement 26)
    const existingApprovedReports = await LabReport.find({
      patient: patientId,
      status: { $in: ['Approved', 'Ready for Printing'] }
    });

    const createdTransfers = [];
    const now = new Date();

    for (const tId of testIds) {
      // Find requested laboratory test
      const testDoc = (patient.laboratoryTests || []).find(t => String(t._id || t) === String(tId));
      let testName = testDoc?.name || '';
      let testCategory = testDoc?.category?.name || '';
      if (!testDoc) {
        const independentTest = await LaboratoryTest.findById(tId).populate('category', 'name');
        if (independentTest) {
          testName = independentTest.name;
          testCategory = independentTest.category?.name || '';
        } else {
          throw new AppError(`The requested test (${tId}) is not assigned to this patient.`, 404);
        }
      }

      // Check if test was already completed in an approved report
      const alreadyDone = existingApprovedReports.some(rep => {
        const testInRep = (rep.laboratoryTests || []).some(t => String(t._id || t) === String(tId));
        const resultInRep = (rep.results || []).some(r =>
          (r.sampleName || '').trim().toUpperCase() === testName.trim().toUpperCase() ||
          String(r.testId || '') === String(tId)
        );
        return testInRep || resultInRep;
      });

      if (alreadyDone) {
        throw new AppError(`This test (${testName}) has already been completed and cannot be transferred.`, 422);
      }

      // Prevent duplicate transfers
      const existingTransfer = await SampleTransfer.findOne({
        patient: patientId,
        laboratoryTest: tId,
        status: { $nin: ['COMPLETED', 'CANCELLED'] }
      });

      if (existingTransfer) {
        throw new AppError(
          `Sample Already Transferred: This test (${testName}) is currently being processed at ${existingTransfer.destinationBranch}.`,
          409
        );
      }

      const transferId = getNextTransferId();

      const transfer = await SampleTransfer.create({
        transferId,
        patient: patientId,
        laboratoryTest: tId,
        testName,
        testCategory,
        sourceBranch,
        destinationBranch,
        status: 'PENDING_TRANSFER',
        priority: ['Routine', 'Urgent', 'Critical'].includes(priority) ? priority : 'Routine',
        sentBy: req.user.id,
        sentAt: now,
        notes: notes ? String(notes).trim() : '',
        transferHistory: [{
          status: 'PENDING_TRANSFER',
          action: `Sample transfer initiated from ${sourceBranch} to ${destinationBranch}`,
          performedBy: req.user.id,
          timestamp: now,
          notes: notes ? String(notes).trim() : ''
        }]
      });

      createdTransfers.push(transfer);
    }

    // Notify receiving branch Sample Collectors & Approvers
    const destinationUsers = await User.find({
      branchName: destinationBranch,
      role: { $in: ['Sample Collector', 'Approver', 'Admin'] },
      status: 'Active'
    }).select('_id');

    if (destinationUsers.length) {
      const namesList = createdTransfers.map(t => t.testName).join(', ');
      await Notification.insertMany(destinationUsers.map(u => ({
        recipient: u._id,
        type: 'New Sample Transferred',
        message: `New sample(s) transferred from ${sourceBranch}: ${patient.name} (${namesList}).`,
        entity: createdTransfers[0]._id,
        entityType: 'SampleTransfer'
      })));
      emit('notifications:change', { action: 'new' });
    }

    await recordActivity(
      req.user.id,
      `Sent ${createdTransfers.length} sample(s) to ${destinationBranch}`,
      'SampleTransfer',
      createdTransfers[0]._id,
      `${patient.patientId} - ${createdTransfers.map(t => t.testName).join(', ')}`,
      { role: req.user.role, ipAddress: req.ip }
    );

    emit('transfers:change', { action: 'sent', sourceBranch, destinationBranch });
    emit('collection:change', { action: 'transferred' });

    const populatedList = await SampleTransfer.find({
      _id: { $in: createdTransfers.map(t => t._id) }
    })
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone branchName paymentStatus systolicBP diastolicBP referralHospital'
      })
      .populate('laboratoryTest', 'name category subcategory')
      .populate('sentBy', 'fullName username role');

    res.status(201).json({
      success: true,
      count: populatedList.length,
      transfer: populatedList[0],
      transfers: populatedList
    });
  } catch (err) {
    next(err);
  }
}

export async function getTransfers(req, res, next) {
  try {
    const { type, status, q, branchName, direction, date, dateFrom, dateTo } = req.query;
    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO || userBranch === 'All';

    const filter = {};

    if (direction === 'Main-to-Otona' || direction === 'main_to_otona') {
      filter.sourceBranch = 'Main';
      filter.destinationBranch = 'Otona';
    } else if (direction === 'Otona-to-Main' || direction === 'otona_to_main') {
      filter.sourceBranch = 'Otona';
      filter.destinationBranch = 'Main';
    } else if (isAdmin) {
      if (req.query.sourceBranch) {
        filter.sourceBranch = req.query.sourceBranch;
      }
      if (req.query.destinationBranch) {
        filter.destinationBranch = req.query.destinationBranch;
      }
      if (!req.query.sourceBranch && !req.query.destinationBranch) {
        if (branchName && branchName !== 'All') {
          filter.$or = [{ sourceBranch: branchName }, { destinationBranch: branchName }];
        }
      }
    } else {
      if (type === 'received') {
        filter.destinationBranch = userBranch;
      } else if (type === 'sent') {
        filter.sourceBranch = userBranch;
      } else {
        filter.$or = [{ destinationBranch: userBranch }, { sourceBranch: userBranch }];
      }
    }

    if (req.query.includeCleared !== 'true') {
      filter.isCleared = { $ne: true };
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    // Time period filtering
    const period = String(req.query.period || '').trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (period === 'today' || period === "today's") {
      filter.sentAt = {
        $gte: today,
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
    } else if (period === 'lastweek' || period === 'last week') {
      const day = now.getDay();
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
      const lastMon = new Date(thisMon);
      lastMon.setDate(lastMon.getDate() - 7);
      const lastSun = new Date(thisMon);
      lastSun.setDate(lastSun.getDate() - 1);
      lastSun.setHours(23, 59, 59, 999);
      filter.sentAt = { $gte: lastMon, $lte: lastSun };
    } else if (period === 'lastmonth' || period === 'last month') {
      const fMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      filter.sentAt = { $gte: fMonth, $lte: lMonth };
    } else if (date) {
      const dStart = new Date(date);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.sentAt = { $gte: dStart, $lte: dEnd };
    } else if (dateFrom || dateTo) {
      filter.sentAt = {};
      if (dateFrom) {
        const dStart = new Date(dateFrom);
        dStart.setHours(0, 0, 0, 0);
        filter.sentAt.$gte = dStart;
      }
      if (dateTo) {
        const dEnd = new Date(dateTo);
        dEnd.setHours(23, 59, 59, 999);
        filter.sentAt.$lte = dEnd;
      }
    }

    let transfers = await SampleTransfer.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone branchName paymentStatus systolicBP diastolicBP referralHospital registrationDate'
      })
      .populate({
        path: 'laboratoryTest',
        select: 'name category subcategory',
        populate: { path: 'category', select: 'name' }
      })
      .populate('sentBy', 'fullName username')
      .populate('receivedBy', 'fullName username')
      .populate({
        path: 'labReport',
        populate: [
          { path: 'technician', select: 'fullName' },
          { path: 'approvedBy', select: 'fullName' }
        ]
      })
      .sort({ sentAt: -1 })
      .limit(200)
      .lean();

    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      transfers = transfers.filter(t => {
        const p = t.patient || {};
        return (
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.patientId && p.patientId.toLowerCase().includes(term)) ||
          (p.phone && p.phone.toLowerCase().includes(term)) ||
          (t.testName && t.testName.toLowerCase().includes(term)) ||
          (t.transferId && t.transferId.toLowerCase().includes(term))
        );
      });
    }

    res.json({ success: true, count: transfers.length, transfers });
  } catch (err) {
    next(err);
  }
}

export async function receiveTransfer(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer record not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;

    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch staff can receive this sample.`, 403);
    }

    if (['COMPLETED', 'CANCELLED'].includes(transfer.status)) {
      throw new AppError(`Cannot receive transfer in ${transfer.status} status.`, 422);
    }

    const now = new Date();
    transfer.status = 'RECEIVED';
    transfer.receivedBy = req.user.id;
    transfer.receivedAt = now;
    transfer.transferHistory.push({
      status: 'RECEIVED',
      action: `Sample received at ${userBranch} branch`,
      performedBy: req.user.id,
      timestamp: now
    });

    await transfer.save();
    emit('transfers:change', { action: 'received', transferId: transfer._id });

    res.json({ success: true, transfer });
  } catch (err) {
    next(err);
  }
}

export async function startInvestigation(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id).populate('patient');
    if (!transfer) throw new AppError('Transfer record not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;

    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch technicians can investigate this sample.`, 403);
    }

    const now = new Date();
    if (!transfer.receivedAt) {
      transfer.receivedAt = now;
      transfer.receivedBy = req.user.id;
    }

    transfer.status = 'UNDER_INVESTIGATION';
    if (!transfer.investigationStartedAt) {
      transfer.investigationStartedAt = now;
    }

    // Ensure destination collector has a SampleCollection record
    let collection = await SampleCollection.findOne({ patient: transfer.patient._id });
    if (!collection) {
      try {
        collection = await SampleCollection.create({
          patient: transfer.patient._id,
          collector: req.user.id,
          branchName: transfer.destinationBranch,
          status: 'In Progress',
          startedAt: now
        });
      } catch (_) {
        collection = await SampleCollection.findOne({ patient: transfer.patient._id });
      }
    }

    // Find or create draft LabReport at destination branch for this transferred test
    let report = await LabReport.findOne({
      patient: transfer.patient._id,
      $or: [
        { transfer: transfer._id },
        { status: { $in: ['Draft', 'Rejected'] }, branchName: transfer.destinationBranch }
      ]
    });

    if (!report) {
      report = await LabReport.create({
        patient: transfer.patient._id,
        collection: collection._id,
        laboratoryTests: [transfer.laboratoryTest],
        technician: req.user.id,
        submittedBy: req.user.id,
        branchName: transfer.destinationBranch,
        originalBranch: transfer.sourceBranch,
        performingBranch: transfer.destinationBranch,
        isCrossBranchTransfer: true,
        transfer: transfer._id,
        equipment: [],
        results: [],
        comments: transfer.notes ? `Transferred from ${transfer.sourceBranch}: ${transfer.notes}` : `Transferred from ${transfer.sourceBranch}`,
        status: 'Draft',
        approvalStatus: 'Draft'
      });
    } else {
      report.collection = collection._id;
      report.isCrossBranchTransfer = true;
      report.originalBranch = transfer.sourceBranch;
      report.performingBranch = transfer.destinationBranch;
      report.transfer = transfer._id;
      report.laboratoryTests = [transfer.laboratoryTest];
      await report.save();
    }

    transfer.labReport = report._id;
    transfer.transferHistory.push({
      status: 'UNDER_INVESTIGATION',
      action: `Investigation started by ${req.user.fullName || req.user.username} at ${transfer.destinationBranch}`,
      performedBy: req.user.id,
      timestamp: now
    });

    await transfer.save();
    emit('transfers:change', { action: 'investigation_started', transferId: transfer._id });

    const populatedTransfer = await SampleTransfer.findById(transfer._id)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address branchName paymentStatus systolicBP diastolicBP referralHospital registrationDate'
      })
      .populate({
        path: 'laboratoryTest',
        select: 'name category subcategory price',
        populate: { path: 'category', select: 'name' }
      });

    res.json({ success: true, transfer: populatedTransfer, report });
  } catch (err) {
    next(err);
  }
}

export async function cancelTransfer(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;

    if (!isAdmin && transfer.sourceBranch !== userBranch) {
      throw new AppError('Only the sending branch can cancel this transfer.', 403);
    }

    if (transfer.status !== 'PENDING_TRANSFER') {
      throw new AppError(`Cannot cancel transfer in ${transfer.status} status.`, 422);
    }

    const now = new Date();
    transfer.status = 'CANCELLED';
    transfer.transferHistory.push({
      status: 'CANCELLED',
      action: `Transfer cancelled by ${req.user.fullName || req.user.username}`,
      performedBy: req.user.id,
      timestamp: now,
      notes: req.body.reason || ''
    });

    await transfer.save();
    emit('transfers:change', { action: 'cancelled', transferId: transfer._id });
    emit('collection:change', { action: 'transfer_cancelled' });

    res.json({ success: true, message: 'Transfer cancelled successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getTransferAudit(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address branchName paymentStatus referralHospital registrationDate'
      })
      .populate({
        path: 'laboratoryTest',
        select: 'name category subcategory',
        populate: { path: 'category', select: 'name' }
      })
      .populate('sentBy', 'fullName username role')
      .populate('receivedBy', 'fullName username role')
      .populate('approvedBy', 'fullName username role')
      .populate('transferHistory.performedBy', 'fullName username role')
      .populate('labReport');

    if (!transfer) throw new AppError('Transfer not found.', 404);

    res.json({ success: true, transfer, auditHistory: transfer.transferHistory });
  } catch (err) {
    next(err);
  }
}

export async function mergeResultsIntoOriginReport(transfer, resultsToMerge, reportDoc, user) {
  const patientDoc = await Patient.findById(transfer.patient);
  if (!patientDoc) throw new AppError('Transferred patient not found.', 404);

  let sourceReport = await LabReport.findOne({
    patient: transfer.patient,
    branchName: transfer.sourceBranch,
    status: { $in: ['Draft', 'Rejected', 'Submitted', 'Pending'] }
  });

  if (!sourceReport) {
    let sourceCol = await SampleCollection.findOne({ patient: transfer.patient });
    if (!sourceCol) {
      try {
        sourceCol = await SampleCollection.create({
          patient: transfer.patient,
          collector: transfer.sentBy,
          branchName: transfer.sourceBranch,
          status: 'In Progress',
          startedAt: new Date()
        });
      } catch (_) {
        sourceCol = await SampleCollection.findOne({ patient: transfer.patient });
      }
    } else if (sourceCol.status === 'Completed') {
      sourceCol.status = 'In Progress';
      await sourceCol.save();
    }

    sourceReport = await LabReport.create({
      patient: transfer.patient,
      collection: sourceCol?._id || undefined,
      laboratoryTests: patientDoc.laboratoryTests || [],
      technician: transfer.sentBy,
      submittedBy: transfer.sentBy,
      branchName: transfer.sourceBranch,
      equipment: [],
      results: [],
      comments: '',
      status: 'Draft',
      approvalStatus: 'Draft'
    });
  }

  const mergedResults = Array.isArray(sourceReport.results) ? [...sourceReport.results] : [];

  for (const item of (resultsToMerge || [])) {
    const sName = (item.sampleName || '').trim();
    if (!sName) continue;

    const enriched = {
      sampleName: sName,
      result: item.result,
      unit: item.unit || '',
      referenceValue: item.referenceValue || '',
      flag: item.flag || '',
      remarks: item.remarks || '',
      category: item.category || transfer.testCategory || '',
      subcategory: item.subcategory || '',
      isTransferred: true,
      transferredFrom: transfer.sourceBranch,
      performedAt: transfer.destinationBranch,
      transferId: transfer.transferId,
      testId: transfer.laboratoryTest
    };

    const existingIdx = mergedResults.findIndex(r =>
      (r.sampleName || '').trim().toUpperCase() === sName.toUpperCase()
    );

    if (existingIdx !== -1) {
      mergedResults[existingIdx] = {
        ...mergedResults[existingIdx],
        ...enriched
      };
    } else {
      mergedResults.push(enriched);
    }
  }

  sourceReport.results = mergedResults;

  if (reportDoc && Array.isArray(reportDoc.testInterpretations) && reportDoc.testInterpretations.length) {
    const existingInterps = Array.isArray(sourceReport.testInterpretations) ? [...sourceReport.testInterpretations] : [];
    reportDoc.testInterpretations.forEach(ti => {
      const match = existingInterps.find(x => x.testName?.toUpperCase() === ti.testName?.toUpperCase());
      if (!match) existingInterps.push(ti);
    });
    sourceReport.testInterpretations = existingInterps;
  }

  if (reportDoc && Array.isArray(reportDoc.sampleCollectorComments) && reportDoc.sampleCollectorComments.length) {
    const existingComments = Array.isArray(sourceReport.sampleCollectorComments) ? [...sourceReport.sampleCollectorComments] : [];
    reportDoc.sampleCollectorComments.forEach(sc => {
      const match = existingComments.find(x => x.mainCategory?.toUpperCase() === sc.mainCategory?.toUpperCase());
      if (!match) existingComments.push(sc);
    });
    sourceReport.sampleCollectorComments = existingComments;
  }

  await sourceReport.save();
  return sourceReport;
}

export async function sendResultDirect(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;
    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch staff can return this result.`, 403);
    }

    if (transfer.status === 'COMPLETED') {
      throw new AppError('This transfer has already been returned to requested branch.', 422);
    }
    if (transfer.status === 'CANCELLED') {
      throw new AppError('Cannot return results for a cancelled transfer.', 422);
    }
    if (transfer.status === 'RESULT_READY') {
      throw new AppError('This result was sent for approval. It cannot be directly returned while waiting for approval.', 422);
    }

    let destReport = transfer.labReport ? await LabReport.findById(transfer.labReport) : null;
    if (!destReport) {
      destReport = await LabReport.findOne({
        patient: transfer.patient,
        branchName: transfer.destinationBranch,
        status: { $in: ['Draft', 'Rejected', 'Submitted'] }
      });
    }

    let resultsToMerge = [];
    if (Array.isArray(req.body.results) && req.body.results.length) {
      resultsToMerge = req.body.results;
      if (destReport) {
        destReport.results = resultsToMerge;
        await destReport.save();
      }
    } else if (destReport && Array.isArray(destReport.results) && destReport.results.length) {
      resultsToMerge = destReport.results;
    }

    const cleanResults = resultsToMerge.filter(r => r && r.sampleName && String(r.sampleName).trim() && r.result !== undefined && r.result !== null && String(r.result).trim() !== '');
    if (!cleanResults.length) {
      throw new AppError('Please enter at least one test result before sending directly to requested branch.', 422);
    }

    await mergeResultsIntoOriginReport(transfer, cleanResults, destReport, req.user);

    if (destReport) {
      destReport.status = 'Approved';
      destReport.approvalStatus = 'Approved';
      await destReport.save();
    }

    const now = new Date();
    transfer.status = 'COMPLETED';
    transfer.completedAt = now;
    transfer.returnMethod = 'DIRECT';
    transfer.transferHistory.push({
      status: 'COMPLETED',
      action: `Result returned directly to ${transfer.sourceBranch} without approval by ${req.user.fullName || req.user.username}`,
      performedBy: req.user.id,
      timestamp: now,
      notes: req.body.notes || ''
    });

    await transfer.save();

    const sourceUsers = await User.find({
      branchName: transfer.sourceBranch,
      role: { $in: ['Sample Collector', 'Reception', 'Admin'] },
      status: 'Active'
    }).select('_id');

    if (sourceUsers.length) {
      await Notification.insertMany(sourceUsers.map(u => ({
        recipient: u._id,
        type: 'New Approved Report',
        message: `Direct result returned from ${transfer.destinationBranch} for ${transfer.testName}. Result merged into patient order.`,
        entity: transfer._id,
        entityType: 'SampleTransfer'
      })));
    }

    emit('transfers:change', { action: 'completed', transferId: transfer._id, sourceBranch: transfer.sourceBranch });
    emit('collection:change', { action: 'transferred_result_merged', patientId: transfer.patient });
    emit('reports:change', { action: 'draft_updated' });

    res.json({
      success: true,
      message: `Result successfully returned directly to ${transfer.sourceBranch}.`,
      transfer
    });
  } catch (err) {
    next(err);
  }
}

export async function sendResultBack(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;
    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch staff can send this result back.`, 403);
    }

    if (transfer.status === 'COMPLETED') {
      throw new AppError('This transfer result has already been returned to requested branch.', 422);
    }
    if (!['READY_TO_RETURN', 'APPROVED'].includes(transfer.status)) {
      throw new AppError(`Cannot send back transfer in ${transfer.status} status. It must be approved first.`, 422);
    }

    let destReport = transfer.labReport ? await LabReport.findById(transfer.labReport) : null;
    if (!destReport) {
      destReport = await LabReport.findOne({
        patient: transfer.patient,
        branchName: transfer.destinationBranch,
        status: { $in: ['Approved', 'Submitted'] }
      });
    }

    const cleanResults = (destReport?.results || []).filter(r => r && r.sampleName && String(r.sampleName).trim() && r.result !== undefined && r.result !== null && String(r.result).trim() !== '');
    if (!cleanResults.length) {
      throw new AppError('No approved results found on this report to return.', 422);
    }

    await mergeResultsIntoOriginReport(transfer, cleanResults, destReport, req.user);

    const now = new Date();
    transfer.status = 'COMPLETED';
    transfer.completedAt = now;
    transfer.returnMethod = 'APPROVAL';
    transfer.transferHistory.push({
      status: 'COMPLETED',
      action: `Approved result sent back to ${transfer.sourceBranch} by ${req.user.fullName || req.user.username}`,
      performedBy: req.user.id,
      timestamp: now,
      notes: req.body.notes || ''
    });

    await transfer.save();

    const sourceUsers = await User.find({
      branchName: transfer.sourceBranch,
      role: { $in: ['Sample Collector', 'Reception', 'Admin'] },
      status: 'Active'
    }).select('_id');

    if (sourceUsers.length) {
      await Notification.insertMany(sourceUsers.map(u => ({
        recipient: u._id,
        type: 'New Approved Report',
        message: `Approved result returned from ${transfer.destinationBranch} for ${transfer.testName}. Result merged into patient order.`,
        entity: transfer._id,
        entityType: 'SampleTransfer'
      })));
    }

    emit('transfers:change', { action: 'completed', transferId: transfer._id, sourceBranch: transfer.sourceBranch });
    emit('collection:change', { action: 'transferred_result_merged', patientId: transfer.patient });
    emit('reports:change', { action: 'draft_updated' });

    res.json({
      success: true,
      message: `Approved result sent back to ${transfer.sourceBranch}.`,
      transfer
    });
  } catch (err) {
    next(err);
  }
}

export async function clearTransfer(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;
    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch staff can clear this transfer.`, 403);
    }

    if (transfer.isCleared) {
      throw new AppError('This transfer is already cleared.', 422);
    }

    const now = new Date();
    transfer.isCleared = true;
    transfer.clearedAt = now;
    transfer.clearedBy = req.user.id;
    transfer.clearedReason = req.body.reason || 'Cleared from active Received list';
    transfer.transferHistory.push({
      status: 'CLEARED',
      action: `Cleared from active Received list by ${req.user.fullName || req.user.username}. Preserved in Report Management.`,
      performedBy: req.user.id,
      timestamp: now,
      notes: req.body.reason || ''
    });

    await transfer.save();
    emit('transfers:change', { action: 'cleared', transferId: transfer._id });

    res.json({
      success: true,
      message: 'Transfer cleared from active Received list and preserved in Report Management.',
      transfer
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreTransfer(req, res, next) {
  try {
    const transfer = await SampleTransfer.findById(req.params.id);
    if (!transfer) throw new AppError('Transfer not found.', 404);

    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;
    if (!isAdmin && transfer.destinationBranch !== userBranch) {
      throw new AppError(`Only ${transfer.destinationBranch} branch staff can restore this transfer.`, 403);
    }

    if (!transfer.isCleared) {
      throw new AppError('This transfer is not cleared.', 422);
    }

    const now = new Date();
    transfer.isCleared = false;
    transfer.clearedAt = null;
    transfer.clearedBy = null;
    transfer.clearedReason = '';
    transfer.transferHistory.push({
      status: 'RESTORED',
      action: `Restored back to active Received list by ${req.user.fullName || req.user.username}`,
      performedBy: req.user.id,
      timestamp: now
    });

    await transfer.save();
    emit('transfers:change', { action: 'restored', transferId: transfer._id });

    res.json({
      success: true,
      message: 'Transfer successfully restored to active Received list.',
      transfer
    });
  } catch (err) {
    next(err);
  }
}

export async function getClearedTransfers(req, res, next) {
  try {
    const userBranch = req.user.branchName || 'Main';
    const isAdmin = req.user.role === 'Admin' || req.user.isCEO;
    const filter = { isCleared: true };

    if (!isAdmin) {
      filter.destinationBranch = userBranch;
    } else if (req.query.branchName && req.query.branchName !== 'All') {
      filter.destinationBranch = req.query.branchName;
    }

    const transfers = await SampleTransfer.find(filter)
      .populate({
        path: 'patient',
        select: 'patientId barcode name age sex phone address branchName paymentStatus referralHospital registrationDate'
      })
      .populate({
        path: 'laboratoryTest',
        select: 'name category subcategory',
        populate: { path: 'category', select: 'name' }
      })
      .populate('sentBy', 'fullName username')
      .populate('clearedBy', 'fullName username')
      .populate({
        path: 'labReport',
        select: 'status results technician approvedBy'
      })
      .sort({ clearedAt: -1 })
      .lean();

    res.json({ success: true, count: transfers.length, transfers });
  } catch (err) {
    next(err);
  }
}
