/**
 * Verification script for POS80 Thermal Receipt Printing
 * Validates data structuring, 80mm HTML generation, pricing, date/time formatting,
 * and reprint functionality.
 */

import { preparePOS80ReceiptData, generateThermalReceiptHtml } from '../../../frontend/src/utils/receiptDataHelper.js';

console.log('=== VERIFYING POS80 THERMAL RECEIPT GENERATION ===\n');

// Mock test catalog categories
const mockTestCategories = [
  {
    name: 'HEMATOLOGY',
    tests: [
      { _id: 'cbc-1', name: 'WHITE BLOOD CELL COUNT (WBC)', subcategory: 'CBC', price: 500 },
      { _id: 'cbc-2', name: 'RED BLOOD CELL COUNT (RBC)', subcategory: 'CBC', price: 500 },
      { _id: 'cbc-3', name: 'HEMOGLOBIN (HGB)', subcategory: 'CBC', price: 500 }
    ]
  },
  {
    name: 'URINALYSIS',
    tests: [
      { _id: 'um-bundle', name: 'Urine Microscopy', isBundle: true, price: 300, subcategory: 'Urine Microscopy' },
      { _id: 'um-wbc', name: 'WBC', parentBundle: 'Urine Microscopy', subcategory: 'Urine Microscopy', price: 0 },
      { _id: 'um-rbc', name: 'RBC', parentBundle: 'Urine Microscopy', subcategory: 'Urine Microscopy', price: 0 },
      { _id: 'hcg-test', name: 'Pregnancy Test [HCG]', price: 200, subcategory: 'Urinalysis' }
    ]
  },
  {
    name: 'CLINICAL CHEMISTRY',
    tests: [
      { _id: 'fbs-test', name: 'FASTING BLOOD SUGAR (FBS)', price: 250, subcategory: 'Glucose Metabolism' }
    ]
  }
];

// Test Scenario 1: Fresh Registration with CBC + Urine Microscopy + FBS
const patient1 = {
  name: 'Abebe Bikila',
  patientId: 'ETU-2026-001',
  receiptNumber: 'RC-8921',
  paymentDate: new Date('2026-09-03T10:15:00Z'),
  paymentMethod: 'Cash',
  samplesSelected: [
    { _id: 'cbc-1', name: 'WHITE BLOOD CELL COUNT (WBC)', subcategory: 'CBC', categoryName: 'HEMATOLOGY', price: 500 },
    { _id: 'cbc-2', name: 'RED BLOOD CELL COUNT (RBC)', subcategory: 'CBC', categoryName: 'HEMATOLOGY', price: 500 },
    { _id: 'um-bundle', name: 'Urine Microscopy', isBundle: true, subcategory: 'Urine Microscopy', categoryName: 'URINALYSIS', price: 300 },
    { _id: 'um-wbc', name: 'WBC', parentBundle: 'Urine Microscopy', subcategory: 'Urine Microscopy', categoryName: 'URINALYSIS', price: 0 },
    { _id: 'fbs-test', name: 'FASTING BLOOD SUGAR (FBS)', subcategory: 'Glucose Metabolism', categoryName: 'CLINICAL CHEMISTRY', price: 250 }
  ]
};

const receiptData1 = preparePOS80ReceiptData(patient1, {
  testCategories: mockTestCategories,
  cbcGroupPrice: 150,
  urineChemicalPrice: 300,
  urineMicroscopyPrice: 300,
  paymentDetails: {
    method: 'Cash',
    received: 1000,
    balance: 300,
    cashier: 'Sara Receptionist'
  }
});

console.log('Scenario 1 - Abebe Bikila:');
console.log('  Receipt Number:', receiptData1.receiptNumber);
console.log('  Patient ID:', receiptData1.patientId);
console.log('  Date:', receiptData1.dateStr, '| Time:', receiptData1.timeStr);
console.log('  Grand Total:', receiptData1.grandTotal, 'ETB');
console.log('  Expected: 150 (CBC group) + 300 (Urine Micro bundle) + 250 (FBS) = 700 ETB');
if (receiptData1.grandTotal === 700) {
  console.log('  ✅ PASS: Grand Total is exactly 700 ETB');
} else {
  console.error('  ❌ FAIL: Expected 700 ETB, got', receiptData1.grandTotal);
  process.exit(1);
}

// Generate HTML
const html1 = generateThermalReceiptHtml(receiptData1);
if (
  html1.includes('@page') &&
  html1.includes('80mm auto') &&
  html1.includes('Abebe Bikila') &&
  html1.includes('ETU Diagnostic Lab') &&
  html1.includes('CBC — Complete Blood Count') &&
  html1.includes('Urine Microscopy') &&
  html1.includes('FASTING BLOOD SUGAR (FBS)') &&
  html1.includes('Sara Receptionist')
) {
  console.log('  ✅ PASS: Generated POS80 Thermal HTML contains all expected layout and sections');
} else {
  console.error('  ❌ FAIL: Generated HTML missing expected POS80 content');
  process.exit(1);
}

// Test Scenario 2: Reprint of Completed Visit
const patientReprint = {
  _id: 'mongo-patient-id-123',
  name: 'Marta Haile',
  patientId: 'ETU-2026-099',
  receiptNumber: 'RC-7700',
  registrationDate: new Date('2026-09-02T14:30:00Z'),
  paymentDate: new Date('2026-09-02T14:35:00Z'),
  paymentMethod: 'Telebirr',
  registeredBy: { fullName: 'Dawit Registrar' },
  registrationType: 'Individual',
  patientCategory: 'Regular',
  grandTotal: 300,
  laboratoryTests: [
    { _id: 'um-bundle', name: 'Urine Microscopy', isBundle: true, subcategory: 'Urine Microscopy', category: 'URINALYSIS', price: 300 }
  ]
};

const receiptDataReprint = preparePOS80ReceiptData(patientReprint, {
  testCategories: mockTestCategories,
  cbcGroupPrice: 150,
  urineChemicalPrice: 300,
  urineMicroscopyPrice: 300,
  paymentDetails: {
    cashier: 'Dawit Registrar'
  }
});

console.log('\nScenario 2 - Reprint:');
console.log('  Is Reprint:', receiptDataReprint.isReprint);
console.log('  Receipt Number:', receiptDataReprint.receiptNumber);
console.log('  Cashier:', receiptDataReprint.cashier);
console.log('  Grand Total:', receiptDataReprint.grandTotal, 'ETB');

const htmlReprint = generateThermalReceiptHtml(receiptDataReprint);
if (
  receiptDataReprint.isReprint === true &&
  htmlReprint.includes('RC-7700') &&
  htmlReprint.includes('Marta Haile') &&
  htmlReprint.includes('Dawit Registrar')
) {
  console.log('  ✅ PASS: Reprint data & HTML generated flawlessly');
} else {
  console.error('  ❌ FAIL: Reprint generation failed');
  process.exit(1);
}

console.log('\n=== ALL POS80 THERMAL RECEIPT TESTS PASSED SUCCESSFULLY ===');
