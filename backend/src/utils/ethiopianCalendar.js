/**
 * ETU Diagnostic Laboratory — Ethiopian & Gregorian Calendar Engine
 * Accurate, reversible conversion and payday calculations.
 */

export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Magabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

export const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

export const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// In Ethiopian calendar, leap year is when year % 4 === 3
export function isEthLeapYear(year) {
  return year % 4 === 3;
}

// Meskerem 1, 2000 EC was September 12, 2007 (UTC)
const ANCHOR_GREGORIAN_MS = Date.UTC(2007, 8, 12);
const ONE_DAY_MS = 86400000;

export function ethDateToDays(year, month, day) {
  let days = 0;
  for (let y = 2000; y < year; y++) {
    days += isEthLeapYear(y) ? 366 : 365;
  }
  days += (month - 1) * 30 + (day - 1);
  return days;
}

export function daysToEthDate(totalDays) {
  let year = 2000;
  while (true) {
    const daysInYear = isEthLeapYear(year) ? 366 : 365;
    if (totalDays < daysInYear) break;
    totalDays -= daysInYear;
    year++;
  }
  const month = Math.floor(totalDays / 30) + 1;
  const day = (totalDays % 30) + 1;
  return {
    year,
    month,
    day,
    monthName: ETHIOPIAN_MONTHS[month - 1] || 'Meskerem',
    monthNameAm: ETHIOPIAN_MONTHS_AM[month - 1] || 'መስከረም'
  };
}

/**
 * Converts a Gregorian Date to an Ethiopian Date object.
 */
export function gregorianToEthiopian(dateInput) {
  const d = new Date(dateInput);
  const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((utcMs - ANCHOR_GREGORIAN_MS) / ONE_DAY_MS);
  return daysToEthDate(diffDays);
}

/**
 * Converts an Ethiopian Date (year, month 1-13, day 1-30) to a Gregorian Date.
 */
export function ethiopianToGregorian(year, month, day) {
  const days = ethDateToDays(year, month, day);
  const ms = ANCHOR_GREGORIAN_MS + days * ONE_DAY_MS;
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Formats an Ethiopian Date object into a readable string.
 * Example: "30 Meskerem 2019 E.C." or "30 መስከረም 2019 ዓ.ም."
 */
export function formatEthiopianDate(ethDate, lang = 'en') {
  if (!ethDate) return '';
  const monthLabel = lang === 'am'
    ? (ETHIOPIAN_MONTHS_AM[ethDate.month - 1] || ethDate.month)
    : (ETHIOPIAN_MONTHS[ethDate.month - 1] || ethDate.month);
  const suffix = lang === 'am' ? 'ዓ.ም.' : 'E.C.';
  return `${ethDate.day} ${monthLabel} ${ethDate.year} ${suffix}`;
}

/**
 * Formats a Gregorian Date.
 * Example: "30 September 2026 G.C."
 */
export function formatGregorianDate(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDate();
  const month = GREGORIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year} G.C.`;
}

/**
 * Returns the current salary period label (e.g. "Meskerem 2019" or "September 2026").
 */
export function getCurrentSalaryPeriod(calendarType = 'Ethiopian', fromDate = new Date()) {
  if (calendarType === 'Gregorian') {
    const d = new Date(fromDate);
    return `${GREGORIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  const eth = gregorianToEthiopian(fromDate);
  return `${eth.monthName} ${eth.year}`;
}

/**
 * Calculates the next salary payment date and days remaining based on configured settings.
 * Supports both Ethiopian Calendar and Gregorian Calendar.
 */
export function calculateNextSalaryDate({ calendarType = 'Ethiopian', salaryDay = 30, fromDate = new Date() } = {}) {
  const ref = new Date(fromDate);
  const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

  if (calendarType === 'Gregorian') {
    let year = ref.getFullYear();
    let month = ref.getMonth(); // 0-indexed

    // Maximum days in current Gregorian month
    const maxDaysCurrent = new Date(year, month + 1, 0).getDate();
    const targetDayCurrent = Math.min(Math.max(1, salaryDay), maxDaysCurrent);
    let targetDate = new Date(year, month, targetDayCurrent);

    if (Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()) < refUtc) {
      // Roll to next month
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      const maxDaysNext = new Date(year, month + 1, 0).getDate();
      const targetDayNext = Math.min(Math.max(1, salaryDay), maxDaysNext);
      targetDate = new Date(year, month, targetDayNext);
    }

    const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const daysRemaining = Math.max(0, Math.round((targetUtc - refUtc) / ONE_DAY_MS));
    const ethEquivalent = gregorianToEthiopian(targetDate);

    return {
      calendarType: 'Gregorian',
      salaryDay,
      nextSalaryDate: targetDate,
      nextSalaryDateFormatted: formatGregorianDate(targetDate),
      alternativeCalendarFormatted: formatEthiopianDate(ethEquivalent, 'en'),
      daysRemaining,
      salaryPeriod: `${GREGORIAN_MONTHS[targetDate.getMonth()]} ${targetDate.getFullYear()}`
    };
  }

  // Ethiopian Calendar Mode (Default)
  const currentEth = gregorianToEthiopian(ref);
  let targetYear = currentEth.year;
  let targetMonth = currentEth.month;
  let targetDay = Math.min(Math.max(1, salaryDay), 30);

  // If current month is Pagume (month 13) and targetDay is 30, it can only fall in Meskerem
  if (targetMonth === 13 && targetDay > (isEthLeapYear(targetYear) ? 6 : 5)) {
    targetYear += 1;
    targetMonth = 1;
  }

  let nextGC = ethiopianToGregorian(targetYear, targetMonth, targetDay);
  let nextGCUtc = Date.UTC(nextGC.getFullYear(), nextGC.getMonth(), nextGC.getDate());

  if (nextGCUtc < refUtc) {
    // Current month's payday already passed; move to next Ethiopian month
    targetMonth += 1;
    if (targetMonth === 13 && targetDay > (isEthLeapYear(targetYear) ? 6 : 5)) {
      // If salaryDay is 30, Pagume (5 or 6 days) doesn't have day 30, roll to Meskerem next year
      targetYear += 1;
      targetMonth = 1;
    } else if (targetMonth > 13) {
      targetYear += 1;
      targetMonth = 1;
    }
    nextGC = ethiopianToGregorian(targetYear, targetMonth, targetDay);
    nextGCUtc = Date.UTC(nextGC.getFullYear(), nextGC.getMonth(), nextGC.getDate());
  }

  const daysRemaining = Math.max(0, Math.round((nextGCUtc - refUtc) / ONE_DAY_MS));
  const targetEth = {
    year: targetYear,
    month: targetMonth,
    day: targetDay,
    monthName: ETHIOPIAN_MONTHS[targetMonth - 1],
    monthNameAm: ETHIOPIAN_MONTHS_AM[targetMonth - 1]
  };

  return {
    calendarType: 'Ethiopian',
    salaryDay: targetDay,
    nextSalaryDate: nextGC,
    nextSalaryDateFormatted: formatEthiopianDate(targetEth, 'en'),
    nextSalaryDateFormattedAm: formatEthiopianDate(targetEth, 'am'),
    alternativeCalendarFormatted: formatGregorianDate(nextGC),
    daysRemaining,
    salaryPeriod: `${targetEth.monthName} ${targetEth.year}`
  };
}
