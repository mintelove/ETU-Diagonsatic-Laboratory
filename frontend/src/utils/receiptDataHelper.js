/**
 * POS80 Thermal Receipt Data Transformation Utility
 *
 * Implements the single source of truth for POS80 Preview and Print data.
 * Transforms raw ordered/selected tests into structured category groups,
 * recognizing Complete CBC as ONE parent billable item with ONE fixed price,
 * and CBC parameters as non-billable child items (ZERO prices).
 */

import { normalizeCategoryName } from './categoryHelper.js';

// Recognized CBC parameter names/acronyms in the laboratory catalog
const CBC_PARAM_KEYWORDS = [
  'WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT', 'LYM', 'MID', 'GRAN',
  'RDW', 'MPV', 'PDW', 'PCT', 'NEUTROPHIL', 'LYMPHOCYTE', 'MONOCYTE', 'EOSINOPHIL',
  'BASOPHIL', 'WHITE BLOOD', 'RED BLOOD', 'HEMOGLOBIN', 'HEMATOCRIT', 'PLATELET'
];

/**
 * Checks whether a given test belongs to CBC (Complete Blood Count)
 * based on subcategory, category, and test parameter name.
 */
export function isCbcParameter(test, categoryName = '') {
  if (!test) return false;
  const sub = (test.subcategory || '').trim().toUpperCase();
  const name = (test.name || '').trim().toUpperCase();
  const cat = normalizeCategoryName(
    categoryName ||
    (typeof test.category === 'object' ? test.category?.name : test.category) ||
    test.categoryName ||
    ''
  ).toUpperCase();

  // Explicit CBC subcategory
  if (sub === 'CBC') return true;

  // Under HEMATOLOGY category
  if (cat === 'HEMATOLOGY' || /^HEMATO/i.test(cat)) {
    if (sub === 'CBC') return true;
    // Exclude independent non-CBC Hematology tests
    if (['ESR', 'ERYTHROCYTE SEDIMENTATION RATE', 'BLOOD FILM', 'PERIPHERAL MORPHOLOGY', 'RETICULOCYTE COUNT', 'CD4 COUNT'].includes(name)) {
      return false;
    }
    // Check if name matches any CBC parameter pattern
    return CBC_PARAM_KEYWORDS.some(k => name.includes(k));
  }

  // Parameter name check if category is unassigned/other
  if (sub === 'CBC' || name.startsWith('CBC') || name.includes('(CBC)')) return true;
  if (['WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT'].includes(name)) return true;

  return false;
}

/**
 * Prepares and structures POS80 receipt data from patient/order records.
 * Both POS80 Preview and POS80 Print use this exact data representation.
 *
 * @param {Object} patientData - Patient record from DB or live wizard state
 * @param {Object} options - Configuration options (testCategories, cbcGroupPrice, paymentDetails)
 * @returns {Object} Structured receipt data
 */
