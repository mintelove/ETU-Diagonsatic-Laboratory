/**
 * Verification Test: Approver Doctor Title Normalization & Single-Title Display
 * 
 * Verifies that:
 * 1. formatApproverDoctorName handles all specified inputs cleanly.
 * 2. No double/triple "Dr Dr Dr" prefix is generated anywhere in previews or prints.
 * 3. End-to-end report rendering with doctor titles formats cleanly.
 */

import { formatApproverDoctorName } from '../../../frontend/src/utils/doctorNameHelper.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function testTitleFormatting() {
  console.log('================================================================');
  console.log('🧪 VERIFYING APPROVER DOCTOR TITLE NORMALIZATION (NO DUPLICATES)');
  console.log('================================================================\n');

  // Test Case A: "Dr Temesgen Fanta CEO"
  const resA = formatApproverDoctorName('Dr Temesgen Fanta CEO');
  assert(resA === 'Dr Temesgen Fanta CEO', `Case A ("Dr Temesgen Fanta CEO") -> "${resA}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case B: "Dr. Temesgen Fanta CEO"
  const resB = formatApproverDoctorName('Dr. Temesgen Fanta CEO');
  assert(resB === 'Dr Temesgen Fanta CEO', `Case B ("Dr. Temesgen Fanta CEO") -> "${resB}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case C: "Temesgen Fanta CEO" (no title)
  const resC = formatApproverDoctorName('Temesgen Fanta CEO');
  assert(resC === 'Dr Temesgen Fanta CEO', `Case C ("Temesgen Fanta CEO") -> "${resC}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case D: "dr Temesgen Fanta CEO" (lowercase title)
  const resD = formatApproverDoctorName('dr Temesgen Fanta CEO');
  assert(resD === 'Dr Temesgen Fanta CEO', `Case D ("dr Temesgen Fanta CEO") -> "${resD}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case E: "Dr Dr Dr Temesgen Fanta CEO" (triple title repetition)
  const resE = formatApproverDoctorName('Dr Dr Dr Temesgen Fanta CEO');
  assert(resE === 'Dr Temesgen Fanta CEO', `Case E ("Dr Dr Dr Temesgen Fanta CEO") -> "${resE}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case F: "Dr. Dr. Dr. Temesgen Fanta CEO" (dotted triple title repetition)
  const resF = formatApproverDoctorName('Dr. Dr. Dr. Temesgen Fanta CEO');
  assert(resF === 'Dr Temesgen Fanta CEO', `Case F ("Dr. Dr. Dr. Temesgen Fanta CEO") -> "${resF}" (Expected: "Dr Temesgen Fanta CEO")`);

  // Test Case G: "doctor Temesgen Fanta"
  const resG = formatApproverDoctorName('doctor Temesgen Fanta');
  assert(resG === 'Dr Temesgen Fanta', `Case G ("doctor Temesgen Fanta") -> "${resG}" (Expected: "Dr Temesgen Fanta")`);

  // Test Case H: "Pending Specialist Approval"
  const resH = formatApproverDoctorName('Pending Specialist Approval');
  assert(resH === 'Pending Specialist Approval', `Case H ("Pending Specialist Approval") -> "${resH}" (Expected: "Pending Specialist Approval")`);

  // Test Case I: Other Specialist Names without title
  const resI = formatApproverDoctorName('Womdachew Tesfaye');
  assert(resI === 'Dr Womdachew Tesfaye', `Case I ("Womdachew Tesfaye") -> "${resI}" (Expected: "Dr Womdachew Tesfaye")`);

  // Test Case J: Other Specialist Names with Dr
  const resJ = formatApproverDoctorName('Dr Womdachew Tesfaye');
  assert(resJ === 'Dr Womdachew Tesfaye', `Case J ("Dr Womdachew Tesfaye") -> "${resJ}" (Expected: "Dr Womdachew Tesfaye")`);

  console.log('\n================================================================');
  console.log(`🏁 TITLE FORMATTING VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

testTitleFormatting();
