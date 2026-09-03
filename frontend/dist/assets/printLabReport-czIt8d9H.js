import{v as R,w as E,b as M,q as dt}from"./index-B7qoxV_w.js";import{c as nt}from"./flagHelper-OjoKup0l.js";import{f as st,n as S,M as tt}from"./doctorNameHelper-D1tsotDR.js";const e=t=>String(t??"—").replace(/[&<>"']/g,d=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[d]),et=t=>t?new Date(t).toLocaleString():"—";function pt(t,d=""){let n=String(t.flag||"").trim().toUpperCase();return!n&&t.result&&t.referenceValue&&(n=nt(t.result,t.referenceValue,d)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(n)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(n)?"CL":n==="H"||n==="HIGH"?"H":n==="L"||n==="LOW"?"L":n==="N"||n==="NORMAL"?"Normal":"—"}function H(t){if(!t)return"—";if(typeof t=="string"){const o=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(o)){const[g,h,x]=o.slice(0,10).split("-"),N=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(h,10)-1]||h;return`${x.padStart(2,"0")} ${N} ${g}`}}const d=new Date(t);if(isNaN(d.getTime()))return String(t);const n=String(d.getUTCDate?d.getUTCDate():d.getDate()).padStart(2,"0"),w=d.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),l=d.getUTCFullYear?d.getUTCFullYear():d.getFullYear();return`${n} ${w} ${l}`}function lt(t,d,n,w,l){var U,G,O,V,_,Y,q,W,J,X,K,Z;const o=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},g=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((U=t==null?void 0:t.structuredReport)!=null&&U.grossDescription||(G=t==null?void 0:t.structuredReport)!=null&&G.cytologicalFindings||(O=t==null?void 0:t.structuredReport)!=null&&O.rbcMorphology),h=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((V=t==null?void 0:t.structuredReport)!=null&&V.liver||(_=t==null?void 0:t.structuredReport)!=null&&_.findings),x=(t==null?void 0:t.isInternalMedicineForm)===!0||(o==null?void 0:o.examinationFormType)==="Internal Medicine Speciality Examination Form",s=l!==void 0?l:t.showFooter!==void 0?t.showFooter:!0,N=n||dt,D=s&&N?`<img src="${N}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 80px; width: auto; max-width: 100%; display: block; margin: 0 auto 6px; object-fit: contain;" />`:"",T=o.referralHospital?`<div><b>Referral Hospital Name:</b> <span>${e(o.referralHospital)}</span></div><div><b>Referral Hospital Address:</b> <span>${e(w||o.address||"Not recorded")}</span></div>`:"",P=o.systolicBP||o.diastolicBP?`<div><b>Blood Pressure:</b> <span>${e(o.systolicBP||"—")}/${e(o.diastolicBP||"—")} mmHg</span></div>`:"",ot=et(o.collectionDate||o.registrationDate||o.createdDate||t.createdDate),F=et(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let z="",I=x?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",A=e(((Y=t.technician)==null?void 0:Y.fullName)||((q=t.submittedBy)==null?void 0:q.fullName)||(d==null?void 0:d.fullName)||"Clinical Specialist");const it=((W=t.approvedBy)==null?void 0:W.fullName)||((J=t.pathologist)==null?void 0:J.fullName)||((X=t.radiologist)==null?void 0:X.fullName)||((Z=(K=t.internalMedicineReport)==null?void 0:K.declaration)==null?void 0:Z.doctorName)||(["Approved","Ready for Printing"].includes(t.status)?d==null?void 0:d.fullName:"");let j=e(st(it)),L=t.approverRole||(g?"Pathologist":h?"Radiologist":x?"Authorized Medical Doctor":"Approver / Laboratory Technologist");if(x){const r=t.internalMedicineReport||{},i=r.labInvestigations||{},b=r.clinicalExamination||{},m=r.vitalSigns||{},$=r.declaration||{};z=`
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
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">General Appearance</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.generalAppearance||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Respiratory System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.respiratorySystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Cardio-vascular System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.cardiovascularSystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Skin</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.skin||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CNS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.cns||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Psychiatry</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.psychiatry||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Extremities</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.extremities||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Hernia</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.hernia||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Varicose Veins</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.varicoseVeins||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Chest X-Ray</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(b.chestXRay||"Normal")}</strong></td></tr>
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
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.systolicBP||o.systolicBP||"120")} / ${e(m.diastolicBP||o.diastolicBP||"80")} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.pulse||"72 bpm")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.ecg||"Normal")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.earRt||"Normal")} / ${e(m.earLt||"Normal")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.height||"170 cm")} / ${e(m.weight||"65 kg")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(m.visionRt||"6/6")} / ${e(m.visionLt||"6/6")}</strong></td>
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
              "${e($.declarationText||"I hereby declare that all information provided above is true.")}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096;">
              <div><b>Doctor Name:</b> <strong>${e($.doctorName||j||A)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(H($.signatureDate||new Date))}</span></div>
            </div>
          </div>
        </div>
      </div>
    `}else if(g)if(I=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,L="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)z=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const r=t.structuredReport||{};z=`
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
      `}else if(h)if(I=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,L="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)z=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const i=t.structuredReport||{};z=`
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
      `}else{const r=t.results||[],i={},b={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(o==null?void 0:o.laboratoryTests)?o.laboratoryTests:[]).forEach(a=>{var C,v;if(!a||typeof a!="object")return;const f=a.category?typeof a.category=="object"?a.category.name||"":String(a.category):"",c=Array.isArray(a.parameters)&&a.parameters.length>0?typeof a.parameters[0]=="string"?a.parameters[0]:((C=a.parameters[0])==null?void 0:C.name)||((v=a.parameters[0])==null?void 0:v.sampleName):a.name,p=S(f,c||a.name),y=a.subcategory||"";Array.isArray(a.parameters)&&a.parameters.forEach(u=>{const B=typeof u=="string"?u:(u==null?void 0:u.name)||(u==null?void 0:u.sampleName)||"";B&&(i[B]=p,y&&(b[B]=y.toUpperCase()))}),a.name&&(i[a.name]=p,y&&(b[a.name]=y.toUpperCase()))});const $=new Map;r.forEach(a=>{const f=S(a.category||i[a.sampleName],a.sampleName),c=(a.subcategory||b[a.sampleName]||"").toUpperCase();$.has(f)||$.set(f,new Map);const p=$.get(f),y=c||"GENERAL";p.has(y)||p.set(y,[]),p.get(y).push(a)});const Q=Array.from($.entries()).sort(([a],[f])=>{const c=tt.indexOf(a),p=tt.indexOf(f);return c!==-1&&p!==-1?c-p:c!==-1?-1:p!==-1?1:a.localeCompare(f)}),at=Array.isArray(t.testInterpretations)?t.testInterpretations:[],rt=a=>{const f=S(a),c=at.find(p=>S(p.testName)===f);return(c==null?void 0:c.interpretations)||[]};let k="";Q.length>0?Q.forEach(([a,f])=>{k+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(a)}</h4>`,f.forEach((p,y)=>{y!=="GENERAL"&&(k+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(y)}</h5>`);const C=p.map(v=>{const u=pt(v,o.sex);return`<tr><td><b>${e(v.sampleName)}</b>${v.remarks?`<small>${e(v.remarks)}</small>`:""}</td><td>${e(v.result)}</td><td>${e(v.unit)}</td><td>${e(v.referenceValue)}</td><td><b>${e(u)}</b></td></tr>`}).join("");k+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${C}</tbody></table>`});const c=rt(a);c.length>0&&(k+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',c.forEach(p=>{k+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${e(p.title)}:</b> ${e(p.interpretation)}</div>`}),k+="</div>"),k+="</div>"}):k='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',z=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${k}
        ${t.comments?`<p style="margin-top: 10px;"><b>General remarks:</b> ${e(t.comments)}</p>`:""}
      </section>
    `}return`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin-top: ${s?"10mm":"42mm"};
      margin-bottom: ${s?"12mm":"22mm"};
      margin-left: 12mm;
      margin-right: 12mm;
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
      padding-top: ${s?"12mm":"42mm"};
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
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      z-index: 0;
      overflow: hidden;
    }
    .a4-watermark-text {
      font-size: 48pt;
      font-weight: 700;
      color: #075c91;
      opacity: 0.07;
      text-transform: uppercase;
      letter-spacing: 8px;
      transform: rotate(-35deg);
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
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 2.5px solid #087ca8;
      padding-bottom: 8px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header h1 {
      margin: 2px 0 0;
      color: #075c91;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 800;
      line-height: 1.2;
    }
    .header p.sub {
      margin: 3px 0 0;
      font-size: 12px;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.8px;
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
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        padding: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        position: relative !important;
      }
      .a4-watermark-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        z-index: 0 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-watermark-text {
        font-size: 52pt !important;
        font-weight: 700 !important;
        color: #075c91 !important;
        opacity: 0.07 !important;
        text-transform: uppercase !important;
        letter-spacing: 8px !important;
        transform: rotate(-35deg) !important;
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
      <span class="a4-watermark-text">ETU Diagnostic Laboratory</span>
    </div>
    ${s?`
      <header class="header">
        ${D}
        <div>
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${I}</p>
        </div>
      </header>
    `:""}

    <section class="section" style="margin-top: ${x?"6px":s?"8px":"0px"};">
      <h2>${x?"Basic Information":"Patient Information"}</h2>
      ${x?`
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
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(H(o.dateOfBirth||o.dob||o.birthDate||t.dateOfBirth||t.dob||t.birthDate))}</td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Age:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${e(o.age!==void 0&&o.age!==null&&o.age!==""?`${o.age} YRS`:t.age!==void 0&&t.age!==null&&t.age!==""?`${t.age} YRS`:"—")}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport No.:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><code>${e(o.passportNumber||o.passportNo||o.passport_no||t.passportNumber||t.passportNo||t.passport_no||"—")}</code></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport Issue Date:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(H(o.passportIssueDate||o.passportIssue||o.passport_issue_date||t.passportIssueDate||t.passportIssue||t.passport_issue_date))}</td>
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
          <div><b>Registration Date:</b> <span>${e(ot)}</span></div>
          <div><b>Report Date:</b> <span>${e(F)}</span></div>
          <div><b>Branch:</b> <span>📍 ${e(t.branchName||o.branchName||"Main")}</span></div>
          ${P}
          ${T}
        </div>
      `}
    </section>

    ${z}

    ${!x&&s?`
      <section class="section">
        <h2>Authorization & Sign-off</h2>
        <div class="signoff-grid">
          <div>
            <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">Title: Head of ETU Diagnostic Laboratory</div>
            <b>Prepared By:</b> <strong>${A}</strong>
          </div>
          <div><b>Approved By:</b> <strong>${j}</strong> <span style="font-size: 10.5px; color: #64748b;">(${e(L)})</span></div>
          <div><b>Approval Date:</b> <strong>${e(F)}</strong></div>
        </div>
      </section>
    `:""}

    ${s?`
      <footer class="${x?"imed-a4-footer":"footer"}">
        <span>Title: Head of ETU Diagnostic Laboratory &bull; Prepared By: ${A}</span>
        <span class="report-preview-footer-brand">ETU DIAGNOSTIC LABORATORY</span>
      </footer>
    `:""}
  </main>
</body>
</html>`}async function gt(t,d,n,w){let l=null,o=null,g;typeof d=="string"?(l=d,o=n,g=w):typeof d=="boolean"?(g=d,l=R(),o=E()):typeof d=="object"&&d!==null?(o=d,typeof n=="boolean"?(g=n,l=R()):typeof n=="string"?(l=n,g=w):(l=R(),g=w!==void 0?w:typeof n=="boolean"?n:void 0)):(l=R(),o=E(),g=d!==void 0?d:n!==void 0?n:w),l||(l=R()),o||(o=E());const h=typeof t=="string"?t:t==null?void 0:t._id;if(!h)throw new Error("The requested document could not be loaded.");const x=window.open("","_blank","width=980,height=900");if(!x)throw new Error("Print preview was blocked. Please allow pop-ups and try again.");try{let s=typeof t=="object"?t:null,N="",D="";if(!s||!s.patient)try{const T=await M(`/final-reports/${h}`,{token:l});s=T.report,N=T.logoBase64,D=T.referralHospitalAddress}catch{try{s=(await M(`/pathology/cases/${h}`,{token:l})).case}catch{s=(await M(`/radiology/cases/${h}`,{token:l})).case}}x.document.write(lt(s,o,N,D,g)),x.document.close()}catch(s){throw x.close(),new Error(s.message||"The requested document could not be loaded.")}}export{gt as p};
