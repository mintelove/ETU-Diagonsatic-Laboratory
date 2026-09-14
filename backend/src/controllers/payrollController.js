import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import Employee from '../models/Employee.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import Payroll from '../models/Payroll.js';
import PayrollSettings from '../models/PayrollSettings.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';
import {
  calculateNextSalaryDate,
  getCurrentSalaryPeriod,
  gregorianToEthiopian,
  formatEthiopianDate,
  formatGregorianDate
} from '../utils/ethiopianCalendar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find available company logo
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
  return null;
};

// Generate next human-readable sequential code
async function generateEmployeeId() {
  const counter = await Counter.findByIdAndUpdate(
    'employeeId',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `ETU-EMP-${String(counter.sequence).padStart(4, '0')}`;
}

async function generatePayrollId() {
  const counter = await Counter.findByIdAndUpdate(
    'payrollId',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `PAY-${String(counter.sequence).padStart(5, '0')}`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

let migrationChecked = false;
export async function ensurePayrollMigration() {
  if (migrationChecked) return;
  try {
    const missingRecords = await Payroll.find({ periodKey: { $exists: false } }).limit(500);
    for (const rec of missingRecords) {
      const d = rec.salaryDate || rec.createdAt || new Date();
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const pKey = `${yr}-${String(mo).padStart(2, '0')}`;
      await Payroll.updateOne(
        { _id: rec._id },
        {
          $set: {
            periodKey: pKey,
            payrollYear: yr,
            payrollMonth: mo
          }
        }
      );
    }
    migrationChecked = true;
  } catch (err) {
    console.warn('Payroll migration warning:', err.message);
  }
}

// Get or initialize singleton payroll settings
async function getOrInitSettings() {
  await ensurePayrollMigration();
  let settings = await PayrollSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await PayrollSettings.create({
      key: 'default',
      calendarType: 'Ethiopian',
      salaryDay: 30,
      salaryFrequency: 'Monthly',
      currency: 'ETB'
    });
  }
  return settings;
}

// Map User system roles to payroll job types
function mapRoleToJobType(role) {
  switch (role) {
    case ROLES.RECEPTION:
      return { jobType: 'Reception', customJobType: '' };
    case ROLES.SAMPLE_COLLECTOR:
      return { jobType: 'Sample Collector', customJobType: '' };
    case ROLES.APPROVER:
      return { jobType: 'Approver', customJobType: '' };
    case ROLES.ADMIN:
    case ROLES.SUB_ADMIN:
      return { jobType: 'Supervisor', customJobType: '' };
    case ROLES.PATHOLOGIST:
      return { jobType: 'Other', customJobType: 'Pathologist' };
    case ROLES.RADIOLOGIST:
      return { jobType: 'Other', customJobType: 'Radiologist' };
    default:
      return { jobType: 'Other', customJobType: role || 'Staff' };
  }
}

// ==========================================
// 1. DASHBOARD OVERVIEW & STATS
// ==========================================
export async function getPayrollDashboard(req, res, next) {
  try {
    const settings = await getOrInitSettings();
    const nextDateInfo = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay,
      fromDate: new Date()
    });

    const branchFilter = req.query.branch && req.query.branch !== 'All' ? { branch: req.query.branch } : {};

    const [totalEmployees, activeEmployees, allActiveEmpList, activeAdvances] = await Promise.all([
      Employee.countDocuments(branchFilter),
      Employee.countDocuments({ ...branchFilter, employmentStatus: 'Active' }),
      Employee.find({ ...branchFilter, employmentStatus: 'Active' }).select('salary branch'),
      SalaryAdvance.find({ status: 'Approved' }).populate('employee', 'branch')
    ]);

    // Sum active salaries
    const totalMonthlyPayroll = allActiveEmpList.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

    // Sum active advances (filtered by branch if specified)
    const filteredAdvances = branchFilter.branch
      ? activeAdvances.filter(a => a.employee?.branch === branchFilter.branch)
      : activeAdvances;
    const totalAdvancesAmount = filteredAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const currentNetPayroll = Math.max(0, totalMonthlyPayroll - totalAdvancesAmount);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalMonthlyPayroll,
        totalAdvancesAmount,
        activeAdvancesCount: filteredAdvances.length,
        currentNetPayroll,
        nextDateInfo,
        settings: {
          calendarType: settings.calendarType,
          salaryDay: settings.salaryDay,
          salaryFrequency: settings.salaryFrequency,
          currency: settings.currency
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. EMPLOYEE MANAGEMENT (CRUD)
// ==========================================
export async function getEmployees(req, res, next) {
  try {
    const { branch, jobType, status, search } = req.query;
    const filter = {};

    if (branch && branch !== 'All') filter.branch = branch;
    if (jobType && jobType !== 'All') filter.jobType = jobType;
    if (status && status !== 'All') filter.employmentStatus = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { customJobType: { $regex: q, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter)
      .populate('userId', 'username role status branchName')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch active advances for all returned employees in one query
    const employeeIds = employees.map(e => e._id);
    const approvedAdvances = await SalaryAdvance.find({
      employee: { $in: employeeIds },
      status: 'Approved'
    }).lean();

    const advancesByEmpId = {};
    for (const adv of approvedAdvances) {
      const idStr = adv.employee.toString();
      advancesByEmpId[idStr] = (advancesByEmpId[idStr] || 0) + (Number(adv.amount) || 0);
    }

    const enrichedEmployees = employees.map(emp => {
      const activeAdvances = advancesByEmpId[emp._id.toString()] || 0;
      const basicSalary = Number(emp.salary) || 0;
      const netPayable = Math.max(0, basicSalary - activeAdvances);
      return {
        ...emp,
        activeAdvances,
        netPayable
      };
    });

    res.json({
      success: true,
      count: enrichedEmployees.length,
      data: enrichedEmployees
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeById(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('userId', 'username role email status branchName')
      .populate('salaryHistory.changedBy', 'fullName username')
      .lean();

    if (!employee) {
      throw new AppError('Employee not found.', 404);
    }

    // Fetch advance history
    const advances = await SalaryAdvance.find({ employee: employee._id })
      .populate('recordedBy', 'fullName username')
      .sort({ date: -1 })
      .lean();

    // Fetch past finalized payroll records
    const payrollHistory = await Payroll.find({ employee: employee._id })
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const activeAdvances = advances
      .filter(a => a.status === 'Approved')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const netPayable = Math.max(0, (Number(employee.salary) || 0) - activeAdvances);

    res.json({
      success: true,
      data: {
        ...employee,
        activeAdvances,
        netPayable,
        advances,
        payrollHistory
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const {
      fullName,
      age,
      phone,
      jobType,
      customJobType,
      branch,
      recruitmentDate,
      salary,
      salaryCurrency,
      salaryFrequency,
      employmentStatus,
      userId,
      notes
    } = req.body;

    if (!fullName || !fullName.trim()) throw new AppError('Full name is required.', 400);
    if (!age || Number(age) < 16) throw new AppError('A valid age (16+) is required.', 400);
    if (!phone || !phone.trim()) throw new AppError('Phone number is required.', 400);
    if (!jobType) throw new AppError('Job type is required.', 400);

    if (jobType === 'Other' && (!customJobType || !customJobType.trim())) {
      throw new AppError('Please specify the custom job type.', 400);
    }

    const basicSalary = Number(salary) >= 0 ? Number(salary) : 0;
    const employeeId = await generateEmployeeId();

    const initialHistory = [{
      salary: basicSalary,
      effectiveDate: recruitmentDate ? new Date(recruitmentDate) : new Date(),
      reason: 'Initial salary on hiring/setup',
      changedBy: req.user._id,
      createdAt: new Date()
    }];

    const employee = await Employee.create({
      employeeId,
      userId: userId || null,
      fullName: fullName.trim(),
      age: Number(age),
      phone: phone.trim(),
      jobType,
      customJobType: jobType === 'Other' ? (customJobType || '').trim() : '',
      branch: branch || 'Main',
      recruitmentDate: recruitmentDate ? new Date(recruitmentDate) : new Date(),
      salary: basicSalary,
      salaryCurrency: salaryCurrency || 'ETB',
      salaryFrequency: salaryFrequency || 'Monthly',
      employmentStatus: employmentStatus || 'Active',
      notes: (notes || '').trim(),
      salaryHistory: initialHistory
    });

    res.status(201).json({
      success: true,
      message: `Employee ${employee.fullName} (${employee.employeeId}) created successfully.`,
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found.', 404);

    const {
      fullName,
      age,
      phone,
      jobType,
      customJobType,
      branch,
      recruitmentDate,
      salary,
      salaryCurrency,
      salaryFrequency,
      employmentStatus,
      userId,
      notes,
      salaryChangeReason
    } = req.body;

    if (fullName) employee.fullName = fullName.trim();
    if (age) employee.age = Number(age);
    if (phone) employee.phone = phone.trim();
    if (branch) employee.branch = branch;
    if (recruitmentDate) employee.recruitmentDate = new Date(recruitmentDate);
    if (employmentStatus) employee.employmentStatus = employmentStatus;
    if (userId !== undefined) employee.userId = userId || null;
    if (notes !== undefined) employee.notes = notes.trim();
    if (salaryCurrency) employee.salaryCurrency = salaryCurrency;
    if (salaryFrequency) employee.salaryFrequency = salaryFrequency;

    if (jobType) {
      if (jobType === 'Other' && (!customJobType || !customJobType.trim())) {
        throw new AppError('Please specify the custom job type.', 400);
      }
      employee.jobType = jobType;
      employee.customJobType = jobType === 'Other' ? (customJobType || '').trim() : '';
    }

    // Salary change handling — preserves historical salary records
    if (salary !== undefined && Number(salary) >= 0) {
      const newSalary = Number(salary);
      if (newSalary !== employee.salary) {
        employee.salaryHistory.push({
          salary: newSalary,
          effectiveDate: new Date(),
          reason: (salaryChangeReason || 'Salary update').trim(),
          changedBy: req.user._id,
          createdAt: new Date()
        });
        employee.salary = newSalary;
      }
    }

    await employee.save();

    res.json({
      success: true,
      message: `Employee ${employee.fullName} updated successfully.`,
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmployee(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found.', 404);

    // Check if employee has finalized payroll records or advances
    const [hasPayroll, hasAdvances] = await Promise.all([
      Payroll.exists({ employee: employee._id }),
      SalaryAdvance.exists({ employee: employee._id })
    ]);

    if (hasPayroll || hasAdvances) {
      // Safe archival / termination: preserve historical payroll audit trail
      employee.employmentStatus = 'Terminated';
      employee.notes = `${employee.notes ? employee.notes + ' | ' : ''}Deactivated on ${new Date().toISOString().slice(0, 10)} by ${req.user.username}`;
      await employee.save();

      return res.json({
        success: true,
        archived: true,
        message: `Employee has historical records. Status changed to 'Terminated' to preserve audit history.`
      });
    }

    await Employee.findByIdAndDelete(employee._id);
    res.json({
      success: true,
      archived: false,
      message: 'Employee deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. SAFE USER ACCOUNTS SYNCHRONIZATION
// ==========================================
export async function syncUserAccounts(req, res, next) {
  try {
    const [users, existingEmployees] = await Promise.all([
      User.find({}).lean(),
      Employee.find({}).lean()
    ]);

    const existingUserIds = new Set();
    const existingNames = new Set();
    for (const emp of existingEmployees) {
      if (emp.userId) existingUserIds.add(emp.userId.toString());
      if (emp.fullName) existingNames.add(emp.fullName.toLowerCase().trim());
    }

    const toCreate = [];
    let existingCount = 0;

    for (const u of users) {
      const uId = u._id.toString();
      const uName = (u.fullName || '').toLowerCase().trim();
      if (existingUserIds.has(uId) || existingNames.has(uName)) {
        existingCount++;
        continue;
      }
      toCreate.push(u);
    }

    let createdCount = 0;
    if (toCreate.length > 0) {
      const counter = await Counter.findByIdAndUpdate(
        'employeeId',
        { $inc: { sequence: toCreate.length } },
        { new: true, upsert: true }
      );
      const startSeq = counter.sequence - toCreate.length + 1;

      const newEmployees = toCreate.map((u, idx) => {
        const seq = startSeq + idx;
        const employeeId = `ETU-EMP-${String(seq).padStart(4, '0')}`;
        const { jobType, customJobType } = mapRoleToJobType(u.role);
        const branch = u.branchName === 'Otona' ? 'Otona' : 'Main';

        return {
          employeeId,
          userId: u._id,
          fullName: u.fullName,
          age: 30,
          phone: u.phone || '0900000000',
          jobType,
          customJobType,
          branch,
          recruitmentDate: u.createdDate || new Date(),
          salary: 0,
          salaryCurrency: 'ETB',
          salaryFrequency: 'Monthly',
          employmentStatus: u.status === 'Active' ? 'Active' : 'Inactive',
          notes: `Imported from system user account: ${u.username}`,
          salaryHistory: [{
            salary: 0,
            effectiveDate: u.createdDate || new Date(),
            reason: 'Initial synchronization from system user account',
            changedBy: req.user._id,
            createdAt: new Date()
          }]
        };
      });

      await Employee.insertMany(newEmployees);
      createdCount = newEmployees.length;
    }

    res.json({
      success: true,
      message: `Sync complete. ${createdCount} new employees imported, ${existingCount} already existed.`,
      data: { createdCount, existingCount, totalUsers: users.length }
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. SALARY ADVANCES (PRE-SALARY PAYMENTS)
// ==========================================
export async function getAdvances(req, res, next) {
  try {
    const { employeeId, status, branch, period } = req.query;
    const filter = {};

    if (employeeId) filter.employee = employeeId;
    if (status && status !== 'All') filter.status = status;
    if (period) filter.salaryPeriod = period;

    const advances = await SalaryAdvance.find(filter)
      .populate('employee', 'fullName employeeId jobType branch salary phone')
      .populate('recordedBy', 'fullName username')
      .sort({ date: -1 })
      .lean();

    const filtered = branch && branch !== 'All'
      ? advances.filter(a => a.employee?.branch === branch)
      : advances;

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdvance(req, res, next) {
  try {
    const { employeeId, amount, date, reason, paymentMethod, notes } = req.body;

    if (!employeeId) throw new AppError('Employee ID is required.', 400);
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new AppError('Advance amount must be greater than zero.', 400);
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new AppError('Employee not found.', 404);

    const settings = await getOrInitSettings();
    const period = getCurrentSalaryPeriod(settings.calendarType, date ? new Date(date) : new Date());

    const advance = await SalaryAdvance.create({
      employee: employee._id,
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      reason: (reason || 'Salary advance').trim(),
      paymentMethod: paymentMethod || 'Cash',
      status: 'Approved',
      salaryPeriod: period,
      recordedBy: req.user._id,
      notes: (notes || '').trim()
    });

    const populated = await SalaryAdvance.findById(advance._id)
      .populate('employee', 'fullName employeeId jobType branch salary')
      .populate('recordedBy', 'fullName username');

    res.status(201).json({
      success: true,
      message: `Advance of ${numAmount} ETB recorded for ${employee.fullName}.`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdvance(req, res, next) {
  try {
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) throw new AppError('Advance record not found.', 404);

    if (advance.status === 'Deducted') {
      throw new AppError('Cannot modify an advance that has already been deducted in a finalized payroll run.', 400);
    }

    const { amount, date, reason, paymentMethod, notes, status } = req.body;

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (numAmount <= 0) throw new AppError('Amount must be greater than zero.', 400);
      advance.amount = numAmount;
    }
    if (date) advance.date = new Date(date);
    if (reason !== undefined) advance.reason = reason.trim();
    if (paymentMethod) advance.paymentMethod = paymentMethod;
    if (notes !== undefined) advance.notes = notes.trim();
    if (status && ['Approved', 'Cancelled'].includes(status)) {
      advance.status = status;
    }

    await advance.save();

    const populated = await SalaryAdvance.findById(advance._id)
      .populate('employee', 'fullName employeeId jobType branch salary')
      .populate('recordedBy', 'fullName username');

    res.json({
      success: true,
      message: 'Advance record updated successfully.',
      data: populated
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAdvance(req, res, next) {
  try {
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) throw new AppError('Advance record not found.', 404);

    if (advance.status === 'Deducted') {
      throw new AppError('Cannot cancel an advance already finalized in payroll.', 400);
    }

    advance.status = 'Cancelled';
    advance.notes = `${advance.notes ? advance.notes + ' | ' : ''}Cancelled on ${new Date().toISOString().slice(0, 10)} by ${req.user.username}`;
    await advance.save();

    res.json({
      success: true,
      message: 'Advance record cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. PAYROLL PROCESSING & HISTORY
// ==========================================
export async function getPayrollRecords(req, res, next) {
  try {
    const { period, branch, status, search } = req.query;
    const filter = {};

    if (period && period !== 'All') filter.salaryPeriod = period;
    if (branch && branch !== 'All') filter.branch = branch;
    if (status && status !== 'All') filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { employeeName: { $regex: q, $options: 'i' } },
        { employeeCode: { $regex: q, $options: 'i' } },
        { payrollId: { $regex: q, $options: 'i' } }
      ];
    }

    const records = await Payroll.find(filter)
      .populate('employee', 'fullName employeeId phone branch jobType')
      .populate('processedBy', 'fullName username')
      .sort({ createdAt: -1 })
      .lean();

    // Distinct periods for filter dropdown
    const periods = await Payroll.distinct('salaryPeriod');

    res.json({
      success: true,
      count: records.length,
      periods,
      data: records
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. PAYROLL PREVIEW, BATCH PROCESSING & ANNUAL MATRIX
// ==========================================

export async function getPayrollPreview(req, res, next) {
  try {
    await ensurePayrollMigration();
    const { year, month, branch, employeeIds } = req.query;

    const now = new Date();
    const yr = Number(year) || now.getFullYear();
    const mo = Number(month) || (now.getMonth() + 1);
    if (mo < 1 || mo > 12) throw new AppError('Invalid month (must be between 1 and 12).', 400);

    const periodKey = `${yr}-${String(mo).padStart(2, '0')}`;
    const periodLabel = `${MONTH_NAMES[mo - 1]} ${yr}`;

    const empFilter = { employmentStatus: 'Active' };
    if (branch && branch !== 'All') empFilter.branch = branch;

    if (employeeIds) {
      const ids = Array.isArray(employeeIds)
        ? employeeIds
        : String(employeeIds).split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) empFilter._id = { $in: ids };
    }

    const employees = await Employee.find(empFilter).sort({ fullName: 1 }).lean();

    // Check existing payroll records for this period
    const existingPayrolls = await Payroll.find({
      periodKey,
      status: { $ne: 'Cancelled' }
    }).lean();

    const existingByEmp = {};
    existingPayrolls.forEach(p => {
      existingByEmp[p.employee.toString()] = p;
    });

    // Bulk fetch active advances
    const activeAdvances = await SalaryAdvance.find({
      employee: { $in: employees.map(e => e._id) },
      status: 'Approved'
    }).lean();

    const advancesByEmp = {};
    activeAdvances.forEach(a => {
      const eId = a.employee.toString();
      if (!advancesByEmp[eId]) advancesByEmp[eId] = [];
      advancesByEmp[eId].push(a);
    });

    let totalEligibleEmployees = employees.length;
    let readyCount = 0;
    let alreadyPaidCount = 0;
    let totalBasicSalary = 0;
    let totalAdvances = 0;
    let totalNetPayroll = 0;

    const previewList = employees.map(emp => {
      const empIdStr = emp._id.toString();
      const existing = existingByEmp[empIdStr];
      const isAlreadyPaid = Boolean(existing);

      const empAdvances = advancesByEmp[empIdStr] || [];
      const empAdvanceSum = empAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const basic = Number(emp.salary) || 0;
      const net = Math.max(0, basic - empAdvanceSum);

      if (isAlreadyPaid) {
        alreadyPaidCount++;
      } else {
        readyCount++;
        totalBasicSalary += basic;
        totalAdvances += empAdvanceSum;
        totalNetPayroll += net;
      }

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        jobType: emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType,
        branch: emp.branch,
        basicSalary: basic,
        advanceAmount: empAdvanceSum,
        advancesCount: empAdvances.length,
        netSalary: net,
        status: isAlreadyPaid ? 'ALREADY_PAID' : 'READY',
        isAlreadyPaid,
        existingPayrollId: existing ? existing.payrollId : null,
        existingStatus: existing ? existing.status : null
      };
    });

    res.json({
      success: true,
      data: {
        periodKey,
        periodLabel,
        year: yr,
        month: mo,
        totals: {
          totalEligibleEmployees,
          readyCount,
          alreadyPaidCount,
          totalBasicSalary,
          totalAdvances,
          totalNetPayroll
        },
        employees: previewList
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function processPayroll(req, res, next) {
  try {
    await ensurePayrollMigration();
    const {
      payrollYear,
      payrollMonth,
      paymentScope = 'ALL', // 'ALL' or 'SELECTED'
      employeeIds,
      salaryDate,
      calendarType,
      branch,
      paymentMethod = 'Cash',
      notes = ''
    } = req.body;

    const settings = await getOrInitSettings();
    const now = new Date();
    const yr = Number(payrollYear) || now.getFullYear();
    const mo = Number(payrollMonth) || (now.getMonth() + 1);
    if (mo < 1 || mo > 12) throw new AppError('Invalid month (must be between 1 and 12).', 400);

    const periodKey = `${yr}-${String(mo).padStart(2, '0')}`;
    const effectivePeriod = `${MONTH_NAMES[mo - 1]} ${yr}`;
    const effectiveCalendarType = calendarType || settings.calendarType;
    const effectiveSalaryDate = salaryDate ? new Date(salaryDate) : new Date();

    const empFilter = { employmentStatus: 'Active' };
    if (branch && branch !== 'All') empFilter.branch = branch;

    if (paymentScope === 'SELECTED' && Array.isArray(employeeIds) && employeeIds.length > 0) {
      empFilter._id = { $in: employeeIds };
    }

    const candidateEmployees = await Employee.find(empFilter);
    if (candidateEmployees.length === 0) {
      throw new AppError('No eligible active employees found for the selected criteria.', 400);
    }

    // Check which employees already have an active/processed payroll record for this periodKey
    const existingRecords = await Payroll.find({
      periodKey,
      employee: { $in: candidateEmployees.map(e => e._id) },
      status: { $ne: 'Cancelled' }
    }).select('employee employeeName payrollId');

    const alreadyPaidSet = new Set(existingRecords.map(r => r.employee.toString()));
    const alreadyPaidNames = existingRecords.map(r => r.employeeName);

    const toProcess = candidateEmployees.filter(e => !alreadyPaidSet.has(e._id.toString()));

    if (toProcess.length === 0) {
      // All candidate employees have already been paid for this period
      const msg = candidateEmployees.length === 1
        ? `${candidateEmployees[0].fullName}'s salary for ${effectivePeriod} has already been paid.`
        : `${effectivePeriod} payroll has already been paid for all selected employees.`;

      return res.status(200).json({
        success: false,
        code: 'ALREADY_PAID',
        message: msg,
        processed: 0,
        alreadyPaid: candidateEmployees.length,
        alreadyPaidEmployees: alreadyPaidNames
      });
    }

    // Bulk fetch approved advances for unpaid employees
    const allApprovedAdvances = await SalaryAdvance.find({
      employee: { $in: toProcess.map(e => e._id) },
      status: 'Approved'
    });

    const advancesByEmp = {};
    for (const adv of allApprovedAdvances) {
      const eId = adv.employee.toString();
      if (!advancesByEmp[eId]) advancesByEmp[eId] = [];
      advancesByEmp[eId].push(adv);
    }

    // Reserve sequential payroll IDs in one atomic increment
    const counter = await Counter.findByIdAndUpdate(
      'payrollId',
      { $inc: { sequence: toProcess.length } },
      { new: true, upsert: true }
    );
    const startSeq = counter.sequence - toProcess.length + 1;

    const payrollDocs = [];
    const advancesToUpdate = [];

    toProcess.forEach((emp, idx) => {
      const activeAdvances = advancesByEmp[emp._id.toString()] || [];
      const totalAdvances = activeAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const basicSalary = Number(emp.salary) || 0;
      const otherDeductions = 0;
      const totalDeductions = totalAdvances + otherDeductions;
      const netSalary = Math.max(0, basicSalary - totalDeductions);

      const seq = startSeq + idx;
      const payrollId = `PAY-${String(seq).padStart(5, '0')}`;

      const advanceSnapshots = activeAdvances.map(a => ({
        advanceId: a._id,
        amount: a.amount,
        date: a.date,
        reason: a.reason
      }));

      payrollDocs.push({
        payrollId,
        employee: emp._id,
        employeeCode: emp.employeeId,
        employeeName: emp.fullName,
        jobType: emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType,
        branch: emp.branch,
        salaryPeriod: effectivePeriod,
        periodKey,
        payrollYear: yr,
        payrollMonth: mo,
        salaryDate: effectiveSalaryDate,
        calendarType: effectiveCalendarType,
        basicSalary,
        totalAdvances,
        advances: advanceSnapshots,
        otherDeductions,
        grossSalary: basicSalary,
        totalDeductions,
        netSalary,
        status: 'Paid',
        paymentMethod: paymentMethod || 'Cash',
        paymentDate: effectiveSalaryDate,
        processedBy: req.user._id,
        paidBy: req.user._id,
        notes: (notes || '').trim()
      });

      if (activeAdvances.length > 0) {
        advancesToUpdate.push(...activeAdvances.map(a => a._id));
      }
    });

    const createdRecords = await Payroll.insertMany(payrollDocs);

    if (advancesToUpdate.length > 0) {
      await SalaryAdvance.updateMany(
        { _id: { $in: advancesToUpdate } },
        {
          $set: {
            status: 'Deducted',
            salaryPeriod: effectivePeriod
          }
        }
      );
    }

    const summaryMessage = alreadyPaidNames.length > 0
      ? `Payroll processed successfully: ${createdRecords.length} employee(s) paid. ${alreadyPaidNames.length} employee(s) were already paid and skipped.`
      : `Payroll processed successfully for ${createdRecords.length} employee(s) (${effectivePeriod}).`;

    res.status(201).json({
      success: true,
      message: summaryMessage,
      processed: createdRecords.length,
      alreadyPaid: alreadyPaidNames.length,
      alreadyPaidEmployees: alreadyPaidNames,
      data: createdRecords
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_PAID',
        message: 'Duplicate payment detected. A payroll record already exists for one or more selected employees for this period.'
      });
    }
    next(error);
  }
}

export async function getAnnualPayrollMatrix(req, res, next) {
  try {
    await ensurePayrollMigration();
    const { year, branch, jobType, search } = req.query;

    const yr = Number(year) || new Date().getFullYear();

    const empFilter = { employmentStatus: { $ne: 'Terminated' } };
    if (branch && branch !== 'All') empFilter.branch = branch;
    if (jobType && jobType !== 'All') empFilter.jobType = jobType;
    if (search && search.trim()) {
      const q = search.trim();
      empFilter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(empFilter).sort({ fullName: 1 }).lean();

    // Fetch all non-cancelled payroll records for this year
    const payrollRecords = await Payroll.find({
      payrollYear: yr,
      status: { $ne: 'Cancelled' }
    }).populate('processedBy', 'fullName username').lean();

    // Index by empId_month
    const recordsMap = {};
    const monthlySummary = {};
    for (let m = 1; m <= 12; m++) {
      monthlySummary[m] = {
        month: m,
        monthName: MONTH_NAMES[m - 1],
        totalPaid: 0,
        totalBasic: 0,
        totalAdvances: 0,
        totalNet: 0
      };
    }

    payrollRecords.forEach(p => {
      const key = `${p.employee.toString()}_${p.payrollMonth}`;
      recordsMap[key] = p;

      const m = p.payrollMonth;
      if (monthlySummary[m]) {
        monthlySummary[m].totalPaid++;
        monthlySummary[m].totalBasic += (Number(p.basicSalary) || 0);
        monthlySummary[m].totalAdvances += (Number(p.totalAdvances) || 0);
        monthlySummary[m].totalNet += (Number(p.netSalary) || 0);
      }
    });

    const matrix = employees.map(emp => {
      const months = [];
      const monthMap = {};
      let paidCount = 0;
      let totalAnnualNet = 0;

      for (let m = 1; m <= 12; m++) {
        const key = `${emp._id.toString()}_${m}`;
        const rec = recordsMap[key];
        const isPaid = Boolean(rec);
        if (isPaid) {
          paidCount++;
          totalAnnualNet += Number(rec.netSalary) || 0;
        }

        const cell = {
          month: m,
          monthName: MONTH_NAMES[m - 1],
          isPaid,
          status: rec ? (rec.status || 'Paid') : 'Unpaid',
          payrollId: rec ? rec.payrollId : null,
          recordId: rec ? rec._id : null,
          basicSalary: rec ? rec.basicSalary : (Number(emp.salary) || 0),
          totalAdvances: rec ? rec.totalAdvances : 0,
          netSalary: rec ? rec.netSalary : null,
          salaryDate: rec ? rec.salaryDate : null,
          paymentDate: rec ? rec.paymentDate : null,
          paymentMethod: rec ? rec.paymentMethod : null,
          processedBy: rec?.processedBy?.fullName || 'Admin',
          notes: rec ? rec.notes : '',
          employeeId: emp._id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeId,
          jobType: emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType,
          branch: emp.branch,
          calendarType: rec ? rec.calendarType : 'Ethiopian'
        };

        months.push(cell);
        monthMap[m] = cell;
      }

      return {
        _id: emp._id,
        employee: emp,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        jobType: emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType,
        branch: emp.branch,
        salary: Number(emp.salary) || 0,
        paidCount,
        unpaidCount: 12 - paidCount,
        totalAnnualNet,
        totalNetYtd: totalAnnualNet,
        months,
        matrix: monthMap
      };
    });

    let totalDisbursements = 0;
    let totalBasic = 0;
    let totalAdvances = 0;
    let totalNet = 0;
    Object.values(monthlySummary).forEach(s => {
      totalDisbursements += s.totalPaid;
      totalBasic += s.totalBasic;
      totalAdvances += s.totalAdvances;
      totalNet += s.totalNet;
    });

    res.json({
      success: true,
      data: {
        year: yr,
        months: MONTH_NAMES,
        monthlySummary,
        monthSummaries: monthlySummary,
        annualTotals: { totalDisbursements, totalBasic, totalAdvances, totalNet },
        matrix,
        employees: matrix
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePayrollStatus(req, res, next) {
  try {
    const { status, paymentMethod } = req.body;
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) throw new AppError('Payroll record not found.', 404);

    if (status === 'Cancelled' && payroll.status !== 'Cancelled') {
      // Revert associated advances back to Approved
      if (payroll.advances && payroll.advances.length > 0) {
        const advanceIds = payroll.advances.map(a => a.advanceId).filter(Boolean);
        if (advanceIds.length > 0) {
          await SalaryAdvance.updateMany(
            { _id: { $in: advanceIds } },
            { $set: { status: 'Approved', payroll: null } }
          );
        }
      }
      payroll.status = 'Cancelled';
    } else if (status === 'Paid') {
      payroll.status = 'Paid';
      payroll.paymentDate = new Date();
      payroll.paidBy = req.user._id;
      if (paymentMethod) payroll.paymentMethod = paymentMethod;
    } else if (status) {
      payroll.status = status;
    }

    await payroll.save();

    res.json({
      success: true,
      message: `Payroll record ${payroll.payrollId} updated to ${payroll.status}.`,
      data: payroll
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 6. PAYROLL SETTINGS
// ==========================================
export async function getSettings(req, res, next) {
  try {
    const settings = await getOrInitSettings();
    const nextDateInfo = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay,
      fromDate: new Date()
    });

    res.json({
      success: true,
      data: {
        ...settings.toObject(),
        nextDateInfo
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { calendarType, salaryDay, salaryFrequency, currency } = req.body;
    const settings = await getOrInitSettings();

    if (calendarType && ['Ethiopian', 'Gregorian'].includes(calendarType)) {
      settings.calendarType = calendarType;
    }
    if (salaryDay !== undefined) {
      const day = Number(salaryDay);
      if (day >= 1 && day <= 31) settings.salaryDay = day;
    }
    if (salaryFrequency) settings.salaryFrequency = salaryFrequency;
    if (currency) settings.currency = currency.trim();

    settings.updatedBy = req.user._id;
    await settings.save();

    const nextDateInfo = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay,
      fromDate: new Date()
    });

    res.json({
      success: true,
      message: 'Payroll configuration updated successfully.',
      data: {
        ...settings.toObject(),
        nextDateInfo
      }
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 7. EXPORT TO PDF REPORT
// ==========================================
export async function exportPayrollPdf(req, res, next) {
  try {
    const { branch, period } = req.query;
    const filter = { employmentStatus: 'Active' };
    if (branch && branch !== 'All') filter.branch = branch;

    const [employees, settings] = await Promise.all([
      Employee.find(filter).sort({ employeeId: 1 }).lean(),
      getOrInitSettings()
    ]);

    const activeAdvances = await SalaryAdvance.find({
      employee: { $in: employees.map(e => e._id) },
      status: 'Approved'
    }).lean();

    const advMap = {};
    for (const a of activeAdvances) {
      const id = a.employee.toString();
      advMap[id] = (advMap[id] || 0) + Number(a.amount);
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true
    });

    res.attachment(`ETU-Payroll-Report-${period || 'Current'}.pdf`).type('application/pdf');
    doc.pipe(res);

    // Embed Logo
    const logoFile = getLogoPath();
    if (logoFile && fs.existsSync(logoFile)) {
      try {
        doc.image(logoFile, 40, 35, { width: 65 });
      } catch (_) {}
    }

    // Header Title
    doc.fontSize(16).fillColor('#0b2a4a').text('ETU DIAGNOSTIC LABORATORY', 115, 38, { bold: true });
    doc.fontSize(12).fillColor('#1c64f2').text('PAYROLL MANAGEMENT REPORT', 115, 58);
    doc.fontSize(9).fillColor('#555555').text('Quality Diagnostic Healthcare Services — Ethiopia', 115, 73);

    // Meta Box
    doc.roundedRect(40, 95, 515, 48, 4).fillAndStroke('#f8fafc', '#cbd5e1');
    const displayPeriod = period || getCurrentSalaryPeriod(settings.calendarType, new Date());
    const nextInfo = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay,
      fromDate: new Date()
    });

    doc.fillColor('#0f172a').fontSize(9);
    doc.text(`Salary Period: ${displayPeriod}`, 52, 103, { bold: true });
    doc.text(`Calendar System: ${settings.calendarType} (Day ${settings.salaryDay})`, 52, 117);
    doc.text(`Next Payday: ${nextInfo.nextSalaryDateFormatted}`, 52, 131);

    doc.text(`Branch: ${branch || 'All Branches'}`, 320, 103);
    doc.text(`Total Active Staff: ${employees.length}`, 320, 117);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 320, 131);

    // Table Header
    let tableY = 155;
    doc.rect(40, tableY, 515, 22).fill('#0b2a4a');
    doc.fillColor('#ffffff').fontSize(8);
    doc.text('EMP ID', 45, tableY + 6);
    doc.text('EMPLOYEE NAME', 110, tableY + 6);
    doc.text('JOB TYPE', 230, tableY + 6);
    doc.text('BRANCH', 315, tableY + 6);
    doc.text('BASIC (ETB)', 370, tableY + 6, { width: 55, align: 'right' });
    doc.text('ADVANCE', 435, tableY + 6, { width: 55, align: 'right' });
    doc.text('NET PAY (ETB)', 495, tableY + 6, { width: 55, align: 'right' });

    let rowY = tableY + 22;
    let totalBasic = 0;
    let totalAdvance = 0;
    let totalNet = 0;

    employees.forEach((emp, index) => {
      if (rowY > 720) {
        doc.addPage();
        rowY = 40;
      }

      const basic = Number(emp.salary) || 0;
      const adv = advMap[emp._id.toString()] || 0;
      const net = Math.max(0, basic - adv);

      totalBasic += basic;
      totalAdvance += adv;
      totalNet += net;

      // Row background
      if (index % 2 === 1) {
        doc.rect(40, rowY, 515, 18).fill('#f1f5f9');
      }

      doc.fillColor('#1e293b').fontSize(8);
      doc.text(emp.employeeId || '—', 45, rowY + 5);
      doc.text(emp.fullName || '—', 110, rowY + 5, { width: 115, ellipsis: true });
      doc.text(emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType, 230, rowY + 5, { width: 80, ellipsis: true });
      doc.text(emp.branch || 'Main', 315, rowY + 5);
      doc.text(basic.toLocaleString(), 370, rowY + 5, { width: 55, align: 'right' });
      doc.text(adv > 0 ? `-${adv.toLocaleString()}` : '0', 435, rowY + 5, { width: 55, align: 'right' });
      doc.text(net.toLocaleString(), 495, rowY + 5, { width: 55, align: 'right', bold: true });

      rowY += 18;
    });

    // Totals Box
    if (rowY > 670) doc.addPage(), rowY = 50;
    doc.rect(40, rowY + 6, 515, 24).fill('#e2e8f0');
    doc.fillColor('#0b2a4a').fontSize(9);
    doc.text('TOTAL PAYROLL SUMMARY', 45, rowY + 13, { bold: true });
    doc.text(totalBasic.toLocaleString() + ' ETB', 355, rowY + 13, { width: 70, align: 'right', bold: true });
    doc.text(totalAdvance > 0 ? `-${totalAdvance.toLocaleString()} ETB` : '0 ETB', 430, rowY + 13, { width: 60, align: 'right', bold: true });
    doc.text(totalNet.toLocaleString() + ' ETB', 490, rowY + 13, { width: 60, align: 'right', bold: true });

    // Signatures Block
    const sigY = rowY + 55;
    if (sigY < 730) {
      doc.fontSize(8).fillColor('#475569');
      doc.text('Prepared By: __________________________', 50, sigY);
      doc.text('Approved By: __________________________', 330, sigY);
      doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`, 50, sigY + 20);
      doc.text('ETU Diagnostic Laboratory Management', 330, sigY + 20);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 8. EXPORT TO CSV
// ==========================================
export async function exportPayrollCsv(req, res, next) {
  try {
    const { branch, jobType, status, search } = req.query;
    const filter = {};

    if (branch && branch !== 'All') filter.branch = branch;
    if (jobType && jobType !== 'All') filter.jobType = jobType;
    if (status && status !== 'All') filter.employmentStatus = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter).sort({ employeeId: 1 }).lean();
    const approvedAdvances = await SalaryAdvance.find({
      employee: { $in: employees.map(e => e._id) },
      status: 'Approved'
    }).lean();

    const advMap = {};
    for (const a of approvedAdvances) {
      const id = a.employee.toString();
      advMap[id] = (advMap[id] || 0) + Number(a.amount);
    }

    const settings = await getOrInitSettings();
    const nextDate = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay
    });

    const escape = v => `"${String(v ?? '').replaceAll('"', '""')}"`;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Age',
      'Phone',
      'Job Type',
      'Branch',
      'Recruitment Date',
      'Basic Salary (ETB)',
      'Total Advances (ETB)',
      'Total Deductions (ETB)',
      'Net Salary (ETB)',
      'Next Salary Date',
      'Status'
    ];

    const rows = employees.map(emp => {
      const basic = Number(emp.salary) || 0;
      const adv = advMap[emp._id.toString()] || 0;
      const net = Math.max(0, basic - adv);
      const job = emp.jobType === 'Other' && emp.customJobType ? emp.customJobType : emp.jobType;
      const hireDate = emp.recruitmentDate ? new Date(emp.recruitmentDate).toISOString().slice(0, 10) : '';

      return [
        emp.employeeId,
        emp.fullName,
        emp.age,
        emp.phone,
        job,
        emp.branch,
        hireDate,
        basic,
        adv,
        adv,
        net,
        nextDate.nextSalaryDateFormatted,
        emp.employmentStatus
      ].map(escape).join(',');
    });

    const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
    res.attachment(`ETU-Payroll-${new Date().toISOString().slice(0, 10)}.csv`)
      .type('text/csv')
      .send(csvContent);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 9. INDIVIDUAL EMPLOYEE SALARY SLIP
// ==========================================
export async function getSalarySlip(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) throw new AppError('Employee not found.', 404);

    const settings = await getOrInitSettings();
    const activeAdvances = await SalaryAdvance.find({
      employee: employee._id,
      status: 'Approved'
    }).lean();

    const basicSalary = Number(employee.salary) || 0;
    const totalAdvances = activeAdvances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const netSalary = Math.max(0, basicSalary - totalAdvances);
    const period = getCurrentSalaryPeriod(settings.calendarType, new Date());
    const nextDate = calculateNextSalaryDate({
      calendarType: settings.calendarType,
      salaryDay: settings.salaryDay
    });

    res.json({
      success: true,
      data: {
        laboratoryName: 'ETU DIAGNOSTIC LABORATORY',
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          jobType: employee.jobType === 'Other' && employee.customJobType ? employee.customJobType : employee.jobType,
          branch: employee.branch,
          phone: employee.phone,
          recruitmentDate: employee.recruitmentDate
        },
        salaryPeriod: period,
        salaryDate: nextDate.nextSalaryDateFormatted,
        calendarType: settings.calendarType,
        currency: settings.currency || 'ETB',
        basicSalary,
        advances: activeAdvances.map(a => ({
          amount: a.amount,
          date: a.date,
          reason: a.reason,
          paymentMethod: a.paymentMethod
        })),
        totalAdvances,
        totalDeductions: totalAdvances,
        netSalary,
        status: employee.employmentStatus,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
}
