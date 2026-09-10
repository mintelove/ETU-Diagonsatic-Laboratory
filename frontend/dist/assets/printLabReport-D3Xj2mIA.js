import{v as L,w as _,b as G,q as ct}from"./index-DghZSOWW.js";import{c as bt}from"./flagHelper-CVm49PbE.js";import{n as M,M as dt}from"./categoryHelper-DRBJIStQ.js";import{f as xt,l as gt,c as mt}from"./etu_cli-BwHrebo7.js";const e=t=>String(t??"—").replace(/[&<>"']/g,d=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[d]),nt=t=>t?new Date(t).toLocaleString():"—";function ft(t,d=""){let n=String(t.flag||"").trim().toUpperCase();return!n&&t.result&&t.referenceValue&&(n=bt(t.result,t.referenceValue,d)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(n)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(n)?"CL":n==="H"||n==="HIGH"?"H":n==="L"||n==="LOW"?"L":n==="N"||n==="NORMAL"?"Normal":"—"}function O(t){if(!t)return"—";if(typeof t=="string"){const l=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(l)){const[o,f,y]=l.slice(0,10).split("-"),s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(f,10)-1]||f;return`${y.padStart(2,"0")} ${s} ${o}`}}const d=new Date(t);if(isNaN(d.getTime()))return String(t);const n=String(d.getUTCDate?d.getUTCDate():d.getDate()).padStart(2,"0"),x=d.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),w=d.getUTCFullYear?d.getUTCFullYear():d.getFullYear();return`${n} ${x} ${w}`}function yt(t,d,n,x,w,l){var q,W,J,X,K,Z,Q,tt,et,ot,it,at;const o=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},f=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((q=t==null?void 0:t.structuredReport)!=null&&q.grossDescription||(W=t==null?void 0:t.structuredReport)!=null&&W.cytologicalFindings||(J=t==null?void 0:t.structuredReport)!=null&&J.rbcMorphology),y=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((X=t==null?void 0:t.structuredReport)!=null&&X.liver||(K=t==null?void 0:t.structuredReport)!=null&&K.findings),b=(t==null?void 0:t.isInternalMedicineForm)===!0||(o==null?void 0:o.examinationFormType)==="Internal Medicine Speciality Examination Form",s=w!==void 0?w:t.showFooter!==void 0?t.showFooter:!0,P=l!==void 0?l:t==null?void 0:t.stampType,N=P==="lab"?gt:P==="clinic"?mt:null,A=P==="clinic"?"ETU Clinic Stamp":"ETU Lab Stamp",c=N?`<div class="report-stamp-container" style="position: absolute; right: 8px; top: -18px; pointer-events: none; z-index: 2;"><img src="${N}" alt="${A}" style="width: 114px; height: 114px; object-fit: contain; display: block;" /></div>`:"",C=n||ct,z=s&&C?`<img src="${C}" alt="ETU Diagnostic Laboratory Logo" style="width: 100%; height: auto; max-height: none; display: block; margin: 0; padding: 0; object-fit: contain;" />`:"",I=o.referralHospital?`<div><b>Referral Hospital Name:</b> <span>${e(o.referralHospital)}</span></div><div><b>Referral Hospital Address:</b> <span>${e(x||o.address||"Not recorded")}</span></div>`:"",E=o.systolicBP||o.diastolicBP?`<div><b>Blood Pressure:</b> <span>${e(o.systolicBP||"—")}/${e(o.diastolicBP||"—")} mmHg</span></div>`:"",T=nt(o.collectionDate||o.registrationDate||o.createdDate||t.createdDate),V=nt(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let D="",H=b?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",j=e(((Z=t.technician)==null?void 0:Z.fullName)||((Q=t.submittedBy)==null?void 0:Q.fullName)||(d==null?void 0:d.fullName)||"Clinical Specialist");const st=((tt=t.approvedBy)==null?void 0:tt.fullName)||((et=t.pathologist)==null?void 0:et.fullName)||((ot=t.radiologist)==null?void 0:ot.fullName)||((at=(it=t.internalMedicineReport)==null?void 0:it.declaration)==null?void 0:at.doctorName)||(["Approved","Ready for Printing"].includes(t.status)?d==null?void 0:d.fullName:"");let Y=e(xt(st)),F=t.approverRole||(f?"Pathologist":y?"Radiologist":b?"Authorized Medical Doctor":"Approver / Laboratory Technologist");if(b){const r=t.internalMedicineReport||{},i=r.labInvestigations||{},g=r.clinicalExamination||{},u=r.vitalSigns||{},S=r.declaration||{};D=`
      <div style="margin-top: 4px;">
        <!-- 2-Column Tables: Clinical Examination (44%) & Laboratory Investigations (56%) -->
        <div class="imed-a4-two-tables" style="display: grid; grid-template-columns: minmax(0, 44%) minmax(0, 56%); gap: 8px; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <!-- Clinical Examination Table -->
          <div style="min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
            <table class="imed-a4-table-bordered" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
              <thead>
                <tr>
                  <th colspan="2" class="imed-a4-table-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; text-align: center; padding: 3px 4px; border: 1px solid #000;">Clinical Examination</th>
                </tr>
                <tr>
                  <th style="width: 55%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Examination</th>
                  <th style="width: 45%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">General Appearance</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.generalAppearance||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Respiratory System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.respiratorySystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Cardio-vascular System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.cardiovascularSystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Skin</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.skin||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CNS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.cns||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Psychiatry</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.psychiatry||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Extremities</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.extremities||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Hernia</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.hernia||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Varicose Veins</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.varicoseVeins||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Chest X-Ray</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(g.chestXRay||"Normal")}</strong></td></tr>
              </tbody>
            </table>
          </div>

          <!-- Laboratory Investigations Table -->
          <div style="min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
            <table class="imed-a4-table-bordered" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
              <thead>
                <tr>
                  <th colspan="2" class="imed-a4-table-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; text-align: center; padding: 3px 4px; border: 1px solid #000;">Laboratory Investigations</th>
                </tr>
                <tr>
                  <th style="width: 55%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Investigation</th>
                  <th style="width: 45%; background: #f0f4f8; font-weight: 800; padding: 3px 5px; border: 1px solid #000; text-align: left; font-size: 10.5px;">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CBC</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.cbc||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">FBS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.fbs||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Blood Group</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.bloodGroup||"O+")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Stool</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.stool||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Urine</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.urine||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Pregnancy Test</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.pregnancyTest||(o.sex==="Male"||t.sex==="Male"?"N/A":"Negative"))}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HBsAg</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.hbsag||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HCV</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.hcv||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HIV 1 & 2</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.hiv12||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">VDRL</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.vdrl||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LPT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.lpt||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.lft||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">RFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.rft||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Malaria</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(i.malaria||"Negative")}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vital Signs Bordered Box -->
        <div class="imed-a4-vitals-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-vitals-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">Vital Signs</div>
          <table class="imed-a4-vitals-table" style="width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; box-sizing: border-box;">
            <tbody>
              <tr>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Blood Pressure:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.systolicBP||o.systolicBP||"120")} / ${e(u.diastolicBP||o.diastolicBP||"80")} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.pulse||"72 bpm")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.ecg||"Normal")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.earRt||"Normal")} / ${e(u.earLt||"Normal")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.height||"170 cm")} / ${e(u.weight||"65 kg")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(u.visionRt||"6/6")} / ${e(u.visionLt||"6/6")}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Result Bordered Box -->
        <div class="imed-a4-result-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-result-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">RESULT</div>
          <div class="imed-a4-result-body" style="padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
            <div>
              <span style="font-size: 10.5px; color: #0369a1; font-weight: 700; text-transform: uppercase;">FINAL MEDICAL ASSESSMENT: </span>
              <span class="imed-a4-result-value" style="font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: ${(r.examinationResult||"").includes("UNFIT")?"#991b1b":"#166534"};">
                ${e(r.examinationResult||"FIT FOR EMPLOYMENT")}
              </span>
            </div>
            ${t.comments?`
              <div style="font-size: 10.5px; color: #475569;">
                <b>Remarks:</b> ${e(t.comments)}
              </div>
            `:""}
          </div>
        </div>

        <!-- Declaration Bordered Box -->
        <div class="imed-a4-decl-box" style="border: 1.5px solid #000; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div class="imed-a4-decl-header" style="background: #e2e8f0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; padding: 3px 8px; border-bottom: 1px solid #000;">Declaration</div>
          <div class="imed-a4-decl-body" style="padding: 5px 8px; font-size: 10.5px; box-sizing: border-box;">
            <p class="imed-a4-decl-text" style="margin: 0 0 4px 0; font-style: italic; line-height: 1.35;">
              "${e(S.declarationText||"I hereby declare that all information provided above is true.")}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096; position: relative;">
              <div><b>Doctor Name:</b> <strong>${e(S.doctorName||Y||j)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(O(S.signatureDate||new Date))}</span></div>
              ${N?`<div class="report-stamp-container" style="position: absolute; right: 10px; top: -18px; pointer-events: none; z-index: 2;"><img src="${N}" alt="${A}" style="width: 108px; height: 108px; object-fit: contain; display: block;" /></div>`:""}
            </div>
          </div>
        </div>
      </div>
    `}else if(f)if(H=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,F="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)D=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const r=t.structuredReport||{};D=`
        <section class="section">
          <h2>Structured Pathology Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${r.clinicalHistory?`<div><b style="color: #075c91;">Clinical History:</b><div style="margin-top: 2px;">${e(r.clinicalHistory)}</div></div>`:""}
            ${r.specimen?`<div><b style="color: #075c91;">Specimen / Site:</b><div style="margin-top: 2px;">${e(r.specimen)}</div></div>`:""}
            ${r.grossDescription?`<div><b style="color: #075c91;">Gross Description:</b><div style="margin-top: 2px;">${e(r.grossDescription)}</div></div>`:""}
            ${r.microscopicDescription?`<div><b style="color: #075c91;">Microscopic Findings:</b><div style="margin-top: 2px;">${e(r.microscopicDescription)}</div></div>`:""}
            ${r.cytologicalFindings?`<div><b style="color: #075c91;">Cytological Findings:</b><div style="margin-top: 2px;">${e(r.cytologicalFindings)}</div></div>`:""}
            ${r.rbcMorphology||r.wbcMorphology||r.plateletMorphology?`
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div><b style="color: #075c91; font-size: 11.5px;">RBC Morphology:</b><div style="font-size: 12.5px;">${e(r.rbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">WBC Morphology:</b><div style="font-size: 12.5px;">${e(r.wbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">Platelet Morphology:</b><div style="font-size: 12.5px;">${e(r.plateletMorphology)}</div></div>
              </div>
            `:""}
            ${r.diagnosis?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${e(r.diagnosis)}</div></div>`:""}
            ${r.comments?`<div><b style="color: #075c91;">Comments:</b><div style="margin-top: 2px;">${e(r.comments)}</div></div>`:""}
            ${r.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${e(r.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else if(y)if(H=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,F="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)D=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const i=t.structuredReport||{};D=`
        <section class="section">
          <h2>Structured Imaging Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${i.clinicalInformation?`<div><b style="color: #075c91;">Clinical Information / Indications:</b><div style="margin-top: 2px;">${e(i.clinicalInformation)}</div></div>`:""}
            ${i.technique?`<div><b style="color: #075c91;">Technique / Protocol:</b><div style="margin-top: 2px;">${e(i.technique)}</div></div>`:""}
            ${i.liver||i.gallbladder||i.pancreas||i.spleen||i.kidneys||i.urinaryBladder?`
              <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <b style="color: #075c91; font-size: 12px; text-transform: uppercase;">Sonographic Organ Findings:</b>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-top: 6px; font-size: 12.5px;">
                  ${i.liver?`<div><b>Liver:</b> ${e(i.liver)}</div>`:""}
                  ${i.gallbladder?`<div><b>Gallbladder & Biliary:</b> ${e(i.gallbladder)}</div>`:""}
                  ${i.pancreas?`<div><b>Pancreas:</b> ${e(i.pancreas)}</div>`:""}
                  ${i.spleen?`<div><b>Spleen:</b> ${e(i.spleen)}</div>`:""}
                  ${i.kidneys?`<div><b>Kidneys:</b> ${e(i.kidneys)}</div>`:""}
                  ${i.urinaryBladder?`<div><b>Urinary Bladder:</b> ${e(i.urinaryBladder)}</div>`:""}
                </div>
              </div>
            `:""}
            ${i.findings?`<div><b style="color: #075c91;">General Findings:</b><div style="margin-top: 2px;">${e(i.findings)}</div></div>`:""}
            ${i.impression?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Radiological Impression / Conclusion:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${e(i.impression)}</div></div>`:""}
            ${i.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${e(i.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else{const r=t.results||[],i={},g={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(o==null?void 0:o.laboratoryTests)?o.laboratoryTests:[]).forEach(a=>{var B,k;if(!a||typeof a!="object")return;const h=a.category?typeof a.category=="object"?a.category.name||"":String(a.category):"",m=Array.isArray(a.parameters)&&a.parameters.length>0?typeof a.parameters[0]=="string"?a.parameters[0]:((B=a.parameters[0])==null?void 0:B.name)||((k=a.parameters[0])==null?void 0:k.sampleName):a.name,p=M(h,m||a.name),v=a.subcategory||"";Array.isArray(a.parameters)&&a.parameters.forEach($=>{const U=typeof $=="string"?$:($==null?void 0:$.name)||($==null?void 0:$.sampleName)||"";U&&(i[U]=p,v&&(g[U]=v.toUpperCase()))}),a.name&&(i[a.name]=p,v&&(g[a.name]=v.toUpperCase()))});const S=new Map;r.forEach(a=>{const h=M(a.category||i[a.sampleName],a.sampleName),m=(a.subcategory||g[a.sampleName]||"").toUpperCase();S.has(h)||S.set(h,new Map);const p=S.get(h),v=m||"GENERAL";p.has(v)||p.set(v,[]),p.get(v).push(a)});const rt=Array.from(S.entries()).sort(([a],[h])=>{const m=dt.indexOf(a),p=dt.indexOf(h);return m!==-1&&p!==-1?m-p:m!==-1?-1:p!==-1?1:a.localeCompare(h)}),pt=Array.isArray(t.testInterpretations)?t.testInterpretations:[],lt=a=>{const h=M(a),m=pt.find(p=>M(p.testName)===h);return(m==null?void 0:m.interpretations)||[]};let R="";rt.length>0?rt.forEach(([a,h])=>{R+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(a)}</h4>`,h.forEach((p,v)=>{v!=="GENERAL"&&(R+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(v)}</h5>`);const B=p.map(k=>{const $=ft(k,o.sex);return`<tr><td><b>${e(k.sampleName)}</b>${k.remarks?`<small>${e(k.remarks)}</small>`:""}</td><td>${e(k.result)}</td><td>${e(k.unit)}</td><td>${e(k.referenceValue)}</td><td><b>${e($)}</b></td></tr>`}).join("");R+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${B}</tbody></table>`});const m=lt(a);m.length>0&&(R+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',m.forEach(p=>{R+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${e(p.title)}:</b> ${e(p.interpretation)}</div>`}),R+="</div>"),R+="</div>"}):R='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',D=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${R}
        ${t.comments?`<p style="margin-top: 10px;"><b>General remarks:</b> ${e(t.comments)}</p>`:""}
      </section>
    `}return`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <base href="${typeof window<"u"?window.location.origin:""}/">
  <script>
    function triggerAutoPrint() {
      if (window.__hasPrinted) return;
      window.__hasPrinted = true;
      window.focus();
      try {
        window.print();
      } catch (err) {
        console.warn('Auto print error:', err);
      }
    }
    if (document.readyState === 'complete') {
      setTimeout(triggerAutoPrint, 100);
    } else {
      window.addEventListener('load', function() {
        setTimeout(triggerAutoPrint, 100);
      });
    }
  <\/script>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      color: #0f172a;
      font: 13px Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }
    .toolbar {
      padding: 10px;
      text-align: center;
      background: #075c91;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .toolbar button {
      padding: 7px 16px;
      border: 0;
      border-radius: 5px;
      margin: 0 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar .primary {
      background: #0b95b7;
      color: white;
    }
    .page {
      position: relative;
      overflow: hidden;
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding-top: ${s?"0mm":"42mm"};
      padding-bottom: ${s?"14mm":"22mm"};
      padding-left: 14mm;
      padding-right: 14mm;
      background: white;
      box-shadow: 0 4px 25px rgba(0,0,0,0.15);
      border-radius: 2px;
      box-sizing: border-box;
    }
    .a4-watermark-overlay {
      position: absolute;
      top: 44mm;
      bottom: 24mm;
      left: 8mm;
      right: 8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      z-index: 0;
      overflow: hidden;
    }
    .a4-watermark-text {
      font-size: 26pt;
      font-weight: 700;
      color: #075c91;
      opacity: 0.16;
      text-transform: uppercase;
      letter-spacing: 6px;
      transform: rotate(-25deg);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      font-family: 'Georgia', 'Times New Roman', 'Palatino Linotype', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header, .section, .patient, .signoff-grid, .footer, .imed-a4-two-tables, .imed-a4-vitals-box, .imed-a4-result-box, .imed-a4-decl-box {
      position: relative;
      z-index: 1;
    }
    .header {
      display: block;
      width: calc(100% + 28mm);
      max-width: calc(100% + 28mm);
      margin-left: -14mm;
      margin-right: -14mm;
      margin-top: 0;
      margin-bottom: 8px;
      padding: 0;
      border: none;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
    }
    .header img {
      width: 100%;
      height: auto;
      max-height: none;
      display: block;
      margin: 0;
      padding: 0;
      object-fit: contain;
      border-radius: 0;
    }
    .header h1,
    .header p.sub {
      display: none;
    }
    .section {
      margin-top: 10px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .section h2 {
      margin: 0 0 6px;
      padding: 5px 8px;
      background: #e8f5fa;
      color: #075c91;
      border-left: 4px solid #0b95b7;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 800;
      page-break-after: avoid;
      break-after: avoid;
    }
    .patient {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px 16px;
      font-size: 12px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .patient div {
      display: flex;
      gap: 8px;
      align-items: baseline;
    }
    .patient b {
      min-width: 120px;
      color: #475569;
    }
    .patient .patient-name-row {
      grid-column: 1 / -1;
    }
    .patient .patient-name-row strong {
      font-size: 13px;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
    .result-cat-block {
      margin-bottom: 14px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .result-cat-header {
      margin: 0 0 6px 0;
      padding: 5px 10px;
      background: #075c91;
      color: #ffffff;
      border-radius: 4px;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #075c91;
      color: white;
      text-align: left;
      padding: 6px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    td small {
      display: block;
      color: #64748b;
      margin-top: 2px;
      font-size: 10.5px;
    }
    .rich-report-body {
      padding: 10px 12px;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.55;
      color: #0f172a;
      word-break: break-word;
      page-break-inside: auto;
      break-inside: auto;
    }
    .rich-report-body img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 8px auto;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .rich-report-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      page-break-inside: auto;
      break-inside: auto;
    }
    .rich-report-body table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .rich-report-body table th, .rich-report-body table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
    }
    .signoff-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 14px;
      font-size: 11.5px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signoff-grid div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .signoff-grid b {
      color: #475569;
    }
    .signoff-grid strong {
      color: #0f172a;
    }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #64748b;
      font-size: 11px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      body {
        background: transparent !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .toolbar {
        display: none !important;
      }
      .page {
        margin: 0 !important;
        width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        box-sizing: border-box !important;
        padding-top: ${s?"0mm":"42mm"} !important;
        padding-bottom: ${s?"14mm":"22mm"} !important;
        padding-left: 14mm !important;
        padding-right: 14mm !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        position: relative !important;
      }
      .a4-watermark-overlay {
        position: absolute !important;
        top: 44mm !important;
        bottom: 24mm !important;
        left: 8mm !important;
        right: 8mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-around !important;
        align-items: center !important;
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        z-index: 0 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-watermark-text {
        font-size: 26pt !important;
        font-weight: 700 !important;
        color: #075c91 !important;
        opacity: 0.16 !important;
        text-transform: uppercase !important;
        letter-spacing: 6px !important;
        transform: rotate(-25deg) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        user-select: none !important;
        font-family: 'Georgia', 'Times New Roman', 'Palatino Linotype', serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .header, .patient, .signoff-grid, .footer, tr, img {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section, .rich-report-body, table {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      .report-stamp-container {
        pointer-events: none !important;
      }
      .report-stamp-container img {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <nav class="toolbar">
    <button onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print / Export PDF</button>
  </nav>
  <main class="page">
    <div class="a4-watermark-overlay" aria-hidden="true">
      <div class="a4-watermark-text">ETU Diagnostic Laboratory</div>
      <div class="a4-watermark-text">ETU Diagnostic Laboratory</div>
      <div class="a4-watermark-text">ETU Diagnostic Laboratory</div>
    </div>
    ${s?`
      <header class="header">
        ${z}
        <div style="display: none;">
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${H}</p>
        </div>
      </header>
    `:""}

    <section class="section" style="margin-top: ${b?"6px":s?"8px":"0px"};">
      <h2>${b?"Basic Information":"Patient Information"}</h2>
      ${b?`
        <div style="display: flex; gap: 8px; align-items: stretch; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div style="width: 80px; min-width: 80px; max-width: 80px; height: 105px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; background: #fafafa; flex-shrink: 0; overflow: hidden; box-sizing: border-box;">
            ${o.patientPhoto||t.patientPhoto?`
              <img src="${o.patientPhoto||t.patientPhoto}" alt="Patient Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            `:`
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; color: #64748b; font-size: 9px; text-align: center; font-weight: 700; padding: 2px; background: #f8fafc;">
                <span>PHOTO</span>
                <span style="font-size: 8px; opacity: 0.8;">3 × 4</span>
              </div>
            `}
          </div>
          <table class="imed-a4-table-bordered" style="flex: 1; min-width: 0; width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px; box-sizing: border-box;">
            <tbody>
              <tr>
                <td style="width: 18%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Name:</td>
                <td style="width: 32%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase; word-break: keep-all; overflow-wrap: break-word;">${e(o.name||o.patientName||t.name||t.patientName||"—")}</strong></td>
                <td style="width: 18%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Nationality:</td>
                <td style="width: 32%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase;">${e(o.nationality||t.nationality||"ETHIOPIA")}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Date of Birth:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(O(o.dateOfBirth||o.dob||o.birthDate||t.dateOfBirth||t.dob||t.birthDate))}</td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Age:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${e(o.age!==void 0&&o.age!==null&&o.age!==""?`${o.age} YRS`:t.age!==void 0&&t.age!==null&&t.age!==""?`${t.age} YRS`:"—")}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport No.:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><code>${e(o.passportNumber||o.passportNo||o.passport_no||t.passportNumber||t.passportNo||t.passport_no||"—")}</code></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport Issue Date:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(O(o.passportIssueDate||o.passportIssue||o.passport_issue_date||t.passportIssueDate||t.passportIssue||t.passport_issue_date))}</td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Sex:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${e(o.sex||t.sex||"—")}</strong></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Marital Status:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(o.maritalStatus||t.maritalStatus||"Single")}</td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Job Title:</td>
                <td colspan="3" style="border: 1px solid #000; padding: 3px 5px;">${e(o.jobTitle||o.job||o.occupation||t.jobTitle||t.job||t.occupation||"—")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `:`
        <div class="patient">
          <div class="patient-name-row">
            <b>Patient Name:</b>
            <strong>${e(o.name||o.patientName||t.name||t.patientName||"—")}</strong>
          </div>
          <div><b>Patient ID:</b> <span>${e(o.patientId||o.id||"—")}</span></div>
          <div><b>Age / Sex:</b> <span>${e(o.age??t.age??"—")} / ${e(o.sex||t.sex||"—")}</span></div>
          <div><b>Phone:</b> <span>${e(o.phone||t.phone||"—")}</span></div>
          <div><b>Examination Type:</b> <span>${e(t.testType||t.customExaminationName||t.ultrasoundSubtype||t.examinationType||"General Laboratory Investigation")}</span></div>
          <div><b>Registration Date:</b> <span>${e(T)}</span></div>
          <div><b>Report Date:</b> <span>${e(V)}</span></div>
          <div><b>Branch:</b> <span>📍 ${e(t.branchName||o.branchName||"Main")}</span></div>
          ${E}
          ${I}
        </div>
      `}
    </section>

    ${D}

    ${!b&&s?`
      <section class="section">
        <h2>Authorization & Sign-off</h2>
        <div class="signoff-grid" style="position: relative;">
          <div>
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">Title: Head of ETU Diagnostic Laboratory</div>
            <b>Prepared By:</b> <strong>${j}</strong>
          </div>
          <div><b>Approved By:</b> <strong>${Y}</strong> <span style="font-size: 10.5px; color: #64748b;">(${e(F)})</span></div>
          <div><b>Approval Date:</b> <strong>${e(V)}</strong></div>
          ${c}
        </div>
      </section>
    `:!b&&!s&&N?`
      <div class="report-stamp-standalone-container" style="display: flex; justify-content: flex-end; margin-top: 16px; margin-bottom: 8px; padding-right: 12px; position: relative; pointer-events: none; z-index: 2;">
        <img src="${N}" alt="${A}" style="width: 114px; height: 114px; object-fit: contain; display: block;" />
      </div>
    `:""}

    ${s?`
      <footer class="${b?"imed-a4-footer":"footer"}">
        <span>Title: Head of ETU Diagnostic Laboratory &bull; Prepared By: ${j}</span>
        <span class="report-preview-footer-brand">ETU DIAGNOSTIC LABORATORY</span>
      </footer>
    `:""}
  </main>
</body>
</html>`}async function kt(t,d,n,x,w){let l=null,o=null,f,y;typeof d=="string"?(l=d,o=n,f=x,y=w):typeof d=="boolean"?(f=d,l=L(),o=_(),y=typeof n=="string"?n:typeof x=="string"?x:w):typeof d=="object"&&d!==null?(o=d,typeof n=="boolean"?(f=n,l=L(),y=x):typeof n=="string"?(l=n,f=x,y=w):(l=L(),f=x!==void 0?x:typeof n=="boolean"?n:void 0,y=w)):(l=L(),o=_(),f=d!==void 0?d:n!==void 0?n:x,y=typeof n=="string"?n:typeof x=="string"?x:w),l||(l=L()),o||(o=_());const b=typeof t=="string"?t:t==null?void 0:t._id;if(!b)throw new Error("The requested document could not be loaded.");let s=typeof t=="object"?t:null,P="",N="";if(!s||!s.patient)try{const z=await G(`/final-reports/${b}`,{token:l});s=z.report,P=z.logoBase64,N=z.referralHospitalAddress}catch{try{s=(await G(`/pathology/cases/${b}`,{token:l})).case}catch{s=(await G(`/radiology/cases/${b}`,{token:l})).case}}if(!s)throw new Error("The requested document could not be loaded.");const A=yt(s,o,P,N,f,y);let c=document.getElementById("a4-lab-report-print-frame");if(c)try{c.remove()}catch{}c=document.createElement("iframe"),c.id="a4-lab-report-print-frame",c.style.position="fixed",c.style.right="0",c.style.bottom="0",c.style.width="0px",c.style.height="0px",c.style.border="none",document.body.appendChild(c);const C=c.contentWindow.document;return C.open(),C.write(A),C.close(),new Promise(z=>{let I=!1;const E=()=>{if(!I){I=!0;try{const T=c.contentWindow;T&&!T.__hasPrinted&&(T.__hasPrinted=!0,T.focus(),T.print())}catch(T){console.warn("Iframe print error:",T)}z()}};c.onload=()=>setTimeout(E,200),setTimeout(E,600)})}export{kt as p};
