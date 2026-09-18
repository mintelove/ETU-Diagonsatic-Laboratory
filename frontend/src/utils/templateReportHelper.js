/**
 * ETU Diagnostic Laboratory — Option C Standardized Clinical Template Helper
 * Synchronizes template selection, preview rendering, HTML report body generation,
 * and draft/approval persistence for Pathology and Radiology Option C workflows.
 */

import { PATHOLOGY_TEMPLATES } from '../constants/pathologyTemplates.js';
import { RADIOLOGY_TEMPLATES } from '../constants/radiologyTemplates.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Find a Pathology template by key or id
 */
export function findPathologyTemplate(tplKey) {
  if (!tplKey) return null;
  const list = PATHOLOGY_TEMPLATES.Pathology || [];
  return list.find(t => (t.id || t.key) === tplKey) || null;
}

/**
 * Determine default Pathology template based on case examination / test type
 */
export function getDefaultPathologyTemplate(caseObj = {}) {
  const list = PATHOLOGY_TEMPLATES.Pathology || [];
  const text = `${caseObj?.testType || ''} ${caseObj?.customExaminationName || ''} ${caseObj?.laboratoryTest?.name || ''}`.toLowerCase();

  if (text.includes('fnac') || text.includes('cytol') || text.includes('aspiration')) {
    return list.find(t => (t.id || t.key) === 'fnac_cytopathology') || list[1] || list[0];
  }
  if (text.includes('film') || text.includes('morph') || text.includes('blood') || text.includes('pbf') || text.includes('peripheral')) {
    return list.find(t => (t.id || t.key) === 'peripheral_blood_film') || list[2] || list[0];
  }
  // Default to Biopsy & Histopathology
  return list.find(t => (t.id || t.key) === 'biopsy_histopathology') || list[0];
}

/**
 * Find a Radiology template by category and key/id
 */
export function findRadiologyTemplate(category, tplKey) {
  if (!tplKey) return null;
  if (category && RADIOLOGY_TEMPLATES[category]) {
    const found = RADIOLOGY_TEMPLATES[category].find(t => (t.id || t.key) === tplKey);
    if (found) return found;
  }
  for (const list of Object.values(RADIOLOGY_TEMPLATES)) {
    const found = (list || []).find(t => (t.id || t.key) === tplKey);
    if (found) return found;
  }
  return null;
}

/**
 * Determine default Radiology template based on examination type, subtype, and name
 */
export function getDefaultRadiologyTemplate(caseObj = {}, preferredCategory = null) {
  const examType = String(caseObj?.examinationType || '').trim();
  const subType = String(caseObj?.ultrasoundSubtype || '').trim();
  const customName = String(caseObj?.customExaminationName || '').trim();
  const testName = String(caseObj?.laboratoryTest?.name || '').trim();
  const text = `${examType} ${subType} ${customName} ${testName}`.toLowerCase();

  let category = preferredCategory;
  if (!category || !RADIOLOGY_TEMPLATES[category]) {
    if (text.includes('ct') || text.includes('computed tomog')) {
      category = 'CT';
    } else if (text.includes('mri') || text.includes('magnetic reson')) {
      category = 'MRI';
    } else {
      category = 'Ultrasound';
    }
  }

  const list = RADIOLOGY_TEMPLATES[category] || [];

  // Keyword-based specific template matching
  if (category === 'MRI') {
    if (text.includes('spine') || text.includes('lumbar') || text.includes('lumbosacral')) return list.find(t => (t.id || t.key) === 'lumbosacral_spine_mri') || list[0];
    if (text.includes('cervical')) return list.find(t => (t.id || t.key) === 'cervical_spine_mri') || list[0];
    if (text.includes('knee')) return list.find(t => (t.id || t.key) === 'knee_mri') || list[0];
    if (text.includes('shoulder')) return list.find(t => (t.id || t.key) === 'shoulder_mri') || list[0];
    if (text.includes('brain') || text.includes('head')) return list.find(t => (t.id || t.key) === 'brain_mri') || list[0];
    return list.find(t => (t.id || t.key) === 'brain_mri') || list[0];
  }

  if (category === 'CT') {
    if (text.includes('chest') || text.includes('thorax') || text.includes('lung')) return list.find(t => (t.id || t.key) === 'ct_chest') || list[0];
    if (text.includes('abdo') || text.includes('pelvi')) return list.find(t => (t.id || t.key) === 'ct_abdomen_pelvis') || list[0];
    if (text.includes('c-spine') || text.includes('cervical')) return list.find(t => (t.id || t.key) === 'ct_cervical_spine') || list[0];
    if (text.includes('l-spine') || text.includes('lumbar')) return list.find(t => (t.id || t.key) === 'ct_lumbar_spine') || list[0];
    if (text.includes('pns') || text.includes('sinus')) return list.find(t => (t.id || t.key) === 'ct_paranasal_sinuses') || list[0];
    if (text.includes('brain') || text.includes('head')) return list.find(t => (t.id || t.key) === 'ct_brain') || list[0];
    return list.find(t => (t.id || t.key) === 'ct_brain') || list[0];
  }

  // Ultrasound
  if (text.includes('thyroid')) return list.find(t => (t.id || t.key) === 'us_thyroid') || list[0];
  if (text.includes('breast')) return list.find(t => (t.id || t.key) === 'us_breast') || list[0];
  if (text.includes('scrot') || text.includes('testic')) return list.find(t => (t.id || t.key) === 'us_scrotal') || list[0];
  if (text.includes('pelvi') && !text.includes('abdo')) return list.find(t => (t.id || t.key) === 'us_pelvis') || list[0];
  if (text.includes('kUB') || (text.includes('kidney') && text.includes('bladder'))) return list.find(t => (t.id || t.key) === 'us_kub') || list[0];
  if (text.includes('ob') || text.includes('pregnan') || text.includes('fet') || text.includes('gestat')) return list.find(t => (t.id || t.key) === 'us_obstetric_second_third_trimester') || list[0];
  if (text.includes('doppler')) return list.find(t => (t.id || t.key)?.includes('doppler')) || list[0];
  return list.find(t => (t.id || t.key) === 'abdominopelvic_us_male') || list[0];
}

