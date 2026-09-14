import{t as E,v as V,b as Y}from"./index-BMf-px9e.js";import{f as mt,l as ft,a as yt,c as ht}from"./etu_cli-Bu2ntN3i.js";import{n as U,M as st}from"./categoryHelper-DRBJIStQ.js";import{l as ut}from"./etu-B4KgRHwb.js";const e=t=>String(t??"—").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]),lt=t=>t?new Date(t).toLocaleString():"—";function vt(t,a=""){let n=String(t.flag||"").trim().toUpperCase();return!n&&t.result&&t.referenceValue&&(n=ht(t.result,t.referenceValue,a)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(n)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(n)?"CL":n==="H"||n==="HIGH"?"H":n==="L"||n==="LOW"?"L":n==="N"||n==="NORMAL"?"Normal":"—"}function W(t){if(!t)return"—";if(typeof t=="string"){const w=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(w)){const[b,o,y]=w.slice(0,10).split("-"),s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(o,10)-1]||o;return`${y.padStart(2,"0")} ${s} ${b}`}}const a=new Date(t);if(isNaN(a.getTime()))return String(t);const n=String(a.getUTCDate?a.getUTCDate():a.getDate()).padStart(2,"0"),c=a.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),f=a.getUTCFullYear?a.getUTCFullYear():a.getFullYear();return`${n} ${c} ${f}`}function wt(t,a,n,c,f,w,b){var X,K,Z,Q,tt,et,ot,it,at,rt,dt;const o=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},y=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((X=t==null?void 0:t.structuredReport)!=null&&X.grossDescription||(K=t==null?void 0:t.structuredReport)!=null&&K.cytologicalFindings||(Z=t==null?void 0:t.structuredReport)!=null&&Z.rbcMorphology),u=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((Q=t==null?void 0:t.structuredReport)!=null&&Q.liver||(tt=t==null?void 0:t.structuredReport)!=null&&tt.findings),s=(t==null?void 0:t.isInternalMedicineForm)===!0||(o==null?void 0:o.examinationFormType)==="Internal Medicine Speciality Examination Form",T=b!==void 0?b:t.showLogo!==void 0?t.showLogo:f!==void 0?f:!0,h=f!==void 0?f:t.showFooter!==void 0?t.showFooter:!0,D=w!==void 0?w:t==null?void 0:t.stampType,P=D==="lab"?ft:D==="clinic"?yt:null,M=D==="clinic"?"ETU Clinic Stamp":"ETU Lab Stamp",x=P?`<div class="report-stamp-container" style="position: absolute; right: 8px; top: -18px; pointer-events: none; z-index: 2;"><img src="${P}" alt="${M}" style="width: 114px; height: 114px; object-fit: contain; display: block;" /></div>`:"",C=n||ut,z=T&&C?`<img src="${C}" alt="ETU Diagnostic Laboratory Logo" style="width: 100%; height: auto; max-height: none; display: block; margin: 0; padding: 0; object-fit: contain;" />`:"",I=o.referralHospital?`<div><b>Referral Hospital Name:</b> <span>${e(o.referralHospital)}</span></div><div><b>Referral Hospital Address:</b> <span>${e(c||o.address||"Not recorded")}</span></div>`:"",F=o.systolicBP||o.diastolicBP?`<div><b>Blood Pressure:</b> <span>${e(o.systolicBP||"—")}/${e(o.diastolicBP||"—")} mmHg</span></div>`:"",R=lt(o.collectionDate||o.registrationDate||o.createdDate||t.createdDate),q=lt(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let B="",O=s?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",_=e(((et=t.technician)==null?void 0:et.fullName)||((ot=t.submittedBy)==null?void 0:ot.fullName)||(a==null?void 0:a.fullName)||"Clinical Specialist");const L=t.approvedBy||(["Approved","Ready for Printing"].includes(t.status)?a:null),pt=(L==null?void 0:L.fullName)||(typeof t.approvedBy=="string"?t.approvedBy:"")||((it=t.pathologist)==null?void 0:it.fullName)||((at=t.radiologist)==null?void 0:at.fullName)||((dt=(rt=t.internalMedicineReport)==null?void 0:rt.declaration)==null?void 0:dt.doctorName)||"",ct=(L==null?void 0:L.role)||t.approverRole||"";let J=e(mt(pt,ct)),G=y?"Pathologist":u?"Radiologist":s?"Authorized Medical Doctor":t.approverRole&&t.approverRole!=="Approver"&&t.approverRole!=="Approver / Laboratory Technologist"?t.approverRole:"head of etu diagnostic laboratory";if(s){const d=t.internalMedicineReport||{},i=d.labInvestigations||{},g=d.clinicalExamination||{},$=d.vitalSigns||{},A=d.declaration||{};B=`
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
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.systolicBP||o.systolicBP||"120")} / ${e($.diastolicBP||o.diastolicBP||"80")} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.pulse||"72 bpm")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.ecg||"Normal")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.earRt||"Normal")} / ${e($.earLt||"Normal")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.height||"170 cm")} / ${e($.weight||"65 kg")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e($.visionRt||"6/6")} / ${e($.visionLt||"6/6")}</strong></td>
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
              "${e(A.declarationText||"I hereby declare that all information provided above is true.")}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096; position: relative;">
              <div><b>Doctor Name:</b> <strong>${e(A.doctorName||J||_)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(W(A.signatureDate||new Date))}</span></div>
              ${P?`<div class="report-stamp-container" style="position: absolute; right: 10px; top: -18px; pointer-events: none; z-index: 2;"><img src="${P}" alt="${M}" style="width: 108px; height: 108px; object-fit: contain; display: block;" /></div>`:""}
            </div>
          </div>
        </div>
      </div>
    `}else if(y)if(O=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,G="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)B=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const d=t.structuredReport||{};B=`
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
      `}else if(u)if(O=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,G="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)B=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const i=t.structuredReport||{};B=`
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
      `}else{const d=t.results||[],i={},g={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(o==null?void 0:o.laboratoryTests)?o.laboratoryTests:[]).forEach(r=>{var H,p;if(!r||typeof r!="object")return;const v=r.category?typeof r.category=="object"?r.category.name||"":String(r.category):"",m=Array.isArray(r.parameters)&&r.parameters.length>0?typeof r.parameters[0]=="string"?r.parameters[0]:((H=r.parameters[0])==null?void 0:H.name)||((p=r.parameters[0])==null?void 0:p.sampleName):r.name,l=U(v,m||r.name),k=r.subcategory||"";Array.isArray(r.parameters)&&r.parameters.forEach(N=>{const j=typeof N=="string"?N:(N==null?void 0:N.name)||(N==null?void 0:N.sampleName)||"";j&&(i[j]=l,k&&(g[j]=k.toUpperCase()))}),r.name&&(i[r.name]=l,k&&(g[r.name]=k.toUpperCase()))});const A=new Map;d.forEach(r=>{const v=U(r.category||i[r.sampleName],r.sampleName),m=(r.subcategory||g[r.sampleName]||"").toUpperCase();A.has(v)||A.set(v,new Map);const l=A.get(v),k=m||"GENERAL";l.has(k)||l.set(k,[]),l.get(k).push(r)});const nt=Array.from(A.entries()).sort(([r],[v])=>{const m=st.indexOf(r),l=st.indexOf(v);return m!==-1&&l!==-1?m-l:m!==-1?-1:l!==-1?1:r.localeCompare(v)}),bt=Array.isArray(t.testInterpretations)?t.testInterpretations:[],xt=r=>{const v=U(r),m=bt.find(l=>U(l.testName)===v);return(m==null?void 0:m.interpretations)||[]};let S="";nt.length>0?nt.forEach(([r,v])=>{S+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(r)}</h4>`,v.forEach((l,k)=>{k!=="GENERAL"&&(S+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(k)}</h5>`);const H=l.map(p=>{const N=vt(p,o.sex),gt=!!(p.isTransferred||p.performedAt&&p.transferredFrom&&p.performedAt!==p.transferredFrom)?` <span style="display: inline-block; margin-left: 5px; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; background: #e0f2fe; color: #0369a1; text-transform: uppercase; letter-spacing: 0.02em; vertical-align: middle;">SENT FROM ${e(p.transferredFrom||"ORIGIN")} • PERFORMED AT ${e(p.performedAt||"DESTINATION")}</span>`:"";return`<tr><td><b>${e(p.sampleName)}</b>${gt}${p.remarks?`<small>${e(p.remarks)}</small>`:""}</td><td>${e(p.result)}</td><td>${e(p.unit)}</td><td>${e(p.referenceValue)}</td><td><b>${e(N)}</b></td></tr>`}).join("");S+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${H}</tbody></table>`});const m=xt(r);m.length>0&&(S+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',m.forEach(l=>{S+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${e(l.title)}:</b> ${e(l.interpretation)}</div>`}),S+="</div>"),S+="</div>"}):S='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',B=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${S}
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
      padding-top: ${h?"0mm":"42mm"};
      padding-bottom: ${h?"14mm":"22mm"};
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
        padding-top: ${T?"0mm":"42mm"} !important;
        padding-bottom: ${h?"14mm":"22mm"} !important;
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
    ${T?`
      <header class="header">
        ${z}
        <div style="display: none;">
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${O}</p>
        </div>
      </header>
    `:""}

    <section class="section" style="margin-top: ${s?"6px":T?"8px":"0px"};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h2 style="margin: 0;">${s?"Basic Information":"Patient Information"}</h2>
        ${t.isCrossBranchTransfer||t.originalBranch&&t.originalBranch!==t.branchName?`
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #0284c7; color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            SENT FROM ${e((t.originalBranch||"Main").toUpperCase())}
          </span>
        `:""}
      </div>
      ${s?`
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
                <td style="width: 18%; font-weight: 800;">Name:</td>
                <td style="width: 32%;"><strong style="text-transform: uppercase; word-break: keep-all; overflow-wrap: break-word;">${e(o.name||o.patientName||t.name||t.patientName||"—")}</strong></td>
                <td style="width: 18%; font-weight: 800;">Nationality:</td>
                <td style="width: 32%;"><strong style="text-transform: uppercase;">${e(o.nationality||t.nationality||"ETHIOPIA")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Date of Birth:</td>
                <td>${e(W(o.dateOfBirth||o.dob||o.birthDate||t.dateOfBirth||t.dob||t.birthDate))}</td>
                <td style="font-weight: 800;">Age:</td>
                <td><strong>${e(o.age!==void 0&&o.age!==null&&o.age!==""?`${o.age} YRS`:t.age!==void 0&&t.age!==null&&t.age!==""?`${t.age} YRS`:"—")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Passport No.:</td>
                <td><code>${e(o.passportNumber||o.passportNo||o.passport_no||t.passportNumber||t.passportNo||t.passport_no||"—")}</code></td>
                <td style="font-weight: 800;">Sex:</td>
                <td><strong>${e(o.sex||t.sex||"—")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Issue Date:</td>
                <td>${e(W(o.passportIssueDate||o.passportIssue||o.passport_issue_date||t.passportIssueDate||t.passportIssue||t.passport_issue_date))}</td>
                <td style="font-weight: 800;">Marital Status:</td>
                <td>${e(o.maritalStatus||t.maritalStatus||"Single")}</td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Job Title:</td>
                <td colspan="3">${e(o.jobTitle||o.job||o.occupation||t.jobTitle||t.job||t.occupation||"—")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `:`
        <div class="patient">
          <div style="grid-column: 1 / -1; display: flex; gap: 8px; align-items: baseline;">
            <b>Patient Name:</b>
            <strong style="text-transform: uppercase; font-size: 13px; word-break: keep-all; overflow-wrap: break-word;">${e(o.name||o.patientName||t.name||t.patientName||"—")}</strong>
          </div>
          <div><b>Patient ID:</b> <span>${e(o.patientId||o.id||"—")}</span></div>
          <div><b>Age / Sex:</b> <span>${e(o.age??t.age??"—")} / ${e(o.sex||t.sex||"—")}</span></div>
          <div><b>Phone:</b> <span>${e(o.phone||t.phone||"—")}</span></div>
          <div><b>Examination Type:</b> <span>${e(t.testType||t.customExaminationName||t.ultrasoundSubtype||t.examinationType||"General Laboratory Investigation")}</span></div>
          <div><b>Registration Date:</b> <span>${e(R)}</span></div>
          <div><b>Report Date:</b> <span>${e(q)}</span></div>
          ${t.isCrossBranchTransfer||t.originalBranch&&t.originalBranch!==t.branchName?`
            <div><b>Original Branch:</b> <span>📍 ${e(t.originalBranch||o.branchName||"Main")}</span></div>
            <div><b>Performed At:</b> <span>🔬 ${e(t.performingBranch||t.branchName||"Otona")}</span></div>
          `:`
            <div><b>Branch:</b> <span>📍 ${e(t.branchName||o.branchName||"Main")}</span></div>
          `}
          ${F}
          ${I}
        </div>
      `}
    </section>

    ${B}

    ${h&&!s?`
      <section class="section" style="margin-top: 14px; position: relative;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; position: relative;">
          <!-- 1. Authorization Section -->
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <h3 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #075c91; font-weight: 800;">
              Authorization
            </h3>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div>
                <span style="color: #475569; font-weight: 600;">Authorized By: </span>
                <strong style="color: #0f172a;">${J}</strong>
              </div>
              <div>
                <span style="color: #475569; font-weight: 600;">Role/Position: </span>
                <strong style="color: #0f172a;">${e(G)}</strong>
              </div>
            </div>
          </div>

          <!-- 2. Sign-Off Section -->
          <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #cbd5e1; position: relative;">
            <h3 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #075c91; font-weight: 800;">
              Sign-Off
            </h3>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div>
                <span style="color: #475569; font-weight: 600;">Prepared/Performed By: </span>
                <strong style="color: #0f172a;">${_}</strong>
              </div>
              <div>
                <span style="color: #475569; font-weight: 600;">Signature: </span>
                <strong style="color: #0284c7;">✓ Verified &amp; Signed</strong>
              </div>
              <div>
                <span style="color: #475569; font-weight: 600;">Date: </span>
                <strong style="color: #0f172a;">${e(q)}</strong>
              </div>
            </div>
            ${x}
          </div>
        </div>
      </section>
    `:""}

    ${h?`
      <footer class="${s?"imed-a4-footer":"footer"}">
        <span>Title: Head of ETU Diagnostic Laboratory &bull; Prepared By: ${_}</span>
        <span class="report-preview-footer-brand">ETU DIAGNOSTIC LABORATORY</span>
      </footer>
    `:""}
  </main>
</body>
</html>`}async function zt(t,a,n,c,f,w){let b=null,o=null,y,u,s;typeof a=="object"&&a!==null&&!a._id&&!a.username&&!a.role&&(a.showLogo!==void 0||a.showFooter!==void 0||a.stampType!==void 0||a.token!==void 0||a.user!==void 0)?(s=a.showLogo,y=a.showFooter,u=a.stampType,b=a.token,o=a.user):typeof a=="string"?(b=a,o=n,y=c,u=f,s=w):typeof a=="boolean"?(y=a,b=E(),o=V(),u=typeof n=="string"?n:typeof c=="string"?c:f,s=typeof n=="boolean"?n:typeof c=="boolean"?c:w):typeof a=="object"&&a!==null?(o=a,typeof n=="boolean"?(y=n,b=E(),u=c,s=f):typeof n=="string"?(b=n,y=c,u=f,s=w):(b=E(),y=c!==void 0?c:typeof n=="boolean"?n:void 0,u=f,s=w)):(b=E(),o=V(),y=a!==void 0?a:n!==void 0?n:c,u=typeof n=="string"?n:typeof c=="string"?c:f,s=w),b||(b=E()),o||(o=V());const T=typeof t=="string"?t:t==null?void 0:t._id;if(!T)throw new Error("The requested document could not be loaded.");let h=typeof t=="object"?t:null,D="",P="";if(!h||!h.patient)try{const z=await Y(`/final-reports/${T}`,{token:b});h=z.report,D=z.logoBase64,P=z.referralHospitalAddress}catch{try{h=(await Y(`/pathology/cases/${T}`,{token:b})).case}catch{h=(await Y(`/radiology/cases/${T}`,{token:b})).case}}if(!h)throw new Error("The requested document could not be loaded.");const M=wt(h,o,D,P,y,u,s);let x=document.getElementById("a4-lab-report-print-frame");if(x)try{x.remove()}catch{}x=document.createElement("iframe"),x.id="a4-lab-report-print-frame",x.style.position="fixed",x.style.right="0",x.style.bottom="0",x.style.width="0px",x.style.height="0px",x.style.border="none",document.body.appendChild(x);const C=x.contentWindow.document;return C.open(),C.write(M),C.close(),new Promise(z=>{let I=!1;const F=()=>{if(!I){I=!0;try{const R=x.contentWindow;R&&!R.__hasPrinted&&(R.__hasPrinted=!0,R.focus(),R.print())}catch(R){console.warn("Iframe print error:",R)}z()}};x.onload=()=>setTimeout(F,200),setTimeout(F,600)})}export{zt as p};
