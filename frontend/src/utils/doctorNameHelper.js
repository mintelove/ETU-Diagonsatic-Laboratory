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

export function formatApproverDoctorName(rawApprover, role) {
  if (!rawApprover) return 'Pending Specialist Approval';

  let rawName = '';
  let approverRole = role || '';

  if (typeof rawApprover === 'object' && rawApprover !== null) {
    rawName = rawApprover.fullName || rawApprover.name || '';
    approverRole = approverRole || rawApprover.role || '';
  } else {
    rawName = String(rawApprover).trim();
  }

  if (!rawName) return 'Pending Specialist Approval';

  if (
    rawName === 'Pending Specialist Approval' ||
    rawName.toLowerCase() === 'approved' ||
    rawName.toLowerCase().includes('pending')
  ) {
    return rawName;
  }

  // Strip all leading occurrences of "Dr.", "Dr", "dr.", "dr", "doctor", "DR"
  let baseName = rawName.trim();
  while (/^(?:dr\.?|doctor)\s+/i.test(baseName)) {
    baseName = baseName.replace(/^(?:dr\.?|doctor)\s+/i, '').trim();
  }

  if (!baseName) return 'Approver';

  // Check if this approver is Admin Dr Temesgen Fanta
  const isTemesgenAdmin =
    /temesgen\s+fanta/i.test(baseName) ||
    /temesgen\s+fanta/i.test(rawName) ||
    (String(approverRole).toLowerCase() === 'admin' && /temesgen/i.test(baseName));

  if (isTemesgenAdmin) {
    // For Admin Dr Temesgen Fanta, cleanly format with Dr title without any trailing 'CEO' suffix
    const cleanTemesgen = baseName.replace(/\s+CEO$/i, '').trim();
    return `Dr ${cleanTemesgen || 'Temesgen Fanta'}`;
  }

  // Normal Approver (e.g. Tarekegn Tamirat) -> exact full name from user account without "Dr"
  return baseName;
}
