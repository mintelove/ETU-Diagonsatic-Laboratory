import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import LabReport from '../models/LabReport.js';
import Payment from '../models/Payment.js';
import ReferralHospital from '../models/ReferralHospital.js';
import {AppError} from '../utils/appError.js';
import {recordActivity}from '../services/activityService.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLogoPath = () => {
  const candidates = [
    path.resolve(__dirname, '../picture/logo.jpg'),
    path.resolve(process.cwd(), 'src', 'picture', 'logo.jpg'),
    path.resolve(process.cwd(), 'backend', 'src', 'picture', 'logo.jpg')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

const getLogoBase64 = () => {
  try {
    const p = getLogoPath();
    if (fs.existsSync(p)) {
      return `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (e) {}
  return '';
};

async function get(id){const report=await LabReport.findOne({_id:id,status:{$in:['Approved','Ready for Printing']}}).populate({path:'patient',select:'patientId barcode name age sex phone address referralHospital registrationType laboratoryTests sampleTypes grandTotal paymentMethod receiptNumber paymentDate',populate:[{path:'laboratoryTests',select:'name category',populate:{path:'category',select:'name'}},{path:'sampleTypes',select:'name price'}]}).populate('technician','fullName').populate('approvedBy','fullName').populate('collection','startedAt');if(!report)throw new AppError('Approved report not found.',404);return report;}
export async function document(req,res,next){try{const report=await LabReport.findById(req.params.id).populate({path:'patient',select:'patientId barcode name age sex phone address registrationType referralHospital registrationDate laboratoryTests sampleTypes subtotal grandTotal paymentMethod receiptNumber paymentDate registeredBy collectedBy',populate:[{path:'laboratoryTests',select:'name category',populate:{path:'category',select:'name'}},{path:'sampleTypes',select:'name price'}]}).populate('technician','fullName').populate('submittedBy','fullName').populate('approvedBy','fullName').populate('rejectedBy','fullName').populate('printedBy','fullName');if(!report||!report.patient)throw new AppError('The requested document could not be loaded.',404);const payment=await Payment.findOne({patient:report.patient.id}).populate('receivedBy','fullName').sort({paidAt:-1}).lean();let referralHospitalAddress='';if(report.patient.referralHospital){const refDoc=await ReferralHospital.findOne({name:report.patient.referralHospital}).lean();referralHospitalAddress=refDoc?.address||refDoc?.city||report.patient.address||'';}const logoBase64=getLogoBase64();res.json({report,payment,logoBase64,referralHospitalAddress});}catch(e){next(e)}}
export async function csv(req,res,next){try{const r=await get(req.params.id),p=r.patient,rows=[['ETU Diagnostic Laboratory'],['Patient ID',p.patientId],['Patient Name',p.name],['Referral Hospital',p.referralHospital||''],['Approved By',r.approvedBy?.fullName||''],[],['Parameter','Result','SI Unit','Reference Range','Flag','Remarks'],...r.results.map(x=>[x.sampleName,x.result,x.unit||'',x.referenceValue,x.flag||'',x.remarks||''])];res.attachment(`ETU-${p.patientId}-report.csv`).type('text/csv').send(rows.map(row=>row.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'));await recordActivity(req.user.id,'Exported laboratory report CSV','LabReport',r.id);}catch(e){next(e)}}
export async function pdf(req,res,next){try{const r=await get(req.params.id),p=r.patient;res.attachment(`ETU-${p.patientId}-report.pdf`).type('application/pdf');const d=new PDFDocument({size:'A4',margin:46});d.pipe(res);
const logoFile=getLogoPath();
if(fs.existsSync(logoFile)){
  const logoBuf = fs.readFileSync(logoFile);
  d.image(logoBuf, 87.6, 10, { width: 420, align: 'center' });
  d.fillColor('#075c91').fontSize(22).text('ETU Diagnostic Laboratory', 46, 140, { align: 'center', width: 503 });
} else {
  d.rect(46,42,58,58).fill('#075c91');d.fillColor('#fff').fontSize(20).text('ETU',55,62);d.fillColor('#075c91').fontSize(22).text('ETU Diagnostic Laboratory',116,48);
}
d.moveTo(46,168).lineTo(549,168).stroke('#075c91');
d.fillColor('#1f3640').fontSize(11)
  .text(`Patient Name: ${p.name}`,46,180)
  .text(`Patient ID: ${p.patientId}`,46,198)
  .text(`Age / Sex: ${p.age} / ${p.sex}`,300,180)
  .text(`Phone: ${p.phone||'Not recorded'}`,300,198);

let curY = 222;
if (p.referralHospital) {
  const refDoc = await ReferralHospital.findOne({ name: p.referralHospital }).lean();
  const refAddress = refDoc?.address || refDoc?.city || p.address || 'Not recorded';
  d.text(`Referral Hospital Name: ${p.referralHospital}`, 46, 218)
   .text(`Referral Hospital Address: ${refAddress}`, 300, 218);
  curY = 242;
}

const categoriesMap=new Map();(p.laboratoryTests||[]).forEach(t=>{const catName=t.category?.name||'GENERAL LABORATORY';if(!categoriesMap.has(catName))categoriesMap.set(catName,[]);categoriesMap.get(catName).push(t.name||t);});
d.fontSize(11.5).fillColor('#075c91').text('REQUESTED LABORATORY TEST TYPES',46,curY);curY+=18;
if(categoriesMap.size>0){categoriesMap.forEach((testsList,catName)=>{d.fontSize(10.5).fillColor('#075c91').text(catName.toUpperCase(),46,curY);curY+=15;testsList.forEach(tn=>{d.fontSize(10).fillColor('#1f3640').text(`• ${tn}`,56,curY);curY+=14;});curY+=4;});}else{d.fontSize(10).fillColor('#1f3640').text('• Not recorded',56,curY);curY+=14;}
d.fontSize(11.5).fillColor('#075c91').text('Equipment Used',46,curY);curY+=16;d.fillColor('#1f3640').fontSize(10).text(r.equipment.join(', ') || 'Standard Analyzer',46,curY,{width:500});curY+=24;
let y=curY;d.fillColor('#075c91').rect(46,y,503,24).fill();d.fillColor('#fff').fontSize(10.5).text('Parameter',55,y+6).text('Result',205,y+6).text('SI Unit',285,y+6).text('Reference Range',350,y+6).text('Flag',490,y+6);y+=24;r.results.forEach((x,i)=>{if(y>710){d.addPage();y=55;}if(i%2===0)d.fillColor('#f1f7fa').rect(46,y,503,24).fill();const color=x.flag==='H'?'#c52626':x.flag==='L'?'#896500':x.flag==='N'?'#14733e':'#1f3640';d.fillColor('#1f3640').fontSize(10).text(x.sampleName,55,y+6,{width:145}).text(x.result,205,y+6,{width:75}).text(x.unit||'',285,y+6,{width:60}).text(x.referenceValue,350,y+6,{width:125});d.fillColor(color).fontSize(11).text(x.flag||'',490,y+6);y+=24;});d.fillColor('#1f3640').fontSize(11).text(`Collected by: ${r.technician?.fullName||'Not recorded'}`,46,y+28).text(`Approved by: ${r.approvedBy?.fullName||'Not recorded'}`,46,y+46).text(`Date and time: ${new Date(r.approvedDate||r.updatedDate).toLocaleString()}`,46,y+64);d.fontSize(10).fillColor('#075c91').text('ETU Diagnostic Laboratory',46,788,{align:'center',width:503});d.end();await recordActivity(req.user.id,'Generated laboratory report PDF','LabReport',r.id);}catch(e){next(e)}}
