/**
 * ETU Diagnostic Laboratory — Doctor / Approver Name Formatting Utility
 * 
 * Ensures that the title "Dr" appears at most ONCE and never duplicates.
 * 
 * Examples:
 * - "Dr Temesgen Fanta CEO"         -> "Dr Temesgen Fanta CEO"
 * - "Dr. Temesgen Fanta CEO"        -> "Dr Temesgen Fanta CEO"
 * - "Temesgen Fanta CEO"            -> "Dr Temesgen Fanta CEO"
 * - "dr Temesgen Fanta CEO"         -> "Dr Temesgen Fanta CEO"
 * - "Dr Dr Dr Temesgen Fanta CEO"   -> "Dr Temesgen Fanta CEO"
 * - "Pending Specialist Approval"   -> "Pending Specialist Approval"
 */

export function formatApproverDoctorName(rawName) {
  if (!rawName) return 'Pending Specialist Approval';
  const str = String(rawName).trim();
  if (!str) return 'Pending Specialist Approval';
  
  if (
    str === 'Pending Specialist Approval' ||
    str.toLowerCase() === 'approved' ||
    str.toLowerCase().includes('pending')
  ) {
    return str;
  }

  // Strip all leading occurrences of "Dr.", "Dr", "dr.", "dr", "doctor", "DR"
  let baseName = str;
  while (/^(?:dr\.?|doctor)\s+/i.test(baseName)) {
    baseName = baseName.replace(/^(?:dr\.?|doctor)\s+/i, '').trim();
  }

  if (!baseName) return 'Dr';

  return `Dr ${baseName}`;
}
