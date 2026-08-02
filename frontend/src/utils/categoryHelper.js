export const MAIN_CATEGORY_ORDER = [
  'HEMATOLOGY',
  'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
  'COAGULATION TEST',
  'SERUM ELECTROLYTE',
  'HORMONE',
  'SEROLOGY AND IMMUNOHEMATOLOGY',
  'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP',
  'URINALYSIS',
  'BACTERIOLOGY / PARASITOLOGY',
  'SEMEN ANALYSIS',
  'STOOL EXAMINATION',
  'URINE AND BODY FLUID ANALYSIS',
  'REFERRAL'
];

export const CATEGORY_MAP_ALIASES = {
  'SEROLOGY AND IMMUNOHEMATOLOGY': [
    'SEROLOGY AND IMMUNOHEMATOLOGY',
    'SEROLOGY & IMMUNOHEMATOLOGY',
    'SEROLOGY/IMMUNOHEMATOLOGY',
    'SEROLOGY',
    'IMMUNOHEMATOLOGY'
  ],
  'HEMATOLOGY': [
    'HEMATOLOGY',
    'HAEMATOLOGY',
    'CBC',
    'COMPLETE BLOOD COUNT'
  ],
  'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS': [
    'CLINICAL CHEMISTRY AND IMMUNOASSAY TESTS',
    'CLINICAL CHEMISTRY',
    'CHEMISTRY',
    'LIPID PROFILE',
    'RENAL FUNCTION TESTS',
    'LIVER FUNCTION TEST',
    'OTHER CHEMISTRY TESTS'
  ],
  'COAGULATION TEST': [
    'COAGULATION TEST',
    'COAGULATION',
    'COAGULATION TESTS'
  ],
  'SERUM ELECTROLYTE': [
    'SERUM ELECTROLYTE',
    'SERUM ELECTROLYTES',
    'ELECTROLYTES',
    'ELECTROLYTE'
  ],
  'HORMONE': [
    'HORMONE',
    'HORMONES',
    'HORMONAL TESTS'
  ],
  'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP': [
    'BLOOD SUGAR TEST (RBS/FBS) / DIABETIC (DM) CHECKUP',
    'BLOOD SUGAR TEST',
    'BLOOD SUGAR',
    'DIABETIC',
    'DM CHECKUP',
    'RBS/FBS'
  ],
  'URINALYSIS': [
    'URINALYSIS',
    'URINE ANALYSIS'
  ],
  'BACTERIOLOGY / PARASITOLOGY': [
    'BACTERIOLOGY / PARASITOLOGY',
    'BACTERIOLOGY',
    'PARASITOLOGY',
    'MICROBIOLOGY'
  ],
  'SEMEN ANALYSIS': [
    'SEMEN ANALYSIS',
    'SEMEN'
  ],
  'STOOL EXAMINATION': [
    'STOOL EXAMINATION',
    'STOOL EXAM',
    'STOOL'
  ],
  'URINE AND BODY FLUID ANALYSIS': [
    'URINE AND BODY FLUID ANALYSIS',
    'URINE AND BODY FLUID',
    'BODY FLUID',
    'BODY FLUIDS'
  ],
  'REFERRAL': [
    'REFERRAL',
    'REFERRAL TESTS'
  ]
};

export function normalizeCategoryName(rawCategory) {
  if (!rawCategory) return 'OTHER';
  const clean = String(rawCategory).trim().toUpperCase();

  // 1. Check exact match in MAIN_CATEGORY_ORDER
  if (MAIN_CATEGORY_ORDER.includes(clean)) return clean;

  // 2. Check exact match in CATEGORY_MAP_ALIASES
  for (const [mainCat, aliases] of Object.entries(CATEGORY_MAP_ALIASES)) {
    if (aliases.some(alias => alias === clean)) {
      return mainCat;
    }
  }

  // 3. Check if clean starts with or equals alias
  for (const [mainCat, aliases] of Object.entries(CATEGORY_MAP_ALIASES)) {
    if (aliases.some(alias => clean.startsWith(alias) || alias.startsWith(clean))) {
      return mainCat;
    }
  }

  return clean;
}