export function preparePOS80ReceiptData(patientData = {}, options = {}) {
  const {
    testCategories = [],
    cbcGroupPrice = 150,
    paymentDetails = {}
  } = options;

  const isReprint = Boolean(patientData._id);
  const patientName = isReprint ? (patientData.name || 'Walk-in Patient') : (patientData.name || 'Walk-in Patient');
  const patientId = isReprint ? (patientData.patientId || 'TEMP-REG') : (patientData.patientId || 'TEMP-REG');
  const receiptNumber = isReprint ? (patientData.receiptNumber || 'RC-PENDING') : (patientData.receiptNumber || 'RC-PENDING');

  const rawDate = patientData.paymentDate || patientData.registrationDate;
  const validDate = (rawDate && !isNaN(new Date(rawDate).getTime())) ? new Date(rawDate) : new Date();
  const dateStr = validDate.toLocaleDateString();
  const timeStr = validDate.toLocaleTimeString();

  // Extract raw test items
  const rawList = (
    isReprint
      ? (patientData.laboratoryTests?.length ? patientData.laboratoryTests : patientData.sampleTypes)
      : (patientData.samplesSelected || patientData.laboratoryTests || patientData.sampleTypes)
  ) || [];

  // Build a test catalog lookup map for quick resolution
  const catalogMap = new Map();
  testCategories.forEach(cat => {
    (cat.tests || []).forEach(t => {
      if (t._id) catalogMap.set(String(t._id), { ...t, categoryName: cat.name });
      if (t.name) catalogMap.set(t.name.trim().toUpperCase(), { ...t, categoryName: cat.name });
    });
  });

  // Resolve and normalize each selected test item
  const normalizedTests = [];
  rawList.forEach(item => {
    if (!item) return;
    let catalogTest = null;
    if (typeof item === 'string') {
      catalogTest = catalogMap.get(String(item));
    } else {
      catalogTest = catalogMap.get(String(item._id)) || catalogMap.get((item.name || '').trim().toUpperCase());
    }

    const testId = item._id || catalogTest?._id || String(Math.random());
    const name = item.name || catalogTest?.name || 'Laboratory Test';
    const subcategory = item.subcategory || catalogTest?.subcategory || '';
    const rawCat = (
      (typeof item.category === 'object' ? item.category?.name : item.category) ||
      item.categoryName ||
      catalogTest?.categoryName ||
      ''
    );
    const categoryName = normalizeCategoryName(rawCat || 'GENERAL LABORATORY');
    const price = Number(catalogTest?.price ?? item.price ?? 0);

    normalizedTests.push({
      _id: testId,
      name,
      subcategory,
      categoryName,
      price
    });
  });

  // Group normalized tests by Category
  const categoryMap = new Map();
  normalizedTests.forEach(test => {
    const cat = test.categoryName || 'GENERAL LABORATORY';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat).push(test);
  });

  // Build final structured receipt categories and calculate billing
  let computedSubtotal = 0;
  const categories = [];

  categoryMap.forEach((tests, catName) => {
    const isHematology = /^HEMATOLOGY$/i.test(catName);
    const cbcChildren = isHematology ? tests.filter(t => isCbcParameter(t, catName)) : [];
    const nonCbcTests = isHematology ? tests.filter(t => !isCbcParameter(t, catName)) : tests;

    const items = [];

    // CBC Complete Group: One parent billable item + children with NO price
    if (isHematology && cbcChildren.length > 0) {
      const fixedCbcPrice = Number(cbcGroupPrice ?? 150);
      computedSubtotal += fixedCbcPrice;

      items.push({
        isCbcParent: true,
        name: 'CBC — Complete Blood Count',
        price: fixedCbcPrice,
        children: cbcChildren.map(c => ({
          _id: c._id,
          name: c.name,
          included: true
          // NO price property on children!
        }))
      });
    }

    // Standard Non-CBC items (regular billable items)
    nonCbcTests.forEach(test => {
      computedSubtotal += (test.price || 0);
      items.push({
        _id: test._id,
        isCbcParent: false,
        name: test.name,
        price: test.price || 0
      });
    });

    if (items.length > 0) {
      categories.push({
        categoryName: catName,
        items
      });
    }
  });

  // Calculate discount and grand total
  const discountPercent = Number(patientData.discountPercent ?? 0);
  let subtotal = (patientData.subtotal !== undefined && isReprint) ? Number(patientData.subtotal) : computedSubtotal;
  let discountAmount = (patientData.discountAmount !== undefined && isReprint)
    ? Number(patientData.discountAmount)
    : (subtotal * discountPercent / 100);
  let grandTotal = (patientData.grandTotal !== undefined && isReprint)
    ? Number(patientData.grandTotal)
    : (subtotal - discountAmount);

  // If patient has grandTotal directly stored from backend single CBC pricing:
  if (isReprint && patientData.grandTotal !== undefined) {
    grandTotal = Number(patientData.grandTotal);
  }

  const paymentMethod = patientData.paymentMethod || paymentDetails.method || 'Cash';
  const amountReceived = paymentDetails.received !== undefined ? Number(paymentDetails.received) : undefined;
  const changeBalance = paymentDetails.balance !== undefined ? Number(paymentDetails.balance) : undefined;
  const cashier = (
    (typeof patientData.registeredBy === 'object' ? patientData.registeredBy?.fullName : patientData.registeredBy) ||
    paymentDetails.cashier ||
    'Receptionist'
  );

  return {
    receiptNumber,
    patientId,
    patientName,
    dateStr,
    timeStr,
    isReprint,
    registrationType: patientData.registrationType || 'Regular Patient',
    patientCategory: patientData.patientCategory || patientData.serviceType || 'Laboratory Test',
    serviceType: patientData.serviceType || 'Laboratory Test',
    paymentMethod,
    amountReceived,
    changeBalance,
    cashier,
    subtotal,
    discountPercent,
    discountAmount,
    grandTotal,
    categories,
    hasTests: categories.length > 0
  };
}

/**
 * Generates standalone clean HTML for 80mm thermal receipt printing.
 * Includes @page { size: 80mm auto; margin: 0; }, zero browser headers/footers,
 * monospace thermal typography, right-aligned prices, and continuous flow.
 */
