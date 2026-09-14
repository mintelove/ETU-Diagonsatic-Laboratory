import express from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  getPayrollDashboard,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  syncUserAccounts,
  getAdvances,
  createAdvance,
  updateAdvance,
  cancelAdvance,
  getPayrollRecords,
  getPayrollPreview,
  getAnnualPayrollMatrix,
  processPayroll,
  updatePayrollStatus,
  getSettings,
  updateSettings,
  exportPayrollPdf,
  exportPayrollCsv,
  getSalarySlip
} from '../controllers/payrollController.js';

const router = express.Router();

// Strict security lock: only Admin and Sub Admin have access to payroll
router.use(requireAuth);
router.use(allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN));

// Dashboard summary stats
router.get('/dashboard', getPayrollDashboard);

// Configuration & Calendar settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// User account sync
router.post('/sync-users', syncUserAccounts);

// Employee Management CRUD
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Salary Advances CRUD
router.get('/advances', getAdvances);
router.post('/advances', createAdvance);
router.put('/advances/:id', updateAdvance);
router.delete('/advances/:id', cancelAdvance);

// Payroll Processing & History
router.get('/preview', getPayrollPreview);
router.get('/annual-matrix', getAnnualPayrollMatrix);
router.get('/records', getPayrollRecords);
router.post('/process', processPayroll);
router.patch('/records/:id/status', updatePayrollStatus);

// Exports & Pay Slips
router.get('/export/pdf', exportPayrollPdf);
router.get('/export/csv', exportPayrollCsv);
router.get('/salary-slip/:id', getSalarySlip);

export default router;
