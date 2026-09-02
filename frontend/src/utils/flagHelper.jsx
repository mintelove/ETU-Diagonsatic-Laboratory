import React from 'react';

/**
 * Utility to calculate and format result flags (High, Low, Normal, Critical Low, Critical High) for Laboratory Reports
 */

export function calculateFlag(result, referenceValue, sex = '', criticalLow = null, criticalHigh = null) {
  const strVal = String(result ?? '').trim().toUpperCase();
  const strRef = String(referenceValue ?? '').trim().toUpperCase();
  if (!strVal) return '';

  // Qualitative checks
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

  // Direct Critical cutoffs if passed
  const cLow = criticalLow !== null && criticalLow !== undefined && criticalLow !== '' ? Number(criticalLow) : null;
  const cHigh = criticalHigh !== null && criticalHigh !== undefined && criticalHigh !== '' ? Number(criticalHigh) : null;
  if (cLow !== null && Number.isFinite(cLow) && value <= cLow) return 'CL';
  if (cHigh !== null && Number.isFinite(cHigh) && value >= cHigh) return 'CH';

  let range = String(referenceValue ?? '').replace(/,/g, '.');
  if (range.toLowerCase().includes('requires') || range.toLowerCase().includes('not configured')) {
    return '';
  }

  // Parse inline critical limits from reference text if present (e.g. Critical: < 7.0 or > 20.0)
  const critLowMatch = range.match(/critical\s*low\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (critLowMatch && value <= Number(critLowMatch[1])) return 'CL';
  const critHighMatch = range.match(/critical\s*high\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (critHighMatch && value >= Number(critHighMatch[1])) return 'CH';

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
  if (lower) return value < Number(lower[1]) ? 'L' : 'N';
  return '';
}

export function getFlagDetails(flag, result, referenceValue, sex = '') {
  let f = String(flag || '').trim().toUpperCase();
  if (!f && result && referenceValue) {
    f = calculateFlag(result, referenceValue, sex);
  }

  if (['CH', 'CRITICAL HIGH', 'CRITICAL_HIGH'].includes(f)) {
    return {
      flag: 'CH',
      label: 'Critical High',
      shortLabel: 'CH',
      fullLabel: '🚨 CH — Critical High',
      className: 'flag-badge critical-high',
      color: '#ffffff',
      bg: '#dc2626',
      border: '#b91c1c',
      icon: '🚨'
    };
  }

  if (['CL', 'CRITICAL LOW', 'CRITICAL_LOW'].includes(f)) {
    return {
      flag: 'CL',
      label: 'Critical Low',
      shortLabel: 'CL',
      fullLabel: '🚨 CL — Critical Low',
      className: 'flag-badge critical-low',
      color: '#ffffff',
      bg: '#991b1b',
      border: '#7f1d1d',
      icon: '🚨'
    };
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
        whiteSpace: 'nowrap',
        position: 'relative',
        zIndex: 2,
        opacity: 1,
        visibility: 'visible',
        pointerEvents: 'auto'
      }}
    >
      {showIcon && <span style={{ color: details.color, pointerEvents: 'none' }}>{details.icon}</span>}
      <span style={{ color: details.color, pointerEvents: 'none' }}>{details.label}</span>
    </span>
  );
}

