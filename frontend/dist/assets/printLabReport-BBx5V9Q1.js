import{v as T,w as E,b as M,q as st}from"./index-gUStOWW0.js";import{c as nt}from"./flagHelper-k-BRFnde.js";import{n as A,M as et}from"./categoryHelper-TmElMUWB.js";const e=t=>String(t??"—").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]),ot=t=>t?new Date(t).toLocaleString():"—";function pt(t,r=""){let s=String(t.flag||"").trim().toUpperCase();return!s&&t.result&&t.referenceValue&&(s=nt(t.result,t.referenceValue,r)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(s)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(s)?"CL":s==="H"||s==="HIGH"?"H":s==="L"||s==="LOW"?"L":s==="N"||s==="NORMAL"?"Normal":"—"}function H(t){if(!t)return"—";if(typeof t=="string"){const o=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(o)){const[g,h,x]=o.slice(0,10).split("-"),N=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(h,10)-1]||h;return`${x.padStart(2,"0")} ${N} ${g}`}}const r=new Date(t);if(isNaN(r.getTime()))return String(t);const s=String(r.getUTCDate?r.getUTCDate():r.getDate()).padStart(2,"0"),w=r.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),l=r.getUTCFullYear?r.getUTCFullYear():r.getFullYear();return`${s} ${w} ${l}`}function lt(t,r,s,w,l){var G,O,V,_,Y,q,W,J,X,K,Z,Q;const o=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},g=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((G=t==null?void 0:t.structuredReport)!=null&&G.grossDescription||(O=t==null?void 0:t.structuredReport)!=null&&O.cytologicalFindings||(V=t==null?void 0:t.structuredReport)!=null&&V.rbcMorphology),h=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((_=t==null?void 0:t.structuredReport)!=null&&_.liver||(Y=t==null?void 0:t.structuredReport)!=null&&Y.findings),x=(t==null?void 0:t.isInternalMedicineForm)===!0||(o==null?void 0:o.examinationFormType)==="Internal Medicine Speciality Examination Form",n=l!==void 0?l:t.showFooter!==void 0?t.showFooter:!0,N=s||st,D=n&&N?`<img src="${N}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 80px; width: auto; max-width: 100%; display: block; margin: 0 auto 6px; object-fit: contain;" />`:"",R=o.referralHospital?`<div><b>Referral Hospital Name:</b> <span>${e(o.referralHospital)}</span></div><div><b>Referral Hospital Address:</b> <span>${e(w||o.address||"Not recorded")}</span></div>`:"",I=o.systolicBP||o.diastolicBP?`<div><b>Blood Pressure:</b> <span>${e(o.systolicBP||"—")}/${e(o.diastolicBP||"—")} mmHg</span></div>`:"",it=ot(o.collectionDate||o.registrationDate||o.createdDate||t.createdDate),F=ot(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let z="",P=x?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",U=e(((q=t.technician)==null?void 0:q.fullName)||((W=t.submittedBy)==null?void 0:W.fullName)||(r==null?void 0:r.fullName)||"Clinical Specialist");const S=((J=t.approvedBy)==null?void 0:J.fullName)||((X=t.pathologist)==null?void 0:X.fullName)||((K=t.radiologist)==null?void 0:K.fullName)||((Q=(Z=t.internalMedicineReport)==null?void 0:Z.declaration)==null?void 0:Q.doctorName)||(["Approved","Ready for Printing"].includes(t.status)?r==null?void 0:r.fullName:"");let j=e(S?S.startsWith("Dr.")?S:`Dr. ${S}`:"Pending Specialist Approval"),B=t.approverRole||(g?"Pathologist":h?"Radiologist":x?"Authorized Medical Doctor":"Approver / Laboratory Technologist");if(x){const d=t.internalMedicineReport||{},i=d.labInvestigations||{},b=d.clinicalExamination||{},m=d.vitalSigns||{},k=d.declaration||{};z=`
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
              <span class="imed-a4-result-value" style="font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: ${(d.examinationResult||"").includes("UNFIT")?"#991b1b":"#166534"};">
                ${e(d.examinationResult||"FIT FOR EMPLOYMENT")}
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
              "${e(k.declarationText||"I hereby declare that all information provided above is true.")}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096;">
              <div><b>Doctor Name:</b> <strong>${e(k.doctorName||j||U)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(H(k.signatureDate||new Date))}</span></div>
            </div>
          </div>
        </div>
      </div>
    `}else if(g)if(P=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,B="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)z=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const d=t.structuredReport||{};z=`
        <section class="section">
          <h2>Structured Pathology Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${d.clinicalHistory?`<div><b style="color: #075c91;">Clinical History:</b><div style="margin-top: 2px;">${e(d.clinicalHistory)}</div></div>`:""}
            ${d.specimen?`<div><b style="color: #075c91;">Specimen / Site:</b><div style="margin-top: 2px;">${e(d.specimen)}</div></div>`:""}
            ${d.grossDescription?`<div><b style="color: #075c91;">Gross Description:</b><div style="margin-top: 2px;">${e(d.grossDescription)}</div></div>`:""}
            ${d.microscopicDescription?`<div><b style="color: #075c91;">Microscopic Findings:</b><div style="margin-top: 2px;">${e(d.microscopicDescription)}</div></div>`:""}
            ${d.cytologicalFindings?`<div><b style="color: #075c91;">Cytological Findings:</b><div style="margin-top: 2px;">${e(d.cytologicalFindings)}</div></div>`:""}
            ${d.rbcMorphology||d.wbcMorphology||d.plateletMorphology?`
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div><b style="color: #075c91; font-size: 11.5px;">RBC Morphology:</b><div style="font-size: 12.5px;">${e(d.rbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">WBC Morphology:</b><div style="font-size: 12.5px;">${e(d.wbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">Platelet Morphology:</b><div style="font-size: 12.5px;">${e(d.plateletMorphology)}</div></div>
              </div>
            `:""}
            ${d.diagnosis?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${e(d.diagnosis)}</div></div>`:""}
            ${d.comments?`<div><b style="color: #075c91;">Comments:</b><div style="margin-top: 2px;">${e(d.comments)}</div></div>`:""}
            ${d.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${e(d.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else if(h)if(P=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,B="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)z=`
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
      `}else{const d=t.results||[],i={},b={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(o==null?void 0:o.laboratoryTests)?o.laboratoryTests:[]).forEach(a=>{var C,v;if(!a||typeof a!="object")return;const f=a.category?typeof a.category=="object"?a.category.name||"":String(a.category):"",c=Array.isArray(a.parameters)&&a.parameters.length>0?typeof a.parameters[0]=="string"?a.parameters[0]:((C=a.parameters[0])==null?void 0:C.name)||((v=a.parameters[0])==null?void 0:v.sampleName):a.name,p=A(f,c||a.name),y=a.subcategory||"";Array.isArray(a.parameters)&&a.parameters.forEach(u=>{const L=typeof u=="string"?u:(u==null?void 0:u.name)||(u==null?void 0:u.sampleName)||"";L&&(i[L]=p,y&&(b[L]=y.toUpperCase()))}),a.name&&(i[a.name]=p,y&&(b[a.name]=y.toUpperCase()))});const k=new Map;d.forEach(a=>{const f=A(a.category||i[a.sampleName],a.sampleName),c=(a.subcategory||b[a.sampleName]||"").toUpperCase();k.has(f)||k.set(f,new Map);const p=k.get(f),y=c||"GENERAL";p.has(y)||p.set(y,[]),p.get(y).push(a)});const tt=Array.from(k.entries()).sort(([a],[f])=>{const c=et.indexOf(a),p=et.indexOf(f);return c!==-1&&p!==-1?c-p:c!==-1?-1:p!==-1?1:a.localeCompare(f)}),dt=Array.isArray(t.testInterpretations)?t.testInterpretations:[],rt=a=>{const f=A(a),c=dt.find(p=>A(p.testName)===f);return(c==null?void 0:c.interpretations)||[]};let $="";tt.length>0?tt.forEach(([a,f])=>{$+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(a)}</h4>`,f.forEach((p,y)=>{y!=="GENERAL"&&($+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(y)}</h5>`);const C=p.map(v=>{const u=pt(v,o.sex);return`<tr><td><b>${e(v.sampleName)}</b>${v.remarks?`<small>${e(v.remarks)}</small>`:""}</td><td>${e(v.result)}</td><td>${e(v.unit)}</td><td>${e(v.referenceValue)}</td><td><b>${e(u)}</b></td></tr>`}).join("");$+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${C}</tbody></table>`});const c=rt(a);c.length>0&&($+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',c.forEach(p=>{$+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${e(p.title)}:</b> ${e(p.interpretation)}</div>`}),$+="</div>"),$+="</div>"}):$='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',z=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${$}
        ${t.comments?`<p style="margin-top: 10px;"><b>General remarks:</b> ${e(t.comments)}</p>`:""}
      </section>
    `}const at=n?`
    <footer class="footer" style="margin-top: 22px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 11px;">
      <span>Prepared & Verified Diagnostically</span>
      <span style="font-weight: 800; color: #075c91; letter-spacing: 0.4px;">ETU DIAGNOSTIC LABORATORY</span>
    </footer>
  `:"";return`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin-top: ${n?"10mm":"42mm"};
      margin-bottom: ${n?"12mm":"22mm"};
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
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding-top: ${n?"12mm":"42mm"};
      padding-bottom: ${n?"14mm":"22mm"};
      padding-left: 14mm;
      padding-right: 14mm;
      background: white;
      box-shadow: 0 4px 25px rgba(0,0,0,0.15);
      border-radius: 2px;
      box-sizing: border-box;
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
        background: #fff !important;
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
        box-shadow: none !important;
        border-radius: 0 !important;
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
    ${n?`
      <header class="header">
        ${D}
        <div>
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${P}</p>
        </div>
      </header>
    `:""}

    <section class="section" style="margin-top: ${x?"6px":n?"8px":"0px"};">
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
          <div><b>Registration Date:</b> <span>${e(it)}</span></div>
          <div><b>Report Date:</b> <span>${e(F)}</span></div>
          <div><b>Branch:</b> <span>📍 ${e(t.branchName||o.branchName||"Main")}</span></div>
          ${I}
          ${R}
        </div>
      `}
    </section>

    ${z}

    ${!x&&n?`
      <section class="section">
        <h2>Authorization & Sign-off</h2>
        <div class="signoff-grid">
          <div><b>Authorized Specialist:</b> <strong>${U}</strong></div>
          <div><b>Approved By:</b> <strong>Dr. ${j}</strong> <span style="font-size: 10.5px; color: #64748b;">(${e(B)})</span></div>
          <div><b>Approval Date:</b> <strong>${e(F)}</strong></div>
        </div>
      </section>
    `:""}

    ${at}
  </main>
</body>
</html>`}async function gt(t,r,s,w){let l=null,o=null,g;typeof r=="string"?(l=r,o=s,g=w):typeof r=="boolean"?(g=r,l=T(),o=E()):typeof r=="object"&&r!==null?(o=r,typeof s=="boolean"?(g=s,l=T()):typeof s=="string"?(l=s,g=w):(l=T(),g=w!==void 0?w:typeof s=="boolean"?s:void 0)):(l=T(),o=E(),g=r!==void 0?r:s!==void 0?s:w),l||(l=T()),o||(o=E());const h=typeof t=="string"?t:t==null?void 0:t._id;if(!h)throw new Error("The requested document could not be loaded.");const x=window.open("","_blank","width=980,height=900");if(!x)throw new Error("Print preview was blocked. Please allow pop-ups and try again.");try{let n=typeof t=="object"?t:null,N="",D="";if(!n||!n.patient)try{const R=await M(`/final-reports/${h}`,{token:l});n=R.report,N=R.logoBase64,D=R.referralHospitalAddress}catch{try{n=(await M(`/pathology/cases/${h}`,{token:l})).case}catch{n=(await M(`/radiology/cases/${h}`,{token:l})).case}}x.document.write(lt(n,o,N,D,g)),x.document.close()}catch(n){throw x.close(),new Error(n.message||"The requested document could not be loaded.")}}export{gt as p};
