/**
 * Reusable Date Range Generator for Queue and Report Filtering
 * Supports: 'today', 'yesterday', 'this_week', 'last_week', 'all'
 */
export function getDateRange(filterType) {
  if (!filterType || String(filterType).toLowerCase() === 'all') return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (String(filterType).toLowerCase()) {
    case 'today':
      return { $gte: startOfToday, $lte: endOfToday };
    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return { $gte: startOfYesterday, $lte: endOfYesterday };
    }
    case 'this_week':
    case 'thisweek':
    case 'this week': {
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
      return { $gte: startOfWeek, $lte: endOfToday };
    }
    case 'last_week':
    case 'lastweek':
    case 'last week': {
      const currentDay = now.getDay();
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const startOfThisWeek = new Date(startOfToday);
      startOfThisWeek.setDate(startOfThisWeek.getDate() + diffToMonday);

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);
      return { $gte: startOfLastWeek, $lte: endOfLastWeek };
    }
    default:
      return null;
  }
}
