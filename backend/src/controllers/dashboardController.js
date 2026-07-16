/**
 * ETU Diagnostic Laboratory — Admin Dashboard Controller
 *
 * Enterprise-grade analytics aggregation providing revenue metrics,
 * patient statistics, sample analytics, report summaries, stock health,
 * referral data, demographic distributions, and trend timelines.
 * Supports optional date-range filtering via query params.
 */

import mongoose from 'mongoose';
import Category from '../models/Category.js';
import StockItem from '../models/StockItem.js';
import StockHistory from '../models/StockHistory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';
import SampleType from '../models/SampleType.js';
import LabReport from '../models/LabReport.js';
import { stockLevel } from '../constants/stock.js';

/* ── Helper: build date boundaries ──────────────────── */
function dateBounds() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(todayStart); monthStart.setDate(1);
  const thirtyDaysAgo = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  return { now, todayStart, weekStart, monthStart, thirtyDaysAgo };
}

/* ── Helper: revenue aggregation with date match ────── */
function revenueAgg(dateMatch) {
  return Patient.aggregate([
    { $match: { paymentStatus: 'Paid', ...dateMatch } },
    { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
  ]);
}

/* ── Helper: serialize stock item ───────────────────── */
const serialize = (item) => {
  const data = item.toJSON ? item.toJSON() : item;
  return { ...data, remainingQuantity: data.currentQuantity - data.usedQuantity, stockLevel: stockLevel(data) };
};

/**
 * GET /api/dashboard
 * Returns comprehensive analytics for the Admin Dashboard.
 * Accepts optional ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD for scoping.
 */
export async function dashboard(req, res, next) {
  try {
    const { todayStart, weekStart, monthStart, thirtyDaysAgo } = dateBounds();

    // Optional custom date filter from query
    const customFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const customTo = req.query.dateTo ? new Date(`${req.query.dateTo}T23:59:59.999Z`) : null;
    const customDateMatch = {};
    if (customFrom) customDateMatch.$gte = customFrom;
    if (customTo) customDateMatch.$lte = customTo;
    const hasCustomDate = customFrom || customTo;

    // ─── Revenue aggregations (parallel) ──────────────
    const [dailyRev, weeklyRev, monthlyRev, totalRev, customRev] = await Promise.all([
      revenueAgg({ registrationDate: { $gte: todayStart } }),
      revenueAgg({ registrationDate: { $gte: weekStart } }),
      revenueAgg({ registrationDate: { $gte: monthStart } }),
      revenueAgg({}),
      hasCustomDate ? revenueAgg({ registrationDate: customDateMatch }) : Promise.resolve([]),
    ]);

    // ─── Patient counts ───────────────────────────────
    const patientDateMatch = hasCustomDate
      ? { registrationDate: customDateMatch }
      : {};
    const [todayPatients, referralPatients, totalPatients] = await Promise.all([
      Patient.countDocuments({ registrationDate: { $gte: todayStart } }),
      Patient.countDocuments({ registrationType: 'Referral', ...patientDateMatch }),
      Patient.countDocuments(patientDateMatch),
    ]);

    // ─── Sample collection count (today) ──────────────
    const samplesCollectedToday = await Patient.aggregate([
      { $match: { paymentStatus: 'Paid', registrationDate: { $gte: todayStart } } },
      { $project: { count: { $size: '$sampleTypes' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    // ─── Report stats ─────────────────────────────────
    const [pendingReports, approvedReports, rejectedReports] = await Promise.all([
      LabReport.countDocuments({ status: { $in: ['Draft', 'Submitted', 'Pending'] } }),
      LabReport.countDocuments({ status: { $in: ['Approved', 'Ready for Printing'] } }),
      LabReport.countDocuments({ status: 'Rejected' }),
    ]);

    // ─── Stock health ─────────────────────────────────
    const [categories, activeUsers, items, unread] = await Promise.all([
      Category.countDocuments(),
      User.countDocuments({ status: 'Active' }),
      StockItem.find({ status: 'Active' }).populate('category', 'name categoryName').lean(),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);

    const stockLevels = { Healthy: 0, Moderate: 0, Low: 0, Critical: 0, 'Critical Emergency': 0, 'Out of Stock': 0 };
    const byCategory = {};
    items.forEach(i => {
      const level = stockLevel(i);
      stockLevels[level.key]++;
      const catName = i.category?.name || i.category?.categoryName || 'Uncategorized';
      byCategory[catName] = (byCategory[catName] || 0) + 1;
    });

    const criticalItems = items
      .filter(i => ['Critical', 'Critical Emergency', 'Out of Stock'].includes(stockLevel(i).key))
      .map(i => serialize(i));

    // ─── Top collected sample types ───────────────────
    const topSamples = await Patient.aggregate([
      { $match: { paymentStatus: 'Paid', ...patientDateMatch } },
      { $unwind: '$sampleTypes' },
      { $group: { _id: '$sampleTypes', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'sampletypes', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: { path: '$info', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$info.name', 'Unknown'] }, count: 1 } },
    ]);

    // ─── Revenue by sample type ───────────────────────
    const revenueBySample = await Patient.aggregate([
      { $match: { paymentStatus: 'Paid', ...patientDateMatch } },
      { $unwind: '$sampleTypes' },
      { $lookup: { from: 'sampletypes', localField: 'sampleTypes', foreignField: '_id', as: 'st' } },
      { $unwind: { path: '$st', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$st.name', revenue: { $sum: { $ifNull: ['$st.price', 0] } }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { name: { $ifNull: ['$_id', 'Unknown'] }, revenue: 1, count: 1 } },
    ]);

    // ─── Revenue trend (last 30 days) ─────────────────
    const revenueTrend = await Patient.aggregate([
      { $match: { paymentStatus: 'Paid', registrationDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$registrationDate' } },
          revenue: { $sum: '$grandTotal' },
          patients: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', revenue: 1, patients: 1 } },
    ]);

    // ─── Referral hospital statistics ─────────────────
    const referralStats = await Patient.aggregate([
      { $match: { registrationType: 'Referral', referralHospital: { $ne: '' }, ...patientDateMatch } },
      { $group: { _id: '$referralHospital', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { name: '$_id', count: 1 } },
    ]);

    // ─── Gender distribution ──────────────────────────
    const genderDist = await Patient.aggregate([
      { $match: patientDateMatch },
      { $group: { _id: '$sex', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1 } },
    ]);

    // ─── Age distribution ─────────────────────────────
    const ageDist = await Patient.aggregate([
      { $match: patientDateMatch },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [0, 11, 21, 31, 41, 51, 61, 71, 81, 131],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
      {
        $project: {
          range: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: '0-10' },
                { case: { $eq: ['$_id', 11] }, then: '11-20' },
                { case: { $eq: ['$_id', 21] }, then: '21-30' },
                { case: { $eq: ['$_id', 31] }, then: '31-40' },
                { case: { $eq: ['$_id', 41] }, then: '41-50' },
                { case: { $eq: ['$_id', 51] }, then: '51-60' },
                { case: { $eq: ['$_id', 61] }, then: '61-70' },
                { case: { $eq: ['$_id', 71] }, then: '71-80' },
                { case: { $eq: ['$_id', 81] }, then: '80+' },
              ],
              default: 'Other',
            },
          },
          count: 1,
        },
      },
    ]);

    // ─── Recent patients ──────────────────────────────
    const recentPatients = await Patient.find()
      .populate('sampleTypes', 'name')
      .sort({ registrationDate: -1 })
      .limit(10)
      .lean();

    // ─── Recent lab reports ───────────────────────────
    const recentReports = await LabReport.find()
      .populate('patient', 'patientId name')
      .populate('technician', 'fullName')
      .populate('approvedBy', 'fullName')
      .sort({ createdDate: -1 })
      .limit(10)
      .lean();

    // ─── Recent activity ──────────────────────────────
    const activities = await StockHistory.find()
      .populate('item', 'itemName itemCode')
      .populate('user', 'fullName role')
      .sort({ createdDate: -1 })
      .limit(12)
      .lean();

    res.json({
      generatedAt: new Date(),
      system: {
        api: 'Operational',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Unavailable',
      },
      revenue: {
        dailyIncome: dailyRev[0]?.total || 0,
        weeklyIncome: weeklyRev[0]?.total || 0,
        monthlyIncome: monthlyRev[0]?.total || 0,
        totalRevenue: totalRev[0]?.total || 0,
        customIncome: customRev[0]?.total || 0,
        customPatients: customRev[0]?.count || 0,
      },
      summary: {
        totalCategories: categories,
        totalUsers: activeUsers,
        totalItems: items.length,
        todayPatients,
        totalPatients,
        referralPatients,
        samplesCollectedToday: samplesCollectedToday[0]?.total || 0,
        pendingReports,
        approvedReports,
        rejectedReports,
        criticalStockItems: criticalItems.length,
        unreadNotifications: unread,
      },
      stock: {
        levels: stockLevels,
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        criticalItems,
      },
      charts: {
        topSamples,
        revenueBySample,
        revenueTrend,
        referralStats,
        genderDistribution: genderDist,
        ageDistribution: ageDist,
      },
      tables: {
        recentPatients: recentPatients.map(p => ({
          _id: p._id,
          patientId: p.patientId,
          name: p.name,
          age: p.age,
          sex: p.sex,
          sampleTypes: (p.sampleTypes || []).map(s => s.name).join(', ') || 'Counselling',
          registrationDate: p.registrationDate,
          paymentStatus: p.paymentStatus,
        })),
        recentReports: recentReports.map(r => ({
          _id: r._id,
          patient: r.patient?.name || '—',
          patientId: r.patient?.patientId || '—',
          technician: r.technician?.fullName || '—',
          approvedBy: r.approvedBy?.fullName || '—',
          status: r.status,
          createdDate: r.createdDate,
        })),
      },
      activities,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/dashboard/search
 * Global search across stock, users, and categories.
 */
export async function searchDashboard(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });
    const [items, users, categories] = await Promise.all([
      StockItem.find({ $or: [{ itemName: { $regex: q, $options: 'i' } }, { itemCode: { $regex: q, $options: 'i' } }] }).select('itemName itemCode').limit(5).lean(),
      User.find({ $or: [{ fullName: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }] }).select('fullName username role').limit(5).lean(),
      Category.find({ $or: [{ name: { $regex: q, $options: 'i' } }, { categoryName: { $regex: q, $options: 'i' } }] }).select('name categoryName').limit(5).lean(),
    ]);
    res.json({
      results: [
        ...items.map(x => ({ type: 'Stock item', label: x.itemName, detail: x.itemCode, path: `/stock?item=${x._id}` })),
        ...users.map(x => ({ type: 'User', label: x.fullName, detail: x.role, path: '/users' })),
        ...categories.map(x => ({ type: 'Category', label: x.categoryName || x.name, detail: 'Stock category', path: '/categories' })),
      ],
    });
  } catch (e) {
    next(e);
  }
}
