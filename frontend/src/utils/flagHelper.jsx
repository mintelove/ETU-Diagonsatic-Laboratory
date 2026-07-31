import React from 'react';

/**
 * Utility to calculate and format result flags (High, Low, Normal) for Laboratory Reports
 */

export function calculateFlag(result, referenceValue, sex = '') {
  const strVal = String(result ?? '').trim().toUpperCase();
  const strRef = String(referenceValue ?? '').trim().toUpperCase();
  if (!strVal) return '';

  // Qualitative Serology / Immunohematology flag checks
  if (['REACTIVE', 'POSITIVE', 'POS'].includes(strVal)) {
    if (['NON-REACTIVE', 'NEGATIVE', 'NEG'].some(r => strRef.includes(r))) {
      return 'H';
    }
  }
  if (['NON-REACTIVE', 'NEGATIVE', 'NEG'].includes(strVal)) {
    if (['NON-REACTIVE', 'NEGATIVE', 'NEG'].some(r => strRef.includes(r))) {
      return 'N';
    }
  }
  if (['COMPATIBLE'].includes(strVal)) {
    return 'N';
  }
  if (['INCOMPATIBLE'].includes(strVal)) {
    return 'H';
  }

  const value = Number(String(result ?? '').replace(',', '.'));
  if (!Number.isFinite(value)) return '';
  let range = String(referenceValue ?? '').replace(/,/g, '.');

  if (sex && /male|female|m|f/i.test(sex)) {
    const isFemale = /^f(emale)?$/i.test(sex.trim());
    const isMale = /^m(ale)?$/i.test(sex.trim());
    if (isFemale) {
      const fMatch = range.match(/female\s*:\s*(-?\d+(?:\.\d+)?\s*(?:–|-|to)\s*-?\d+(?:\.\d+)?)/i);
      if (fMatch) range = fMatch[1];
    } else if (isMale) {
      const mMatch = range.match(/male\s*:\s*(-?\d+(?:\.\d+)?\s*(?:–|-|to)\s*-?\d+(?:\.\d+)?)/i);
      if (mMatch) range = mMatch[1];
    }
  }

  const bounds = range.match(/(-?\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (bounds) {
    const low = Number(bounds[1]), high = Number(bounds[2]);
    return value < low ? 'L' : value > high ? 'H' : 'N';
  }
  const upper = range.match(/^\s*[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return value > Number(upper[1]) ? 'H' : 'N';
  const lower = range.match(/^\s*[>≥]\s*(-?\d+(?:\.\d+)?)/);
  return lower ? (value < Number(lower[1]) ? 'L' : 'N') : '';
}

export function getFlagDetails(flag, result, referenceValue, sex = '') {
  let f = String(flag || '').trim().toUpperCase();
  if (!f && result && referenceValue) {
    f = calculateFlag(result, referenceValue, sex);
  }
  if (f === 'H' || f === 'HIGH') {
    return {
      flag: 'H',
      label: 'H — High',
      shortLabel: 'H',
      fullLabel: '🔴 H — High',
      className: 'flag-badge H',
      color: '#be2525',
      bg: '#ffe3e3',
      border: '#f8b4b4',
      icon: '🔴'
    };
  }
  if (f === 'L' || f === 'LOW') {
    return {
      flag: 'L',
      label: 'L — Low',
      shortLabel: 'L',
      fullLabel: '🟡 L — Low',
      className: 'flag-badge L',
      color: '#8c6900',
      bg: '#fff5c8',
      border: '#fce38a',
      icon: '🟡'
    };
  }
  if (f === 'N' || f === 'NORMAL') {
    return {
      flag: 'N',
      label: 'Normal',
      shortLabel: 'Normal',
      fullLabel: '🟢 Normal',
      className: 'flag-badge N',
      color: '#14733e',
      bg: '#ddf6e7',
      border: '#a3e4bc',
      icon: '🟢'
    };
  }
  return {
    flag: '',
    label: '—',
    shortLabel: '—',
    fullLabel: '—',
    className: 'flag-badge blank',
    color: '#687b84',
    bg: '#edf2f4',
    border: '#d0d7de',
    icon: ''
  };
}

export function FlagBadge({ flag, result, referenceValue, sex = '', showIcon = true }) {
  const details = getFlagDetails(flag, result, referenceValue, sex);
  if (!details.flag) return <span style={{ color: '#78909c' }}>—</span>;
  return (
    <span
      className={details.className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 700,
        background: details.bg,
        color: details.color,
        border: `1px solid ${details.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {showIcon && <span>{details.icon}</span>}
      <span>{details.label}</span>
    </span>
  );
}
