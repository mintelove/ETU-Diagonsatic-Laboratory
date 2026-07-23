const p = (sampleName, unit, referenceValue) => ({ sampleName, unit, referenceValue });

export const EQUIPMENT = Object.freeze({
  'Mindray BS-120 Chemistry Analyzer': { type: 'Fully Automated Chemistry Analyzer', manufacturer: 'Mindray', automation: 'Fully automated', icon: '🧪', parameters: [p('Glucose','mmol/L','3.9–7.8'),p('Urea','mmol/L','2.5–7.8'),p('Creatinine','µmol/L','53–115'),p('ALT','U/L','0–41'),p('AST','U/L','0–40'),p('ALP','U/L','44–147'),p('Total Bilirubin','µmol/L','5–21'),p('Direct Bilirubin','µmol/L','0–5'),p('Albumin','g/L','35–50'),p('Total Protein','g/L','60–80'),p('Uric Acid','µmol/L','210–420'),p('Calcium','mmol/L','2.15–2.55'),p('Phosphorus','mmol/L','0.8–1.5'),p('Magnesium','mmol/L','0.70–1.00'),p('CK','U/L','30–200'),p('CK-MB','U/L','0–25'),p('LDH','U/L','140–280'),p('Amylase','U/L','30–110'),p('Lipase','U/L','13–60'),p('HDL Cholesterol','mmol/L','1.0–2.2'),p('LDL Cholesterol','mmol/L','0–3.4'),p('Triglycerides','mmol/L','0–1.7'),p('Total Cholesterol','mmol/L','0–5.2'),p('Iron','µmol/L','11–30'),p('Ferritin','ng/mL','20–250'),p('CRP','mg/L','0–5'),p('HbA1c','%','4.0–5.6'),p('TSH','mIU/L','0.4–4.0'),p('T3','nmol/L','1.2–2.8'),p('T4','pmol/L','12–22'),p('Vitamin D','ng/mL','30–100'),p('Vitamin B12','pg/mL','200–900')] },
  'BC-3000 Plus Hematology Analyzer': { type: 'Hematology Analyzer', manufacturer: 'Mindray', automation: 'Automated', icon: '🩸', parameters: [p('WBC','×10³/µL','4.0–11.0'),p('RBC','×10⁶/µL','4.0–5.9'),p('HGB','g/dL','12–17'),p('HCT','%','36–52'),p('MCV','fL','80–100'),p('MCH','pg','27–33'),p('MCHC','g/dL','32–36'),p('RDW','%','11.5–14.5'),p('PLT','×10³/µL','150–450'),p('MPV','fL','7.5–11.5'),p('PDW','fL','9–17'),p('PCT','%','0.15–0.40'),p('LYM','%','20–45'),p('MID','%','2–12'),p('GRA','%','45–75')] },
  'K-Lite 8 Electrolyte Analyzer': { type: 'Electrolyte Analyzer', manufacturer: 'K-Lite', automation: 'Automated', icon: '⚡', parameters: [p('Na+','mmol/L','135–145'),p('K+','mmol/L','3.5–5.1'),p('Cl-','mmol/L','98–107'),p('Ca++','mmol/L','2.15–2.55')] },
  'Finecare HbA1c Reader': { type: 'HbA1c Immunoassay Reader', manufacturer: 'Wondfo Finecare', automation: 'Automated', icon: '🧬', parameters: [p('HbA1c','%','4.0–5.6'),p('Estimated Average Glucose','mmol/L','4.0–6.3')] },
  'Semi Automatic 2-Part Coagulation Analyzer': { type: 'Coagulation Analyzer', manufacturer: 'Laboratory Equipment', automation: 'Semi-automated', icon: '⏱️', parameters: [p('PT','seconds','11–13.5'),p('APTT','seconds','25–35'),p('INR','','0.8–1.2'),p('Fibrinogen','g/L','2.0–4.0'),p('Bleeding Time','minutes','2–7'),p('Clotting Time','minutes','5–11'),p('D-Dimer','mg/L FEU','0–0.5')] }
});

export const equipmentPayload = () => ({ equipment: Object.keys(EQUIPMENT), equipmentDetails: Object.fromEntries(Object.entries(EQUIPMENT).map(([name, detail]) => [name, { type: detail.type, manufacturer: detail.manufacturer, automation: detail.automation, icon: detail.icon, parameterCount: detail.parameters.length }])), parameters: Object.fromEntries(Object.entries(EQUIPMENT).map(([name, detail]) => [name, detail.parameters])) });

export function calculateFlag(result, referenceValue) {
  const value = Number(String(result ?? '').replace(',', '.'));
  if (!Number.isFinite(value)) return '';
  const range = String(referenceValue ?? '').replace(/,/g, '.');
  const bounds = range.match(/(-?\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (bounds) { const low = Number(bounds[1]), high = Number(bounds[2]); return value < low ? 'L' : value > high ? 'H' : 'N'; }
  const upper = range.match(/^\s*[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return value > Number(upper[1]) ? 'H' : 'N';
  const lower = range.match(/^\s*[>≥]\s*(-?\d+(?:\.\d+)?)/);
  return lower ? (value < Number(lower[1]) ? 'L' : 'N') : '';
}
