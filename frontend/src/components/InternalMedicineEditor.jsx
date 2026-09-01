import React, { useState, useEffect, useMemo } from 'react';
import { api, isSilentNetworkError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ModalPortal from './ModalPortal.jsx';
import ReportPreview, { formatMedDate } from './ReportPreview.jsx';

const CLINICAL_OPTIONS = {
  generalAppearance: ['Normal', 'Healthy / NAD', 'Well looking', 'Pallor', 'Custom...'],
  respiratorySystem: ['Normal', 'Clear to auscultation', 'NAD', 'Vesicular breath sounds', 'Wheezing', 'Custom...'],
  cardiovascularSystem: ['Normal', 'S1 S2 heard / Regular', 'NAD', 'Murmur', 'Custom...'],
  skin: ['Normal', 'Clear / Intact', 'NAD', 'No rash / lesion', 'Eczema', 'Custom...'],
  cns: ['Normal', 'Intact / Conscious & Alert', 'NAD', 'Tremor', 'Custom...'],
  psychiatry: ['Normal', 'Stable / Oriented in TPP', 'NAD', 'Anxious', 'Custom...'],
  extremities: ['Normal', 'Intact / No deformity', 'NAD', 'No edema', 'Deformity', 'Custom...'],
  hernia: ['Nil', 'No Hernia', 'Negative', 'Present', 'Custom...'],
  varicoseVeins: ['Nil', 'No Varicose Veins', 'Negative', 'Present', 'Custom...'],
  chestXRay: ['Normal', 'Clear lung fields', 'NAD', 'Cardiomegaly', 'Custom...']
};

const CLINICAL_LABELS = {
  generalAppearance: 'General Appearance',
  respiratorySystem: 'Respiratory System',
  cardiovascularSystem: 'Cardio-vascular System',
  skin: 'Skin',
  cns: 'CNS',
  psychiatry: 'Psychiatry',
  extremities: 'Extremities',
  hernia: 'Hernia',
  varicoseVeins: 'Varicose Veins',
  chestXRay: 'Chest X-Ray'
};

const LAB_OPTIONS = {
  cbc: ['Normal', 'NAD', 'Mild Anemia', 'Leukocytosis', 'Custom...'],
  fbs: ['Normal', '75 mg/dL', '80 mg/dL', '85 mg/dL', '90 mg/dL', '100 mg/dL', '110 mg/dL', 'Elevated', 'Custom...'],
  bloodGroup: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  stool: ['Normal', 'NAD', 'No Ova / Parasite seen', 'Custom...'],
  urine: ['Normal', 'Clear / Nil', 'NAD', 'Custom...'],
  pregnancyTest: ['Negative', 'Positive', 'N/A (Male)'],
  hbsag: ['Negative', 'Non-Reactive', 'Positive'],
  hcv: ['Negative', 'Non-Reactive', 'Positive'],
  hiv12: ['Negative', 'Non-Reactive', 'Positive'],
  vdrl: ['Negative', 'Non-Reactive', 'Positive'],
  lpt: ['Normal', 'Desirable', 'Borderline', 'Custom...'],
  lft: ['Normal', 'Within Normal Limits', 'Elevated ALT', 'Custom...'],
  rft: ['Normal', 'Within Normal Limits', 'Elevated Creatinine', 'Custom...'],
  malaria: ['Negative', 'Not Seen', 'Positive']
};

const LAB_LABELS = {
  cbc: 'CBC',
  fbs: 'FBS',
  bloodGroup: 'Blood Group',
  stool: 'Stool',
  urine: 'Urine',
  pregnancyTest: 'Pregnancy Test',
  hbsag: 'HBsAg',
  hcv: 'HCV',
  hiv12: 'HIV 1 & 2',
  vdrl: 'VDRL',
  lpt: 'LPT',
  lft: 'LFT',
  rft: 'RFT',
  malaria: 'Malaria'
};

export default function InternalMedicineEditor({
  patient: initialPatient,
  report: initialReport,
  onSave,
  onSubmit,
  onCancel,
  isApprover = false
}) {
  const { user, token } = useAuth();
  const [fetchedPatient, setFetchedPatient] = useState(null);

  // Authoritative patient data resolution across props and fetched records
  const patient = useMemo(() => {
    const p1 = initialPatient && typeof initialPatient === 'object' ? initialPatient : {};
    const p2 = initialReport?.patient && typeof initialReport.patient === 'object' ? initialReport.patient : {};
    const p3 = fetchedPatient && typeof fetchedPatient === 'object' ? fetchedPatient : {};
    return {
      ...p1,
      ...p2,
      ...p3
    };
  }, [initialPatient, initialReport?.patient, fetchedPatient]);

  // Fetch full patient data if any of the critical 4 fields are missing
  useEffect(() => {
    const pid = initialPatient?._id || initialPatient?.id || (typeof initialReport?.patient === 'string' ? initialReport.patient : initialReport?.patient?._id);
    if (pid && (!patient?.dateOfBirth || !patient?.passportNumber || !patient?.passportIssueDate || !patient?.jobTitle)) {
      api(`/collection/patients/${pid}/history`, { token })
        .then(res => {
          if (res?.patient) {
            setFetchedPatient(res.patient);
          }
        })
        .catch(() => {});
    }
  }, [initialPatient, initialReport, token, patient?.dateOfBirth, patient?.passportNumber, patient?.passportIssueDate, patient?.jobTitle]);

  // Clinical Examination state
  const [clinicalExam, setClinicalExam] = useState(() => ({
    generalAppearance: 'Normal',
    respiratorySystem: 'Normal',
    cardiovascularSystem: 'Normal',
    skin: 'Normal',
    cns: 'Normal',
    psychiatry: 'Normal',
    extremities: 'Normal',
    hernia: 'Nil',
    varicoseVeins: 'Nil',
    chestXRay: 'Normal',
    ...(initialReport?.internalMedicineReport?.clinicalExamination || {})
  }));

  // Laboratory Investigations state
  const [labInvestigations, setLabInvestigations] = useState(() => ({
    cbc: 'Normal',
    fbs: 'Normal',
    bloodGroup: 'O+',
    stool: 'Normal',
    urine: 'Normal',
    pregnancyTest: (patient?.sex === 'Male' || initialPatient?.sex === 'Male') ? 'N/A (Male)' : 'Negative',
    hbsag: 'Negative',
    hcv: 'Negative',
    hiv12: 'Negative',
    vdrl: 'Negative',
    lpt: 'Normal',
    lft: 'Normal',
    rft: 'Normal',
    malaria: 'Negative',
    ...(initialReport?.internalMedicineReport?.labInvestigations || {})
  }));

  // Vital Signs state
  const [vitalSigns, setVitalSigns] = useState(() => ({
    systolicBP: patient?.systolicBP || initialPatient?.systolicBP || initialReport?.internalMedicineReport?.vitalSigns?.systolicBP || 120,
    diastolicBP: patient?.diastolicBP || initialPatient?.diastolicBP || initialReport?.internalMedicineReport?.vitalSigns?.diastolicBP || 80,
    pulse: initialReport?.internalMedicineReport?.vitalSigns?.pulse || '72',
    ecg: initialReport?.internalMedicineReport?.vitalSigns?.ecg || 'Normal',
    earRt: initialReport?.internalMedicineReport?.vitalSigns?.earRt || 'Normal',
    earLt: initialReport?.internalMedicineReport?.vitalSigns?.earLt || 'Normal',
    height: initialReport?.internalMedicineReport?.vitalSigns?.height || '170',
    weight: initialReport?.internalMedicineReport?.vitalSigns?.weight || '65',
    visionRt: initialReport?.internalMedicineReport?.vitalSigns?.visionRt || '6/6',
    visionLt: initialReport?.internalMedicineReport?.vitalSigns?.visionLt || '6/6'
  }));

  // Result Section state
  const [examinationResult, setExaminationResult] = useState(() =>
    initialReport?.internalMedicineReport?.examinationResult || 'FIT FOR EMPLOYMENT'
  );

  // Declaration state
  const [declaration, setDeclaration] = useState(() => ({
    doctorName: initialReport?.internalMedicineReport?.declaration?.doctorName || user?.fullName || 'Medical Officer',
    signatureDate: initialReport?.internalMedicineReport?.declaration?.signatureDate
      ? new Date(initialReport.internalMedicineReport.declaration.signatureDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    declarationText: initialReport?.internalMedicineReport?.declaration?.declarationText || 'I hereby declare that all information provided above is true.'
  }));

  const [comments, setComments] = useState(initialReport?.comments || '');
  const [customClinical, setCustomClinical] = useState({});
  const [customLab, setCustomLab] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-set pregnancy test if male
  useEffect(() => {
    if (patient?.sex === 'Male' && (!initialReport?.internalMedicineReport?.labInvestigations?.pregnancyTest || labInvestigations.pregnancyTest === 'Negative')) {
      setLabInvestigations(prev => ({ ...prev, pregnancyTest: 'N/A (Male)' }));
    }
  }, [patient?.sex]);

  const handleClinicalChange = (key, value) => {
    if (value === 'Custom...') {
      setCustomClinical(prev => ({ ...prev, [key]: true }));
      setClinicalExam(prev => ({ ...prev, [key]: '' }));
    } else {
      setCustomClinical(prev => ({ ...prev, [key]: false }));
      setClinicalExam(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleLabChange = (key, value) => {
    if (value === 'Custom...') {
      setCustomLab(prev => ({ ...prev, [key]: true }));
      setLabInvestigations(prev => ({ ...prev, [key]: '' }));
    } else {
      setCustomLab(prev => ({ ...prev, [key]: false }));
      setLabInvestigations(prev => ({ ...prev, [key]: value }));
    }
  };

  const constructPayload = () => {
    const sys = Number(vitalSigns.systolicBP) || 120;
    const dia = Number(vitalSigns.diastolicBP) || 80;
    return {
      isInternalMedicineForm: true,
      internalMedicineReport: {
        labInvestigations,
        clinicalExamination: clinicalExam,
        vitalSigns: {
          systolicBP: sys,
          diastolicBP: dia,
          pulse: String(vitalSigns.pulse || '').replace(/\D/g, '') ? `${String(vitalSigns.pulse).replace(/\D/g, '')} bpm` : (vitalSigns.pulse || '72 bpm'),
          ecg: vitalSigns.ecg || 'Normal',
          earRt: vitalSigns.earRt || 'Normal',
          earLt: vitalSigns.earLt || 'Normal',
          height: String(vitalSigns.height || '').replace(/\D/g, '') ? `${String(vitalSigns.height).replace(/\D/g, '')} cm` : (vitalSigns.height || '170 cm'),
          weight: String(vitalSigns.weight || '').replace(/\D/g, '') ? `${String(vitalSigns.weight).replace(/\D/g, '')} kg` : (vitalSigns.weight || '65 kg'),
          visionRt: vitalSigns.visionRt || '6/6',
          visionLt: vitalSigns.visionLt || '6/6'
        },
        examinationResult: examinationResult.trim() || 'FIT FOR EMPLOYMENT',
        declaration: {
          doctorName: declaration.doctorName.trim() || user?.fullName || 'Medical Officer',
          signatureDate: new Date(declaration.signatureDate || Date.now()),
          declarationText: declaration.declarationText
        }
      },
      comments: comments.trim(),
      systolicBP: sys,
      diastolicBP: dia
    };
  };

  const handleSaveDraft = async () => {
    if (saving || submitting) return;
    setError('');
    setSaving(true);
    try {
      const payload = constructPayload();
      const res = await api(`/collection/patients/${patient._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSuccessMsg('Progress saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (onSave) onSave(res.report);
    } catch (err) {
      if (isSilentNetworkError(err)) return;
      setError(err.message || 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReport = async () => {
    if (saving || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const payload = constructPayload();
      await api(`/collection/patients/${patient._id}/report`, {
        token,
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const res = await api(`/collection/patients/${patient._id}/report/submit`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          systolicBP: Number(vitalSigns.systolicBP) || 120,
          diastolicBP: Number(vitalSigns.diastolicBP) || 80
        })
      });

      setSuccessMsg('Medical examination submitted for approval!');
      if (onSubmit) onSubmit(res.report);
    } catch (err) {
      if (isSilentNetworkError(err)) return;
      setError(err.message || 'Failed to submit examination report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Object representing exact A4 document
  const previewReportObj = useMemo(() => {
    const payload = constructPayload();
    return {
      ...(initialReport || {}),
      patient,
      isInternalMedicineForm: true,
      status: initialReport?.status || 'Draft',
      internalMedicineReport: payload.internalMedicineReport,
      comments,
      technician: user,
      branchName: patient?.branchName || user?.branchName || 'Main'
    };
  }, [initialReport, patient, labInvestigations, clinicalExam, vitalSigns, examinationResult, declaration, comments, user]);

  return (
    <div className="imed-workspace">
      {/* ── Top Header Banner ── */}
      <header className="imed-header-banner">
        <div>
          <h2>🩺 Internal Medicine Speciality Examination Form</h2>
          <p>
            Enter clinical examination findings, laboratory investigations, and vital signs for <strong>{patient?.name}</strong> ({patient?.patientId}).
          </p>
        </div>
        <div className="imed-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPreviewOpen(true)}
            style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.4)' }}
          >
            👁️ Preview Report
          </button>
          {!isApprover && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
                style={{ background: '#fff', color: '#075c91', fontWeight: 700 }}
              >
                {saving ? 'Saving...' : '💾 Save Draft'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSubmitReport}
                disabled={saving || submitting}
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 800 }}
              >
                {submitting ? 'Submitting...' : '📤 Send for Approval'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="alert-box error" style={{ margin: 0 }}>⚠️ {error}</div>}
      {successMsg && <div className="alert-box success" style={{ margin: 0 }}>✅ {successMsg}</div>}

      {/* ── 1. PATIENT INFORMATION (Read-only Summary) ── */}
      <section className="imed-card">
        <div className="imed-card-title">
          <span className="imed-badge-num">1</span>
          <h3>Basic Information</h3>
          <small>Registered by Receptionist</small>
        </div>
        <div className="imed-patient-summary">
          <div className="imed-patient-photo-thumb">
            {patient?.patientPhoto ? (
              <img src={patient.patientPhoto} alt="Patient Photograph" />
            ) : (
              <div className="imed-photo-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: '#64748b', fontSize: '11px', textAlign: 'center', fontWeight: 700, padding: '4px', background: '#f8fafc' }}>
                <span style={{ fontSize: '18px', marginBottom: '2px' }}>📷</span>
                <span>PHOTO</span>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>3 × 4</span>
              </div>
            )}
          </div>
          <div className="imed-patient-grid">
            <div><label>Name:</label><strong>{patient?.name || patient?.patientName || '—'}</strong></div>
            <div><label>Nationality:</label><strong>{patient?.nationality || 'ETHIOPIA'}</strong></div>
            <div><label>Date of Birth:</label><span>{formatMedDate(patient?.dateOfBirth || patient?.dob || patient?.birthDate)}</span></div>
            <div><label>Age:</label><strong>{(patient?.age !== undefined && patient?.age !== null && patient?.age !== '') ? `${patient?.age} YRS` : '—'}</strong></div>
            <div><label>Passport No.:</label><code>{patient?.passportNumber || patient?.passportNo || patient?.passport_no || '—'}</code></div>
            <div><label>Passport Issue Date:</label><span>{formatMedDate(patient?.passportIssueDate || patient?.passportIssue || patient?.passport_issue_date)}</span></div>
            <div><label>Sex:</label><strong>{patient?.sex || '—'}</strong></div>
            <div><label>Marital Status:</label><span>{patient?.maritalStatus || 'Single'}</span></div>
            <div><label>Job Title:</label><span>{patient?.jobTitle || patient?.job || patient?.occupation || '—'}</span></div>
          </div>
        </div>
      </section>

      {/* ── 2 & 3. CLINICAL EXAMINATION & LABORATORY INVESTIGATIONS (2-Column Fast Entry) ── */}
      <div className="imed-two-col-grid">
        {/* ── 2. CLINICAL EXAMINATION ── */}
        <section className="imed-card">
          <div className="imed-card-title">
            <span className="imed-badge-num">2</span>
            <h3>Clinical Examination</h3>
            <small>Default: Normal</small>
          </div>

          <table className="imed-entry-table">
            <tbody>
              {Object.keys(CLINICAL_OPTIONS).map(key => {
                const isCustom = customClinical[key] || !CLINICAL_OPTIONS[key].includes(clinicalExam[key]);
                return (
                  <tr key={key}>
                    <td className="item-label">{CLINICAL_LABELS[key]}</td>
                    <td className="item-control">
                      <div className="imed-quick-select">
                        {isCustom ? (
                          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                            <input
                              type="text"
                              className="imed-text-input"
                              placeholder="Enter observation..."
                              value={clinicalExam[key] || ''}
                              onChange={e => setClinicalExam(prev => ({ ...prev, [key]: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => handleClinicalChange(key, 'Normal')}
                              title="Reset to Normal"
                              style={{ padding: '0 6px', fontSize: '11px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              ↺
                            </button>
                          </div>
                        ) : (
                          <select
                            className="imed-select-box"
                            value={clinicalExam[key] || 'Normal'}
                            onChange={e => handleClinicalChange(key, e.target.value)}
                          >
                            {CLINICAL_OPTIONS[key].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ── 3. LABORATORY INVESTIGATIONS ── */}
        <section className="imed-card">
          <div className="imed-card-title">
            <span className="imed-badge-num">3</span>
            <h3>Laboratory Investigations</h3>
            <small>Fast results selection</small>
          </div>

          <table className="imed-entry-table">
            <tbody>
              {Object.keys(LAB_OPTIONS).map(key => {
                const isCustom = customLab[key] || !LAB_OPTIONS[key].includes(labInvestigations[key]);
                return (
                  <tr key={key}>
                    <td className="item-label">{LAB_LABELS[key]}</td>
                    <td className="item-control">
                      <div className="imed-quick-select">
                        {isCustom ? (
                          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                            <input
                              type="text"
                              className="imed-text-input"
                              placeholder="Enter result..."
                              value={labInvestigations[key] || ''}
                              onChange={e => setLabInvestigations(prev => ({ ...prev, [key]: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => handleLabChange(key, 'Normal')}
                              title="Reset to Normal"
                              style={{ padding: '0 6px', fontSize: '11px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              ↺
                            </button>
                          </div>
                        ) : (
                          <select
                            className="imed-select-box"
                            value={labInvestigations[key] || 'Normal'}
                            onChange={e => handleLabChange(key, e.target.value)}
                          >
                            {LAB_OPTIONS[key].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      {/* ── 4. VITAL SIGNS ── */}
      <section className="imed-card">
        <div className="imed-card-title">
          <span className="imed-badge-num">4</span>
          <h3>Vital Signs</h3>
          <small>Dedicated numerical & sensory entry</small>
        </div>

        <div className="imed-vitals-grid">
          {/* Blood Pressure */}
          <div className="imed-vital-item">
            <label>Blood Pressure (Systolic / Diastolic)</label>
            <div className="imed-vital-inputs">
              <input
                type="number"
                min="50"
                max="300"
                placeholder="120"
                value={vitalSigns.systolicBP || ''}
                onChange={e => setVitalSigns(v => ({ ...v, systolicBP: e.target.value }))}
                style={{ flex: 1, minWidth: '45px', textAlign: 'center' }}
              />
              <span style={{ fontWeight: 800 }}>/</span>
              <input
                type="number"
                min="30"
                max="200"
                placeholder="80"
                value={vitalSigns.diastolicBP || ''}
                onChange={e => setVitalSigns(v => ({ ...v, diastolicBP: e.target.value }))}
                style={{ flex: 1, minWidth: '45px', textAlign: 'center' }}
              />
              <span className="unit">mmHg</span>
            </div>
          </div>

          {/* Pulse */}
          <div className="imed-vital-item">
            <label>Pulse</label>
            <div className="imed-vital-inputs">
              <input
                type="text"
                placeholder="e.g. 72"
                value={String(vitalSigns.pulse || '').replace(/\D/g, '')}
                onChange={e => setVitalSigns(v => ({ ...v, pulse: e.target.value }))}
                style={{ flex: 1, minWidth: '55px' }}
              />
              <span className="unit">bpm</span>
            </div>
          </div>

          {/* ECG */}
          <div className="imed-vital-item">
            <label>ECG (Normal/Abnormal)</label>
            <select
              className="imed-select-box"
              value={vitalSigns.ecg || 'Normal'}
              onChange={e => setVitalSigns(v => ({ ...v, ecg: e.target.value }))}
            >
              <option value="Normal">Normal</option>
              <option value="Normal Sinus Rhythm">Normal Sinus Rhythm</option>
              <option value="Abnormal">Abnormal</option>
              <option value="Borderline">Borderline</option>
            </select>
          </div>

          {/* Ear RT / LT */}
          <div className="imed-vital-item">
            <label>Ear (RT / LT)</label>
            <div className="imed-vital-inputs">
              <input
                type="text"
                placeholder="RT: Normal"
                value={vitalSigns.earRt || ''}
                onChange={e => setVitalSigns(v => ({ ...v, earRt: e.target.value }))}
                style={{ flex: 1, minWidth: '55px' }}
              />
              <input
                type="text"
                placeholder="LT: Normal"
                value={vitalSigns.earLt || ''}
                onChange={e => setVitalSigns(v => ({ ...v, earLt: e.target.value }))}
                style={{ flex: 1, minWidth: '55px' }}
              />
            </div>
          </div>

          {/* Height & Weight */}
          <div className="imed-vital-item">
            <label>Height &amp; Weight</label>
            <div className="imed-vital-inputs">
              <input
                type="number"
                placeholder="170"
                value={String(vitalSigns.height || '').replace(/\D/g, '')}
                onChange={e => setVitalSigns(v => ({ ...v, height: e.target.value }))}
                style={{ flex: 1, minWidth: '45px' }}
              />
              <span className="unit">cm</span>
              <input
                type="number"
                placeholder="65"
                value={String(vitalSigns.weight || '').replace(/\D/g, '')}
                onChange={e => setVitalSigns(v => ({ ...v, weight: e.target.value }))}
                style={{ flex: 1, minWidth: '45px' }}
              />
              <span className="unit">kg</span>
            </div>
          </div>

          {/* Vision RT / LT */}
          <div className="imed-vital-item">
            <label>Vision (RT / LT)</label>
            <div className="imed-vital-inputs">
              <select
                className="imed-select-box"
                value={vitalSigns.visionRt || '6/6'}
                onChange={e => setVitalSigns(v => ({ ...v, visionRt: e.target.value }))}
              >
                {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'Corrected 6/6'].map(vis => (
                  <option key={vis} value={vis}>RT: {vis}</option>
                ))}
              </select>
              <select
                className="imed-select-box"
                value={vitalSigns.visionLt || '6/6'}
                onChange={e => setVitalSigns(v => ({ ...v, visionLt: e.target.value }))}
              >
                {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'Corrected 6/6'].map(vis => (
                  <option key={vis} value={vis}>LT: {vis}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 & 6. RESULT & DECLARATION ── */}
      <div className="imed-two-col-grid">
        {/* ── 5. RESULT ── */}
        <section className="imed-card">
          <div className="imed-card-title">
            <span className="imed-badge-num">5</span>
            <h3>RESULT</h3>
            <small>Final fitness decision</small>
          </div>

          <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
            Fitness Assessment <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="imed-result-buttons">
            {[
              { id: 'FIT FOR EMPLOYMENT', label: 'FIT FOR EMPLOYMENT', cls: 'selected-fit' },
              { id: 'FIT', label: 'FIT', cls: 'selected-fit' },
              { id: 'UNFIT', label: 'UNFIT', cls: 'selected-unfit' },
              { id: 'CONDITIONALLY FIT', label: 'CONDITIONALLY FIT', cls: 'selected-cond' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExaminationResult(item.id)}
                className={`imed-result-btn ${examinationResult === item.id ? item.cls : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Additional Remarks (Optional)
            </label>
            <textarea
              rows="2"
              className="imed-text-input"
              style={{ width: '100%', resize: 'vertical' }}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Any clinical remarks or recommendations..."
            />
          </div>
        </section>

        {/* ── 6. DECLARATION ── */}
        <section className="imed-card">
          <div className="imed-card-title">
            <span className="imed-badge-num">6</span>
            <h3>Declaration</h3>
            <small>Practitioner sign-off</small>
          </div>

          <p className="imed-decl-quote">
            "{declaration.declarationText}"
          </p>

          <div className="imed-decl-grid">
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Doctor Name:</label>
              <input
                type="text"
                className="imed-text-input"
                value={declaration.doctorName}
                onChange={e => setDeclaration(d => ({ ...d, doctorName: e.target.value }))}
                placeholder="Doctor Name"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Date:</label>
              <input
                type="date"
                className="imed-text-input imed-date-input"
                value={declaration.signatureDate}
                onChange={e => setDeclaration(d => ({ ...d, signatureDate: e.target.value }))}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── 7. STICKY / BOTTOM ACTIONS BAR ── */}
      <footer className="imed-bottom-bar">
        {onCancel && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            ← Back to Queue
          </button>
        )}
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPreviewOpen(true)}
            style={{ fontWeight: 700 }}
          >
            👁️ Preview Report
          </button>
          {!isApprover && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
              >
                {saving ? 'Saving...' : '💾 Save Draft'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSubmitReport}
                disabled={saving || submitting}
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 800 }}
              >
                {submitting ? 'Submitting...' : '📤 Send for Approval'}
              </button>
            </>
          )}
        </div>
      </footer>

      {/* ── A4 Preview Modal (100% IDENTICAL to Printed A4 Document) ── */}
      {previewOpen && (
        <ModalPortal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '920px',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: 0,
              background: '#cbd5e1',
              borderRadius: '10px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <header
              className="modal-header"
              style={{
                position: 'sticky',
                top: 0,
                background: '#ffffff',
                zIndex: 20,
                padding: '12px 20px',
                borderBottom: '1.5px solid #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ fontSize: '1.1rem', color: '#075c91', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📄</span> A4 Medical Report Preview (Exact Print Output)
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isApprover && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={submitting}
                    onClick={() => {
                      setPreviewOpen(false);
                      handleSubmitReport();
                    }}
                    style={{ padding: '6px 14px', fontSize: '12px', background: '#10b981', borderColor: '#10b981' }}
                  >
                    Send for Approval →
                  </button>
                )}
                <button className="close-button" onClick={() => setPreviewOpen(false)}>&times;</button>
              </div>
            </header>

            <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', background: '#94a3b8' }}>
              <ReportPreview report={previewReportObj} showFooter={true} />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
