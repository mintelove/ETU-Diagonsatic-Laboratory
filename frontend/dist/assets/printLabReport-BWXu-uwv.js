import{t as M,v as V,b as q}from"./index-DUCHOz2M.js";import{f as $t,l as kt,a as Tt,c as zt}from"./etu_cli-olfjyllP.js";import{n as G,M as gt}from"./categoryHelper-DRBJIStQ.js";import{a as mt}from"./ReportPreview-Dk53LYlU.js";import{l as Rt}from"./etu-B4KgRHwb.js";const e=t=>String(t??"—").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]),ft=t=>t?new Date(t).toLocaleString():"—";function Nt(t,n=""){let d=String(t.flag||"").trim().toUpperCase();return!d&&t.result&&t.referenceValue&&(d=zt(t.result,t.referenceValue,n)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(d)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(d)?"CL":d==="H"||d==="HIGH"?"H":d==="L"||d==="LOW"?"L":d==="N"||d==="NORMAL"?"Normal":"—"}function Y(t){if(!t)return"—";if(typeof t=="string"){const w=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(w)){const[x,i,y]=w.slice(0,10).split("-"),l=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(i,10)-1]||i;return`${y.padStart(2,"0")} ${l} ${x}`}}const n=new Date(t);if(isNaN(n.getTime()))return String(t);const d=String(n.getUTCDate?n.getUTCDate():n.getDate()).padStart(2,"0"),b=n.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),f=n.getUTCFullYear?n.getUTCFullYear():n.getFullYear();return`${d} ${b} ${f}`}function Ct(t,n,d,b,f,w,x){var K,X,Z,Q,tt,et,it,ot,at,nt,rt,dt,st,lt,pt,ct,bt;const i=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},y=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((K=t==null?void 0:t.structuredReport)!=null&&K.grossDescription||(X=t==null?void 0:t.structuredReport)!=null&&X.cytologicalFindings||(Z=t==null?void 0:t.structuredReport)!=null&&Z.rbcMorphology||((Q=t==null?void 0:t.templateReport)==null?void 0:Q.category)==="Pathology"),v=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((tt=t==null?void 0:t.structuredReport)!=null&&tt.liver||(et=t==null?void 0:t.structuredReport)!=null&&et.findings||["MRI","CT","Ultrasound"].includes((it=t==null?void 0:t.templateReport)==null?void 0:it.category)),l=(t==null?void 0:t.isInternalMedicineForm)===!0||(i==null?void 0:i.examinationFormType)==="Internal Medicine Speciality Examination Form",R=x!==void 0?x:t.showLogo!==void 0?t.showLogo:f!==void 0?f:!0,h=f!==void 0?f:t.showFooter!==void 0?t.showFooter:!0,A=w!==void 0?w:t==null?void 0:t.stampType,P=A==="lab"?kt:A==="clinic"?Tt:null,F=A==="clinic"?"ETU Clinic Stamp":"ETU Lab Stamp",g=P?`<div class="report-stamp-container" style="position: absolute; right: 8px; top: -18px; pointer-events: none; z-index: 2;"><img src="${P}" alt="${F}" style="width: 114px; height: 114px; object-fit: contain; display: block;" /></div>`:"",B=d||Rt,N=R&&B?`<img src="${B}" alt="ETU Diagnostic Laboratory Logo" style="width: 100%; height: auto; max-height: none; display: block; margin: 0; padding: 0; object-fit: contain;" />`:"",D=i.referralHospital?`<div><b>Referral Hospital Name:</b> <span>${e(i.referralHospital)}</span></div><div><b>Referral Hospital Address:</b> <span>${e(b||i.address||"Not recorded")}</span></div>`:"",H=i.systolicBP||i.diastolicBP?`<div><b>Blood Pressure:</b> <span>${e(i.systolicBP||"—")}/${e(i.diastolicBP||"—")} mmHg</span></div>`:"",C=ft(i.collectionDate||i.registrationDate||i.createdDate||t.createdDate),W=ft(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let $="",L=l?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",_=e(((ot=t.technician)==null?void 0:ot.fullName)||((at=t.submittedBy)==null?void 0:at.fullName)||(n==null?void 0:n.fullName)||"Clinical Specialist");const E=t.approvedBy||(["Approved","Ready for Printing"].includes(t.status)?n:null),yt=(E==null?void 0:E.fullName)||(typeof t.approvedBy=="string"?t.approvedBy:"")||((nt=t.pathologist)==null?void 0:nt.fullName)||((rt=t.radiologist)==null?void 0:rt.fullName)||((st=(dt=t.internalMedicineReport)==null?void 0:dt.declaration)==null?void 0:st.doctorName)||"",ht=(E==null?void 0:E.role)||t.approverRole||"";let J=e($t(yt,ht)),j=y?"Pathologist":v?"Radiologist":l?"Authorized Medical Doctor":t.approverRole&&t.approverRole!=="Approver"&&t.approverRole!=="Approver / Laboratory Technologist"?t.approverRole:"head of etu diagnostic laboratory";if(l){const a=t.internalMedicineReport||{},o=a.labInvestigations||{},p=a.clinicalExamination||{},k=a.vitalSigns||{},S=a.declaration||{};$=`
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
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">General Appearance</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.generalAppearance||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Respiratory System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.respiratorySystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Cardio-vascular System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.cardiovascularSystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Skin</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.skin||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CNS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.cns||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Psychiatry</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.psychiatry||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Extremities</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.extremities||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Hernia</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.hernia||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Varicose Veins</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.varicoseVeins||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Chest X-Ray</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(p.chestXRay||"Normal")}</strong></td></tr>
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
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CBC</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.cbc||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">FBS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.fbs||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Blood Group</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.bloodGroup||"O+")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Stool</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.stool||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Urine</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.urine||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Pregnancy Test</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.pregnancyTest||(i.sex==="Male"||t.sex==="Male"?"N/A":"Negative"))}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HBsAg</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.hbsag||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HCV</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.hcv||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">HIV 1 & 2</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.hiv12||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">VDRL</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.vdrl||"Negative")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LPT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.lpt||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">LFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.lft||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">RFT</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.rft||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Malaria</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(o.malaria||"Negative")}</strong></td></tr>
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
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.systolicBP||i.systolicBP||"120")} / ${e(k.diastolicBP||i.diastolicBP||"80")} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.pulse||"72 bpm")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.ecg||"Normal")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.earRt||"Normal")} / ${e(k.earLt||"Normal")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.height||"170 cm")} / ${e(k.weight||"65 kg")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(k.visionRt||"6/6")} / ${e(k.visionLt||"6/6")}</strong></td>
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
              <span class="imed-a4-result-value" style="font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: ${(a.examinationResult||"").includes("UNFIT")?"#991b1b":"#166534"};">
                ${e(a.examinationResult||"FIT FOR EMPLOYMENT")}
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
              <div><b>Doctor Name:</b> <strong>${e(S.doctorName||J||_)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(Y(S.signatureDate||new Date))}</span></div>
              ${P?`<div class="report-stamp-container" style="position: absolute; right: 10px; top: -18px; pointer-events: none; z-index: 2;"><img src="${P}" alt="${F}" style="width: 108px; height: 108px; object-fit: contain; display: block;" /></div>`:""}
            </div>
          </div>
        </div>
      </div>
    `}else if(y)if(L=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,j="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)$=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else if(t.reportType==="Option C"||!t.reportType&&((lt=t.templateReport)!=null&&lt.examination||(pt=t.templateReport)!=null&&pt.templateKey)){const a=mt("pathology",t,t.templateReport);L=`Pathology Examination Report — ${e(a.examination||t.testType||"Biopsy")}`,!a.findings&&t.reportContent?$=`
          <section class="section">
            <h2>${e(a.examination||"Pathology Examination Report")}</h2>
            <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ${t.reportContent}
            </div>
          </section>
        `:$=`
          <section class="section">
            <h2>${e(a.examination||"Standardized Pathology Examination Report")}</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${a.clinicalInformation?`<div><b style="color: #075c91;">Clinical Information / History:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(a.clinicalInformation)}</div></div>`:""}
              ${a.technique?`<div><b style="color: #075c91;">Specimen / Technique:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(a.technique)}</div></div>`:""}
              ${a.comparison?`<div><b style="color: #075c91;">Comparison:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(a.comparison)}</div></div>`:""}
              ${a.findings?`<div><b style="color: #075c91;">Microscopic & Gross Findings:</b><div style="margin-top: 2px; white-space: pre-wrap; line-height: 1.5;">${e(a.findings)}</div></div>`:""}
              ${a.impression?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis / Impression:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a; white-space: pre-wrap;">${e(a.impression)}</div></div>`:""}
              ${a.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(a.recommendation)}</div></div>`:""}
            </div>
          </section>
        `}else{const a=t.structuredReport||{};$=`
        <section class="section">
          <h2>Structured Pathology Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${a.clinicalHistory?`<div><b style="color: #075c91;">Clinical History:</b><div style="margin-top: 2px;">${e(a.clinicalHistory)}</div></div>`:""}
            ${a.specimen?`<div><b style="color: #075c91;">Specimen / Site:</b><div style="margin-top: 2px;">${e(a.specimen)}</div></div>`:""}
            ${a.grossDescription?`<div><b style="color: #075c91;">Gross Description:</b><div style="margin-top: 2px;">${e(a.grossDescription)}</div></div>`:""}
            ${a.microscopicDescription?`<div><b style="color: #075c91;">Microscopic Findings:</b><div style="margin-top: 2px;">${e(a.microscopicDescription)}</div></div>`:""}
            ${a.cytologicalFindings?`<div><b style="color: #075c91;">Cytological Findings:</b><div style="margin-top: 2px;">${e(a.cytologicalFindings)}</div></div>`:""}
            ${a.rbcMorphology||a.wbcMorphology||a.plateletMorphology?`
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div><b style="color: #075c91; font-size: 11.5px;">RBC Morphology:</b><div style="font-size: 12.5px;">${e(a.rbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">WBC Morphology:</b><div style="font-size: 12.5px;">${e(a.wbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">Platelet Morphology:</b><div style="font-size: 12.5px;">${e(a.plateletMorphology)}</div></div>
              </div>
            `:""}
            ${a.diagnosis?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${e(a.diagnosis)}</div></div>`:""}
            ${a.comments?`<div><b style="color: #075c91;">Comments:</b><div style="margin-top: 2px;">${e(a.comments)}</div></div>`:""}
            ${a.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${e(a.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else if(v)if(L=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,j="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)$=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else if(t.reportType==="Option C"||!t.reportType&&((ct=t.templateReport)!=null&&ct.examination||(bt=t.templateReport)!=null&&bt.templateKey)){const o=mt("radiology",t,t.templateReport),p=e(o.examination||t.customExaminationName||t.examinationType||"Medical Imaging");L=`Radiology & Imaging Report — ${p}`,j="Radiologist",!o.findings&&t.reportContent?$=`
          <section class="section">
            <h2>${p}</h2>
            <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ${t.reportContent}
            </div>
          </section>
        `:$=`
          <section class="section">
            <h2>${p}</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${o.clinicalInformation?`<div><b style="color: #075c91;">Clinical Information / Indication:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(o.clinicalInformation)}</div></div>`:""}
              ${o.technique?`<div><b style="color: #075c91;">Technique:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(o.technique)}</div></div>`:""}
              ${o.comparison?`<div><b style="color: #075c91;">Comparison:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(o.comparison)}</div></div>`:""}
              ${o.findings?`<div><b style="color: #075c91;">Findings:</b><div style="margin-top: 2px; white-space: pre-wrap; line-height: 1.5;">${e(o.findings)}</div></div>`:""}
              ${o.impression?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Radiological Impression / Conclusion:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a; white-space: pre-wrap;">${e(o.impression)}</div></div>`:""}
              ${o.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px; white-space: pre-wrap;">${e(o.recommendation)}</div></div>`:""}
            </div>
          </section>
        `}else{const o=t.structuredReport||{};$=`
        <section class="section">
          <h2>Structured Imaging Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${o.clinicalInformation?`<div><b style="color: #075c91;">Clinical Information / Indications:</b><div style="margin-top: 2px;">${e(o.clinicalInformation)}</div></div>`:""}
            ${o.technique?`<div><b style="color: #075c91;">Technique / Protocol:</b><div style="margin-top: 2px;">${e(o.technique)}</div></div>`:""}
            ${o.liver||o.gallbladder||o.pancreas||o.spleen||o.kidneys||o.urinaryBladder?`
              <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <b style="color: #075c91; font-size: 12px; text-transform: uppercase;">Sonographic Organ Findings:</b>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-top: 6px; font-size: 12.5px;">
                  ${o.liver?`<div><b>Liver:</b> ${e(o.liver)}</div>`:""}
                  ${o.gallbladder?`<div><b>Gallbladder & Biliary:</b> ${e(o.gallbladder)}</div>`:""}
                  ${o.pancreas?`<div><b>Pancreas:</b> ${e(o.pancreas)}</div>`:""}
                  ${o.spleen?`<div><b>Spleen:</b> ${e(o.spleen)}</div>`:""}
                  ${o.kidneys?`<div><b>Kidneys:</b> ${e(o.kidneys)}</div>`:""}
                  ${o.urinaryBladder?`<div><b>Urinary Bladder:</b> ${e(o.urinaryBladder)}</div>`:""}
                </div>
              </div>
            `:""}
            ${o.findings?`<div><b style="color: #075c91;">General Findings:</b><div style="margin-top: 2px;">${e(o.findings)}</div></div>`:""}
            ${o.impression?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Radiological Impression / Conclusion:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${e(o.impression)}</div></div>`:""}
            ${o.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${e(o.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else{const a=t.results||[],o={},p={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(i==null?void 0:i.laboratoryTests)?i.laboratoryTests:[]).forEach(r=>{var O,c;if(!r||typeof r!="object")return;const u=r.category?typeof r.category=="object"?r.category.name||"":String(r.category):"",m=Array.isArray(r.parameters)&&r.parameters.length>0?typeof r.parameters[0]=="string"?r.parameters[0]:((O=r.parameters[0])==null?void 0:O.name)||((c=r.parameters[0])==null?void 0:c.sampleName):r.name,s=G(u,m||r.name),T=r.subcategory||"";Array.isArray(r.parameters)&&r.parameters.forEach(z=>{const U=typeof z=="string"?z:(z==null?void 0:z.name)||(z==null?void 0:z.sampleName)||"";U&&(o[U]=s,T&&(p[U]=T.toUpperCase()))}),r.name&&(o[r.name]=s,T&&(p[r.name]=T.toUpperCase()))});const S=new Map;a.forEach(r=>{const u=G(r.category||o[r.sampleName],r.sampleName),m=(r.subcategory||p[r.sampleName]||"").toUpperCase();S.has(u)||S.set(u,new Map);const s=S.get(u),T=m||"GENERAL";s.has(T)||s.set(T,[]),s.get(T).push(r)});const xt=Array.from(S.entries()).sort(([r],[u])=>{const m=gt.indexOf(r),s=gt.indexOf(u);return m!==-1&&s!==-1?m-s:m!==-1?-1:s!==-1?1:r.localeCompare(u)}),vt=Array.isArray(t.testInterpretations)?t.testInterpretations:[],ut=r=>{const u=G(r),m=vt.find(s=>G(s.testName)===u);return(m==null?void 0:m.interpretations)||[]};let I="";xt.length>0?xt.forEach(([r,u])=>{I+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(r)}</h4>`,u.forEach((s,T)=>{T!=="GENERAL"&&(I+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(T)}</h5>`);const O=s.map(c=>{const z=Nt(c,i.sex),wt=!!(c.isTransferred||c.performedAt&&c.transferredFrom&&c.performedAt!==c.transferredFrom)?` <span style="display: inline-block; margin-left: 5px; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; background: #e0f2fe; color: #0369a1; text-transform: uppercase; letter-spacing: 0.02em; vertical-align: middle;">SENT FROM ${e(c.transferredFrom||"ORIGIN")} • PERFORMED AT ${e(c.performedAt||"DESTINATION")}</span>`:"";return`<tr><td><b>${e(c.sampleName)}</b>${wt}${c.remarks?`<small>${e(c.remarks)}</small>`:""}</td><td>${e(c.result)}</td><td>${e(c.unit)}</td><td>${e(c.referenceValue)}</td><td><b>${e(z)}</b></td></tr>`}).join("");I+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${O}</tbody></table>`});const m=ut(r).filter(s=>s.showOnReport!==!1&&s.hidden!==!0);m.length>0&&(I+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',m.forEach(s=>{I+=`<div style="margin-top: 4px; font-size: 11px; color: #203640; white-space: pre-line;"><b>${e(s.title)}:</b> ${e(s.interpretation)}</div>`}),I+="</div>"),I+="</div>"}):I='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',$=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${I}
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
        padding-top: ${R?"0mm":"42mm"} !important;
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
    ${R?`
      <header class="header">
        ${N}
        <div style="display: none;">
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${L}</p>
        </div>
      </header>
    `:""}

    <section class="section" style="margin-top: ${l?"6px":R?"8px":"0px"};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h2 style="margin: 0;">${l?"Basic Information":"Patient Information"}</h2>
        ${t.isCrossBranchTransfer||t.originalBranch&&t.originalBranch!==t.branchName?`
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #0284c7; color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            SENT FROM ${e((t.originalBranch||"Main").toUpperCase())}
          </span>
        `:""}
      </div>
      ${l?`
        <div style="display: flex; gap: 8px; align-items: stretch; margin-bottom: 6px; width: 100%; max-width: 100%; box-sizing: border-box;">
          <div style="width: 80px; min-width: 80px; max-width: 80px; height: 105px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; background: #fafafa; flex-shrink: 0; overflow: hidden; box-sizing: border-box;">
            ${i.patientPhoto||t.patientPhoto?`
              <img src="${i.patientPhoto||t.patientPhoto}" alt="Patient Photo" style="width: 100%; height: 100%; object-fit: cover;" />
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
                <td style="width: 32%;"><strong style="text-transform: uppercase; word-break: keep-all; overflow-wrap: break-word;">${e(i.name||i.patientName||t.name||t.patientName||"—")}</strong></td>
                <td style="width: 18%; font-weight: 800;">Nationality:</td>
                <td style="width: 32%;"><strong style="text-transform: uppercase;">${e(i.nationality||t.nationality||"ETHIOPIA")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Date of Birth:</td>
                <td>${e(Y(i.dateOfBirth||i.dob||i.birthDate||t.dateOfBirth||t.dob||t.birthDate))}</td>
                <td style="font-weight: 800;">Age:</td>
                <td><strong>${e(i.age!==void 0&&i.age!==null&&i.age!==""?`${i.age} YRS`:t.age!==void 0&&t.age!==null&&t.age!==""?`${t.age} YRS`:"—")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Passport No.:</td>
                <td><code>${e(i.passportNumber||i.passportNo||i.passport_no||t.passportNumber||t.passportNo||t.passport_no||"—")}</code></td>
                <td style="font-weight: 800;">Sex:</td>
                <td><strong>${e(i.sex||t.sex||"—")}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Issue Date:</td>
                <td>${e(Y(i.passportIssueDate||i.passportIssue||i.passport_issue_date||t.passportIssueDate||t.passportIssue||t.passport_issue_date))}</td>
                <td style="font-weight: 800;">Marital Status:</td>
                <td>${e(i.maritalStatus||t.maritalStatus||"Single")}</td>
              </tr>
              <tr>
                <td style="font-weight: 800;">Job Title:</td>
                <td colspan="3">${e(i.jobTitle||i.job||i.occupation||t.jobTitle||t.job||t.occupation||"—")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `:`
        <div class="patient">
          <div style="grid-column: 1 / -1; display: flex; gap: 8px; align-items: baseline;">
            <b>Patient Name:</b>
            <strong style="text-transform: uppercase; font-size: 13px; word-break: keep-all; overflow-wrap: break-word;">${e(i.name||i.patientName||t.name||t.patientName||"—")}</strong>
          </div>
          <div><b>Patient ID:</b> <span>${e(i.patientId||i.id||"—")}</span></div>
          <div><b>Age / Sex:</b> <span>${e(i.age??t.age??"—")} / ${e(i.sex||t.sex||"—")}</span></div>
          <div><b>Phone:</b> <span>${e(i.phone||t.phone||"—")}</span></div>
          <div><b>Examination Type:</b> <span>${e(t.testType||t.customExaminationName||t.ultrasoundSubtype||t.examinationType||"General Laboratory Investigation")}</span></div>
          <div><b>Registration Date:</b> <span>${e(C)}</span></div>
          <div><b>Report Date:</b> <span>${e(W)}</span></div>
          ${t.isCrossBranchTransfer||t.originalBranch&&t.originalBranch!==t.branchName?`
            <div><b>Original Branch:</b> <span>📍 ${e(t.originalBranch||i.branchName||"Main")}</span></div>
            <div><b>Performed At:</b> <span>🔬 ${e(t.performingBranch||t.branchName||"Otona")}</span></div>
          `:`
            <div><b>Branch:</b> <span>📍 ${e(t.branchName||i.branchName||"Main")}</span></div>
          `}
          ${H}
          ${D}
        </div>
      `}
    </section>

    ${$}

    ${h&&!l?`
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
                <strong style="color: #0f172a;">${e(j)}</strong>
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
                <strong style="color: #0f172a;">${e(W)}</strong>
              </div>
            </div>
            ${g}
          </div>
        </div>
      </section>
    `:""}

    ${h?`
      <footer class="${l?"imed-a4-footer":"footer"}">
        <span>Title: Head of ETU Diagnostic Laboratory &bull; Prepared By: ${_}</span>
        <span class="report-preview-footer-brand">ETU DIAGNOSTIC LABORATORY</span>
      </footer>
    `:""}
  </main>
</body>
</html>`}async function Dt(t,n,d,b,f,w){let x=null,i=null,y,v,l;typeof n=="object"&&n!==null&&!n._id&&!n.username&&!n.role&&(n.showLogo!==void 0||n.showFooter!==void 0||n.stampType!==void 0||n.token!==void 0||n.user!==void 0)?(l=n.showLogo,y=n.showFooter,v=n.stampType,x=n.token,i=n.user):typeof n=="string"?(x=n,i=d,y=b,v=f,l=w):typeof n=="boolean"?(y=n,x=M(),i=V(),v=typeof d=="string"?d:typeof b=="string"?b:f,l=typeof d=="boolean"?d:typeof b=="boolean"?b:w):typeof n=="object"&&n!==null?(i=n,typeof d=="boolean"?(y=d,x=M(),v=b,l=f):typeof d=="string"?(x=d,y=b,v=f,l=w):(x=M(),y=b!==void 0?b:typeof d=="boolean"?d:void 0,v=f,l=w)):(x=M(),i=V(),y=n!==void 0?n:d!==void 0?d:b,v=typeof d=="string"?d:typeof b=="string"?b:f,l=w),x||(x=M()),i||(i=V());const R=typeof t=="string"?t:t==null?void 0:t._id;if(!R)throw new Error("The requested document could not be loaded.");let h=typeof t=="object"?t:null,A="",P="";if(!h||!h.patient)try{const N=await q(`/final-reports/${R}`,{token:x});h=N.report,A=N.logoBase64,P=N.referralHospitalAddress}catch{try{h=(await q(`/pathology/cases/${R}`,{token:x})).case}catch{h=(await q(`/radiology/cases/${R}`,{token:x})).case}}if(!h)throw new Error("The requested document could not be loaded.");const F=Ct(h,i,A,P,y,v,l);let g=document.getElementById("a4-lab-report-print-frame");if(g)try{g.remove()}catch{}g=document.createElement("iframe"),g.id="a4-lab-report-print-frame",g.style.position="fixed",g.style.right="0",g.style.bottom="0",g.style.width="0px",g.style.height="0px",g.style.border="none",document.body.appendChild(g);const B=g.contentWindow.document;return B.open(),B.write(F),B.close(),new Promise(N=>{let D=!1;const H=()=>{if(!D){D=!0;try{const C=g.contentWindow;C&&!C.__hasPrinted&&(C.__hasPrinted=!0,C.focus(),C.print())}catch(C){console.warn("Iframe print error:",C)}N()}};g.onload=()=>setTimeout(H,200),setTimeout(H,600)})}export{Dt as p};