/**
 * Resolve and populate Option C template report with complete defaults and user entered modifications
 */
export function resolveOptionCTemplate(department, caseObj = {}, currentTemplateReport = {}, explicitKey = null) {
  const isRad = String(department).toLowerCase().includes('rad');

  if (isRad) {
    let category = currentTemplateReport?.category;
    let tpl = null;

    if (explicitKey) {
      tpl = findRadiologyTemplate(category, explicitKey);
      if (tpl && tpl.category) category = tpl.category;
    } else if (currentTemplateReport?.templateKey) {
      tpl = findRadiologyTemplate(category, currentTemplateReport.templateKey);
      if (tpl && tpl.category) category = tpl.category;
    }

    if (!tpl) {
      tpl = getDefaultRadiologyTemplate(caseObj, category);
      if (tpl && tpl.category) category = tpl.category;
    }

    if (!tpl) {
      return {
        category: category || 'Ultrasound',
        templateKey: currentTemplateReport?.templateKey || '',
        examination: currentTemplateReport?.examination || '',
        clinicalInformation: currentTemplateReport?.clinicalInformation || '',
        technique: currentTemplateReport?.technique || '',
        comparison: currentTemplateReport?.comparison || '',
        findings: currentTemplateReport?.findings || '',
        impression: currentTemplateReport?.impression || '',
        recommendation: currentTemplateReport?.recommendation || ''
      };
    }

    return {
      category: tpl.category || category || 'Ultrasound',
      templateKey: tpl.id || tpl.key,
      examination: currentTemplateReport?.examination?.trim() ? currentTemplateReport.examination : tpl.examination,
      clinicalInformation: currentTemplateReport?.clinicalInformation !== undefined && currentTemplateReport.clinicalInformation !== ''
        ? currentTemplateReport.clinicalInformation
        : (tpl.clinicalInformation || ''),
      technique: currentTemplateReport?.technique !== undefined && currentTemplateReport.technique !== ''
        ? currentTemplateReport.technique
        : (tpl.technique || ''),
      comparison: currentTemplateReport?.comparison !== undefined && currentTemplateReport.comparison !== ''
        ? currentTemplateReport.comparison
        : (tpl.comparison || ''),
      findings: currentTemplateReport?.findings !== undefined && currentTemplateReport.findings !== ''
        ? currentTemplateReport.findings
        : (tpl.findings || ''),
      impression: currentTemplateReport?.impression !== undefined && currentTemplateReport.impression !== ''
        ? currentTemplateReport.impression
        : (tpl.impression || ''),
      recommendation: currentTemplateReport?.recommendation !== undefined && currentTemplateReport.recommendation !== ''
        ? currentTemplateReport.recommendation
        : (tpl.recommendation || '')
    };
  } else {
    // Pathology
    let tpl = null;
    if (explicitKey) {
      tpl = findPathologyTemplate(explicitKey);
    } else if (currentTemplateReport?.templateKey) {
      tpl = findPathologyTemplate(currentTemplateReport.templateKey);
    }

    if (!tpl) {
      tpl = getDefaultPathologyTemplate(caseObj);
    }

    if (!tpl) {
      return {
        category: 'Pathology',
        templateKey: currentTemplateReport?.templateKey || '',
        examination: currentTemplateReport?.examination || '',
        clinicalInformation: currentTemplateReport?.clinicalInformation || '',
        technique: currentTemplateReport?.technique || '',
        comparison: currentTemplateReport?.comparison || '',
        findings: currentTemplateReport?.findings || '',
        impression: currentTemplateReport?.impression || '',
        recommendation: currentTemplateReport?.recommendation || ''
      };
    }

    return {
      category: 'Pathology',
      templateKey: tpl.id || tpl.key,
      examination: currentTemplateReport?.examination?.trim() ? currentTemplateReport.examination : tpl.examination,
      clinicalInformation: currentTemplateReport?.clinicalInformation !== undefined && currentTemplateReport.clinicalInformation !== ''
        ? currentTemplateReport.clinicalInformation
        : (tpl.clinicalInformation || ''),
      technique: currentTemplateReport?.technique !== undefined && currentTemplateReport.technique !== ''
        ? currentTemplateReport.technique
        : (tpl.technique || ''),
      comparison: currentTemplateReport?.comparison !== undefined && currentTemplateReport.comparison !== ''
        ? currentTemplateReport.comparison
        : (tpl.comparison || ''),
      findings: currentTemplateReport?.findings !== undefined && currentTemplateReport.findings !== ''
        ? currentTemplateReport.findings
        : (tpl.findings || ''),
      impression: currentTemplateReport?.impression !== undefined && currentTemplateReport.impression !== ''
        ? currentTemplateReport.impression
        : (tpl.impression || ''),
      recommendation: currentTemplateReport?.recommendation !== undefined && currentTemplateReport.recommendation !== ''
        ? currentTemplateReport.recommendation
        : (tpl.recommendation || '')
    };
  }
}

