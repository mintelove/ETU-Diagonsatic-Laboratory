/**
 * ETU Diagnostic Laboratory — Option C Standardized Clinical Pathology Templates
 * Standardized reporting templates for Biopsy/Histopathology, FNAC, and Blood Film Morphology.
 */

export const PATHOLOGY_TEMPLATES = {
  "Pathology": [
    {
      "key": "biopsy_histopathology",
      "name": "Biopsy & Histopathology Report",
      "category": "Pathology",
      "examination": "BIOPSY AND HISTOPATHOLOGY EXAMINATION",
      "clinicalInformation": "Surgical tissue biopsy, rule out malignancy / inflammatory pathology.",
      "technique": "Routine tissue processing, paraffin embedding, sectioning at 4-5 microns, and Hematoxylin & Eosin (H&E) staining.",
      "comparison": "No previous biopsy on record.",
      "findings": "GROSS DESCRIPTION:\nReceived in 10% neutral buffered formalin labeled with patient identifiers.\nThe specimen consists of [specimen description, dimensions in cm, weight, color, consistency].\nEntire tissue submitted in [number] cassette(s).\n\nMICROSCOPIC EXAMINATION:\nSections demonstrate [histological description of tissue architecture, epithelium, stroma, cellular composition].\nNo cellular atypia, nuclear pleomorphism, abnormal mitoses, or invasive malignancy identified.\nSurgical resection margins are clear. No evidence of lymphovascular or perineural invasion.",
      "impression": "Histopathological findings consistent with [benign / inflammatory / specific diagnosis]. No evidence of malignancy in the examined sections.",
      "recommendation": "Clinical and radiological correlation advised.",
      "id": "biopsy_histopathology"
    },
    {
      "key": "fnac_cytopathology",
      "name": "Fine Needle Aspiration Cytology (FNAC)",
      "category": "Pathology",
      "examination": "FINE NEEDLE ASPIRATION CYTOLOGY (FNAC)",
      "clinicalInformation": "Palpable nodule / swelling, aspiration evaluation.",
      "technique": "Aspiration performed using a 22/23-gauge needle under sterile conditions. Smears fixed in 95% ethanol and air-dried; stained with Papanicolaou and Giemsa stains.",
      "comparison": "None available.",
      "findings": "GROSS / ASPIRATION DESCRIPTION:\n[Number] passes performed. Obtained [scanty / moderate / copious] [bloody / colloid / serous] aspirate.\n\nMICROSCOPIC CYTOLOGICAL FINDINGS:\nSmears reveal adequate cellularity comprising [cellular elements, architecture, background material].\nCells display normal nuclear-to-cytoplasmic ratio with uniform, bland chromatin and smooth nuclear contours.\nNo malignant or dysplastic cells identified. Background shows [colloid / mature lymphocytes / histiocytes / proteinaceous debris].",
      "impression": "Cytomorphological features are consistent with [benign cystic / inflammatory / specific lesion]. Negative for malignant cells.",
      "recommendation": "Correlation with clinical presentation and ultrasound imaging. Repeat aspiration or tissue biopsy if clinically indicated.",
      "id": "fnac_cytopathology"
    },
    {
      "key": "peripheral_blood_film",
      "name": "Peripheral Blood Film & Morphology Report",
      "category": "Pathology",
      "examination": "PERIPHERAL BLOOD FILM (PBF) MORPHOLOGY",
      "clinicalInformation": "Anemia, leukocytosis, thrombocytopenia, fever of unknown origin.",
      "technique": "Well-made peripheral blood smear stained with Wright-Giemsa stain and evaluated under oil immersion microscopy (1000x).",
      "comparison": "None available.",
      "findings": "RED BLOOD CELL (RBC) SERIES:\nNormocytic, normochromic red cells with normal central pallor.\nNo significant anisocytosis, poikilocytosis, microcytosis, macrocytosis, or polychromasia.\nNo nucleated RBCs or basophilic stippling.\n\nWHITE BLOOD CELL (WBC) SERIES:\nNormal total leukocyte estimate and distribution.\nNeutrophils show normal segmentation with no toxic granulation, vacuolization, or Döhle bodies.\nLymphocytes and monocytes are normal in morphology without blast cells or atypical lymphocytes.\n\nPLATELETS:\nAdequate in number and morphology on the smear.\nNormal granularity with no giant platelets or abnormal platelet aggregation.\n\nHEMOPARASITES:\nNo malaria parasites, borrelia, or other hemoparasites identified on thorough thick and thin smear examination.",
      "impression": "Normocytic normochromic blood picture with adequate platelets and normal leukocyte morphology. Negative for hemoparasites.",
      "recommendation": "Correlate with complete blood count (CBC) indices.",
      "id": "peripheral_blood_film"
    }
  ]
};

export default PATHOLOGY_TEMPLATES;
