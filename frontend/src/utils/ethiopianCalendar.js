/**
 * ETU Diagnostic Laboratory — Client-Side Ethiopian & Gregorian Calendar Engine
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

export function isEthLeapYear(year) {
  return year % 4 === 3;
}

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

export function gregorianToEthiopian(dateInput) {
  const d = new Date(dateInput);
  const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((utcMs - ANCHOR_GREGORIAN_MS) / ONE_DAY_MS);
  return daysToEthDate(diffDays);
}

export function ethiopianToGregorian(year, month, day) {
  const days = ethDateToDays(year, month, day);
  const ms = ANCHOR_GREGORIAN_MS + days * ONE_DAY_MS;
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatEthiopianDate(ethDate, lang = 'en') {
  if (!ethDate) return '';
  const monthLabel = lang === 'am'
    ? (ETHIOPIAN_MONTHS_AM[ethDate.month - 1] || ethDate.month)
    : (ETHIOPIAN_MONTHS[ethDate.month - 1] || ethDate.month);
  const suffix = lang === 'am' ? 'ዓ.ም.' : 'E.C.';
  return `${ethDate.day} ${monthLabel} ${ethDate.year} ${suffix}`;
}

export function formatGregorianDate(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDate();
  const month = GREGORIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year} G.C.`;
}

export function calculateNextSalaryDate({ calendarType = 'Ethiopian', salaryDay = 30, fromDate = new Date() } = {}) {
  const ref = new Date(fromDate);
  const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

  if (calendarType === 'Gregorian') {
    let year = ref.getFullYear();
    let month = ref.getMonth();

    const maxDaysCurrent = new Date(year, month + 1, 0).getDate();
    const targetDayCurrent = Math.min(Math.max(1, salaryDay), maxDaysCurrent);
    let targetDate = new Date(year, month, targetDayCurrent);

    if (Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()) < refUtc) {
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

  if (targetMonth === 13 && targetDay > (isEthLeapYear(targetYear) ? 6 : 5)) {
    targetYear += 1;
    targetMonth = 1;
  }

  let nextGC = ethiopianToGregorian(targetYear, targetMonth, targetDay);
  let nextGCUtc = Date.UTC(nextGC.getFullYear(), nextGC.getMonth(), nextGC.getDate());

  if (nextGCUtc < refUtc) {
    targetMonth += 1;
    if (targetMonth === 13 && targetDay > (isEthLeapYear(targetYear) ? 6 : 5)) {
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
