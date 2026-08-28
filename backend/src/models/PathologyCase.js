import mongoose from 'mongoose';

const pathologyCaseSchema = new mongoose.Schema({
  caseNumber: { type: String, unique: true, required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  laboratoryTest: { type: mongoose.Schema.Types.ObjectId, ref: 'LaboratoryTest' },
  testType: {
    type: String,
    enum: ['Biopsy', 'FNAC', 'Peripheral Morphology'],
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  reportingDeadline: { type: Date, required: true },
  deadlineDays: { type: Number, required: true, default: 1 },
  deadlineNotified: { type: Boolean, default: false },
  
  status: {
    type: String,
    enum: ['Queued', 'In Progress', 'Approved', 'Ready for Printing'],
    default: 'Queued',
    index: true
  },
  
  reportType: {
    type: String,
    enum: ['Option A', 'Option B'],
    default: 'Option A'
  },
  // Option A — Rich copy/paste content (HTML string with formatting, images, tables)
  reportContent: { type: String, default: '' },
  
  // Option B — Professional structured report fields
  structuredReport: {
    clinicalHistory: { type: String, default: '' },
    specimen: { type: String, default: '' },
    procedure: { type: String, default: '' },
    grossDescription: { type: String, default: '' },
    microscopicDescription: { type: String, default: '' },
    cytologicalFindings: { type: String, default: '' },
    rbcMorphology: { type: String, default: '' },
    wbcMorphology: { type: String, default: '' },
    plateletMorphology: { type: String, default: '' },
    peripheralBloodFindings: { type: String, default: '' },
    impression: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    comments: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    pathologistNotes: { type: String, default: '' }
  },
  
  pathologist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverRole: { type: String, default: 'Pathologist' },
  approvedAt: { type: Date, default: null },
  
  showFooter: { type: Boolean, default: true },
  branchName: { type: String, enum: ['Main', 'Otona'], default: 'Main', required: true, index: true }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
  versionKey: false
});

pathologyCaseSchema.index({ branchName: 1, status: 1, createdDate: -1 });
pathologyCaseSchema.index({ reportingDeadline: 1, status: 1 });

export default mongoose.model('PathologyCase', pathologyCaseSchema);
