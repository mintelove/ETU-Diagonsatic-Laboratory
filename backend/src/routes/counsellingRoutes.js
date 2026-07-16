import {Router}from'express';
import PDFDocument from 'pdfkit';
import {requireAuth,allowRoles}from'../middleware/auth.js';
import {ROLES}from'../constants/roles.js';
import CounsellingRecord from '../models/CounsellingRecord.js';
import * as c from'../controllers/collectionController.js';

const router=Router();
const access=[ROLES.ADMIN,ROLES.RECEPTION,ROLES.SAMPLE_COLLECTOR];
const esc=value=>`"${String(value??'').replaceAll('"','""')}"`;
router.use(requireAuth,allowRoles(...access));
router.get('/queue',c.counsellingQueue);
router.get('/history',c.counsellingHistory);
router.put('/:id',allowRoles(ROLES.SAMPLE_COLLECTOR),c.saveCounselling);
router.post('/:id/complete',allowRoles(ROLES.SAMPLE_COLLECTOR),c.completeCounselling);
router.get('/export/:format',async(req,res,next)=>{try{const records=await CounsellingRecord.find({status:'Completed'}).populate('patient','patientId name phone referralHospital').populate('counselledBy','fullName').sort({completedAt:-1});const headers=['Patient ID','Patient','Phone','Referral Hospital','Counseling Date','Counselor','Reason for Visit','Advice Given','Recommended Tests','Follow-up','Status'];const rows=records.map(r=>[r.patient?.patientId,r.patient?.name,r.patient?.phone,r.patient?.referralHospital,r.completedAt?.toLocaleString(),r.counselledBy?.fullName,r.reason,r.adviceGiven,r.recommendedTests,r.followUp,r.status]);if(req.params.format==='csv')return res.attachment('etu-counseling-history.csv').type('text/csv').send([headers,...rows].map(row=>row.map(esc).join(',')).join('\n'));if(req.params.format==='pdf'){res.attachment('etu-counseling-history.pdf');const doc=new PDFDocument({margin:30,size:'A4',layout:'landscape'});doc.pipe(res);doc.fontSize(17).fillColor('#075C91').text('ETU Diagnostic Laboratory');doc.fontSize(11).fillColor('#263238').text('Counseling History');doc.moveDown();doc.fontSize(7).text(headers.join(' | '));rows.forEach(row=>doc.text(row.map(x=>String(x??'')).join(' | ')));return doc.end()}res.status(422).json({message:'Unsupported export format.'})}catch(error){next(error)}});
export default router;
