import mongoose from 'mongoose';

const radiologyCaseSchema = new mongoose.Schema({
  caseNumber: { type: String, unique: true, required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  laboratoryTest: { type: mongoose.Schema.Types.ObjectId, ref: 'LaboratoryTest' },
  examinationType: {
    type: String,
    enum: ['CT Scan', 'X-Ray', 'Ultrasound'],
    required: true
  },
  ultrasoundSubtype: {
    type: String,
    enum: ['Abdominal', 'MSS', 'Doppler', 'Echo', 'Other', ''],
    default: ''
  },
  customExaminationName: {
    type: String,
    trim: true,
    default: ''
  },
  price: { type: Number, required: true, min: 0 },
  
  status: {
    type: String,
    enum: ['Queued', 'In Progress', 'Approved', 'Ready for Printing'],
    default: 'Queued',
    index: true
  },
  
  reportType: {
    type: String,
    enum: ['Option A', 'Option B', 'Option C'],
    default: 'Option A'
  },
  // Option A — Rich copy/paste content (HTML string with formatting, images, tables)
  reportContent: { type: String, default: '' },
  
  // Option B — Professional structured report fields
  structuredReport: {
    examination: { type: String, default: '' },
    clinicalInformation: { type: String, default: '' },
    technique: { type: String, default: '' },
    liver: { type: String, default: '' },
    gallbladder: { type: String, default: '' },
    biliarySystem: { type: String, default: '' },
    pancreas: { type: String, default: '' },
    spleen: { type: String, default: '' },
    kidneys: { type: String, default: '' },
    urinaryBladder: { type: String, default: '' },
    otherFindings: { type: String, default: '' },
    findings: { type: String, default: '' },
    impression: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    radiologistNotes: { type: String, default: '' }
  },

  // Option C — Standardized Clinical Template Library fields
  templateReport: {
    category: { type: String, default: '' },
    templateKey: { type: String, default: '' },
    examination: { type: String, default: '' },
    clinicalInformation: { type: String, default: '' },
    technique: { type: String, default: '' },
    comparison: { type: String, default: '' },
    findings: { type: String, default: '' },
    impression: { type: String, default: '' },
    recommendation: { type: String, default: '' }
  },
  
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  radiologist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverRole: { type: String, default: 'Radiologist' },
  approvedAt: { type: Date, default: null },
  
  showFooter: { type: Boolean, default: true },
  branchName: { type: String, enum: ['Main', 'Otona'], default: 'Main', required: true, index: true },

  // Clear / Restore Queue state
  isCleared: { type: Boolean, default: false, index: true },
  clearedAt: { type: Date, default: null },
  clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
  versionKey: false
});

radiologyCaseSchema.index({ branchName: 1, status: 1, createdDate: -1 });
radiologyCaseSchema.index({ registeredBy: 1, status: 1 });
radiologyCaseSchema.index({ isCleared: 1, createdDate: -1 });
radiologyCaseSchema.index({ isCleared: 1, clearedAt: -1 });

export default mongoose.model('RadiologyCase', radiologyCaseSchema);