export function generateThermalReceiptHtml(receipt) {
  const KES_TO_ETB = n => `${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB`;

  let testsHtml = '';
  if (!receipt.hasTests) {
    testsHtml = '<div style="font-size:9.5px; font-style:italic; color:#444; padding:4px 0;">Counseling Only Service</div>';
  } else {
    receipt.categories.forEach(cat => {
      testsHtml += `
        <div class="pos80-cat-group">
          <div class="pos80-cat-title">${cat.categoryName}</div>
      `;

      cat.items.forEach(item => {
        if (item.isCbcParent) {
          testsHtml += `
            <div class="pos80-cbc-block">
              <div class="pos80-item-row pos80-cbc-main">
                <span class="pos80-item-name">${item.name}</span>
                <span class="pos80-item-price">${KES_TO_ETB(item.price)}</span>
              </div>
              <div class="pos80-cbc-subtests">
                ${item.children.map(child => `
                  <div class="pos80-cbc-subitem">
                    <span class="pos80-check">✓</span>
                    <span class="pos80-subname">${child.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        } else {
          testsHtml += `
            <div class="pos80-item-row">
              <span class="pos80-item-name">${item.name}</span>
              <span class="pos80-item-price">${KES_TO_ETB(item.price)}</span>
            </div>
          `;
        }
      });

      testsHtml += '</div>';
    });
  }

  let discountHtml = '';
  if (receipt.isReprint && receipt.discountPercent > 0) {
    discountHtml = `<div><strong>Discount:</strong> ${receipt.discountPercent}% (${KES_TO_ETB(receipt.discountAmount)})</div>`;
  }

  let paymentDetailsHtml = '';
  if (receipt.amountReceived !== undefined) {
    paymentDetailsHtml += `<div><strong>Amount Received:</strong> ${KES_TO_ETB(receipt.amountReceived)}</div>`;
  }
  if (receipt.changeBalance !== undefined) {
    paymentDetailsHtml += `<div><strong>Change:</strong> ${KES_TO_ETB(receipt.changeBalance)}</div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pos80-container {
      width: 72mm;
      margin: 0 auto;
      padding: 4mm 0 8mm 0;
    }
    .pos80-header {
      text-align: center;
      margin-bottom: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pos80-subtitle {
      font-size: 10px;
      margin-top: 1px;
    }
    .pos80-divider {
      border: none;
      border-top: 1px dashed #000000;
      margin: 5px 0;
    }
    .pos80-info {
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-heading {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 4px 0 3px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-cat-group {
      margin-bottom: 6px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cat-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
      border-bottom: 1px dotted #333333;
      padding-bottom: 1px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-item-name {
      flex: 1;
      padding-right: 6px;
      word-break: break-word;
    }
    .pos80-item-price {
      white-space: nowrap;
      text-align: right;
      font-weight: 600;
    }
    .pos80-cbc-block {
      margin-bottom: 4px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cbc-main {
      font-weight: bold;
      font-size: 10px;
    }
    .pos80-cbc-subtests {
      padding-left: 8px;
      margin-top: 2px;
      margin-bottom: 3px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cbc-subitem {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 9px;
      line-height: 1.35;
      color: #111111;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-check {
      font-weight: bold;
    }
    .pos80-subname {
      word-break: break-word;
    }
    .pos80-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: bold;
      margin-top: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-summary {
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-footer {
      text-align: center;
      font-size: 9px;
      font-style: italic;
      margin-top: 10px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media screen {
      body {
        padding: 10px 0;
        background: #f8fafc;
      }
      .pos80-container {
        background: #ffffff;
        padding: 5mm;
        box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      }
    }
    @media print {
      body {
        background: #ffffff;
      }
      .pos80-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="pos80-container">
    <div class="pos80-header">
      <div class="pos80-title">ETU Diagnostic Lab</div>
      <div class="pos80-subtitle">Official Payment Receipt</div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-info">
      <div><strong>Receipt #:</strong> ${receipt.receiptNumber}</div>
      <div><strong>Patient ID:</strong> ${receipt.patientId}</div>
      <div><strong>Patient:</strong> ${receipt.patientName}</div>
      <div><strong>Date:</strong> ${receipt.dateStr}</div>
      <div><strong>Time:</strong> ${receipt.timeStr}</div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-heading">SELECTED TESTS</div>
    ${testsHtml}
    <hr class="pos80-divider" />

    <div class="pos80-total-row">
      <span>GRAND TOTAL</span>
      <span>${KES_TO_ETB(receipt.grandTotal)}</span>
    </div>

    ${receipt.isReprint ? `
    <div class="pos80-summary" style="margin-top: 4px;">
      <div><strong>Patient Category:</strong> ${receipt.registrationType}</div>
      <div><strong>Service Type:</strong> ${receipt.patientCategory}</div>
      ${discountHtml}
    </div>
    ` : ''}
    <hr class="pos80-divider" />

    <div class="pos80-summary">
      <div><strong>Payment Method:</strong> ${receipt.paymentMethod}</div>
      ${paymentDetailsHtml}
      <div><strong>Cashier:</strong> ${receipt.cashier}</div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-footer">
      Thank you for choosing ETU.<br />
      Professional laboratory diagnostics.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Executes a clean POS80 80mm thermal print without browser headers/footers
 * or artificial A4 dimensions.
 */
export function printPOS80ThermalReceipt(receiptData, options = {}) {
  const receipt = preparePOS80ReceiptData(receiptData, options);
  const html = generateThermalReceiptHtml(receipt);

  // Hidden dedicated print iframe
  let iframe = document.getElementById('pos80-thermal-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pos80-thermal-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-1000';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Iframe print fallback to window.print():', err);
      window.print();
    }
  }, 250);
}