/**
 * Render Option C template report into formatted, print-ready HTML body
 * Ensures any viewer reading reportContent displays the complete formatted report body
 */
export function renderOptionCHtml(templateReport, department = 'pathology') {
  if (!templateReport) return '';
  const isRad = String(department).toLowerCase().includes('rad');
  const defaultTitle = isRad ? 'Standardized Medical Imaging Report' : 'Standardized Pathology Examination Report';
  const title = templateReport.examination || defaultTitle;

  let html = `<div class="option-c-report-body" style="font-family: inherit; color: #1e293b;">\n`;
  html += `  <h2 style="font-size: 16px; font-weight: 700; color: #0284c7; margin: 0 0 12px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px;">${escapeHtml(title)}</h2>\n`;
  html += `  <div style="display: flex; flex-direction: column; gap: 10px;">\n`;

  if (templateReport.clinicalInformation) {
    const label = isRad ? 'Clinical Information / Indication:' : 'Clinical Information / History:';
    html += `    <div><b style="color: #0369a1; font-size: 12.5px; text-transform: uppercase;">${label}</b> <div style="white-space: pre-wrap; font-size: 13.5px; margin-top: 2px;">${escapeHtml(templateReport.clinicalInformation)}</div></div>\n`;
  }

  if (templateReport.technique) {
    const label = isRad ? 'Technique / Protocol:' : 'Specimen / Technique:';
    html += `    <div><b style="color: #0369a1; font-size: 12.5px; text-transform: uppercase;">${label}</b> <div style="white-space: pre-wrap; font-size: 13.5px; margin-top: 2px;">${escapeHtml(templateReport.technique)}</div></div>\n`;
  }

  if (templateReport.comparison) {
    html += `    <div><b style="color: #0369a1; font-size: 12.5px; text-transform: uppercase;">Comparison:</b> <div style="white-space: pre-wrap; font-size: 13.5px; margin-top: 2px;">${escapeHtml(templateReport.comparison)}</div></div>\n`;
  }

  if (templateReport.findings) {
    const label = isRad ? 'Findings / Sonographic Observations:' : 'Microscopic & Gross Findings:';
    html += `    <div><b style="color: #0369a1; font-size: 12.5px; text-transform: uppercase;">${label}</b> <div style="white-space: pre-wrap; font-size: 13.5px; line-height: 1.55; margin-top: 2px;">${escapeHtml(templateReport.findings)}</div></div>\n`;
  }

  if (templateReport.impression) {
    const label = isRad ? 'Radiological Impression / Conclusion:' : 'Pathological Diagnosis / Impression:';
    html += `    <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 10px 14px; border-radius: 4px; margin-top: 4px;">\n`;
    html += `      <b style="color: #0369a1; font-size: 12px; text-transform: uppercase;">${label}</b>\n`;
    html += `      <div style="font-weight: 700; font-size: 14px; color: #0f172a; white-space: pre-wrap; margin-top: 4px;">${escapeHtml(templateReport.impression)}</div>\n`;
    html += `    </div>\n`;
  }

  if (templateReport.recommendation) {
    html += `    <div><b style="color: #0369a1; font-size: 12.5px; text-transform: uppercase;">Recommendations:</b> <div style="white-space: pre-wrap; font-size: 13.5px; margin-top: 2px;">${escapeHtml(templateReport.recommendation)}</div></div>\n`;
  }

  html += `  </div>\n`;
  html += `</div>`;
  return html;
}

/**
 * Construct synthetic live report object with complete Option C template synchronization
 */
export function buildOptionCLiveReport(baseCase, department, templateReport, extraProps = {}) {
  const isRad = String(department).toLowerCase().includes('rad');
  const resolvedTpl = resolveOptionCTemplate(department, baseCase, templateReport);
  const htmlContent = renderOptionCHtml(resolvedTpl, department);

  return {
    ...baseCase,
    reportType: 'Option C',
    templateReport: resolvedTpl,
    reportContent: htmlContent,
    ...extraProps
  };
}
