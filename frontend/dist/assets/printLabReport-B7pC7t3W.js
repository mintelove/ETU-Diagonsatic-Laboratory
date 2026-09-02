import{v as X,w as rt,b as I,q as st}from"./index-B8vk9dBC.js";import{c as nt}from"./flagHelper-40j5y1H-.js";import{n as D,M as K}from"./categoryHelper-TmElMUWB.js";const e=t=>String(t??"—").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]),Z=t=>t?new Date(t).toLocaleString():"—";function pt(t,r=""){let s=String(t.flag||"").trim().toUpperCase();return!s&&t.result&&t.referenceValue&&(s=nt(t.result,t.referenceValue,r)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(s)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(s)?"CL":s==="H"||s==="HIGH"?"H":s==="L"||s==="LOW"?"L":s==="N"||s==="NORMAL"?"Normal":"—"}function P(t){if(!t)return"—";if(typeof t=="string"){const o=t.trim();if(/^\d{4}-\d{2}-\d{2}/.test(o)){const[p,v,b]=o.slice(0,10).split("-"),N=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(v,10)-1]||v;return`${b.padStart(2,"0")} ${N} ${p}`}}const r=new Date(t);if(isNaN(r.getTime()))return String(t);const s=String(r.getUTCDate?r.getUTCDate():r.getDate()).padStart(2,"0"),z=r.toLocaleString("en-US",{month:"short",timeZone:"UTC"}),h=r.getUTCFullYear?r.getUTCFullYear():r.getFullYear();return`${s} ${z} ${h}`}function lt(t,r,s,z,h){var M,H,F,U,j,G,O,V,_,Y,q,W;const o=t!=null&&t.patient&&typeof t.patient=="object"?t.patient:t||{},p=(t==null?void 0:t.testType)||(t==null?void 0:t.docType)==="PathologyCase"||!!((M=t==null?void 0:t.structuredReport)!=null&&M.grossDescription||(H=t==null?void 0:t.structuredReport)!=null&&H.cytologicalFindings||(F=t==null?void 0:t.structuredReport)!=null&&F.rbcMorphology),v=(t==null?void 0:t.examinationType)||(t==null?void 0:t.docType)==="RadiologyCase"||!!((U=t==null?void 0:t.structuredReport)!=null&&U.liver||(j=t==null?void 0:t.structuredReport)!=null&&j.findings),b=(t==null?void 0:t.isInternalMedicineForm)===!0||(o==null?void 0:o.examinationFormType)==="Internal Medicine Speciality Examination Form",u=h!==void 0?h:t.showFooter!==void 0?t.showFooter:!0,N=s||st,Q=u&&N?`<img src="${N}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 80px; width: auto; max-width: 100%; display: block; margin: 0 auto 6px; object-fit: contain;" />`:"",tt=o.referralHospital?`<div><b>Referral Hospital Name</b>${e(o.referralHospital)}</div><div><b>Referral Hospital Address</b>${e(z||o.address||"Not recorded")}</div>`:"",et=o.systolicBP||o.diastolicBP?`<div><b>Blood Pressure</b>${e(o.systolicBP||"—")}/${e(o.diastolicBP||"—")} mmHg</div>`:"";(o.sampleTypes||[]).map(a=>(a==null?void 0:a.name)||a).filter(Boolean).join(", ");const ot=Z(o.collectionDate||o.registrationDate||o.createdDate||t.createdDate),B=Z(t.approvedAt||t.approvedDate||t.approvalDate||t.updatedDate||new Date);let k="",R=b?"Internal Medicine Speciality Examination Form":"Official Laboratory Test Report",L=e(((G=t.technician)==null?void 0:G.fullName)||((O=t.submittedBy)==null?void 0:O.fullName)||(r==null?void 0:r.fullName)||"Clinical Specialist");const T=((V=t.approvedBy)==null?void 0:V.fullName)||((_=t.pathologist)==null?void 0:_.fullName)||((Y=t.radiologist)==null?void 0:Y.fullName)||((W=(q=t.internalMedicineReport)==null?void 0:q.declaration)==null?void 0:W.doctorName)||(["Approved","Ready for Printing"].includes(t.status)?r==null?void 0:r.fullName:"");let E=e(T?T.startsWith("Dr.")?T:`Dr. ${T}`:"Pending Specialist Approval"),C=t.approverRole||(p?"Pathologist":v?"Radiologist":b?"Authorized Medical Doctor":"Approver / Laboratory Technologist");if(b){const a=t.internalMedicineReport||{},i=a.labInvestigations||{},l=a.clinicalExamination||{},g=a.vitalSigns||{},$=a.declaration||{};k=`
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
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">General Appearance</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.generalAppearance||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Respiratory System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.respiratorySystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Cardio-vascular System</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.cardiovascularSystem||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Skin</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.skin||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">CNS</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.cns||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Psychiatry</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.psychiatry||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Extremities</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.extremities||"Normal")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Hernia</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.hernia||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Varicose Veins</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.varicoseVeins||"Nil")}</strong></td></tr>
                <tr><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;">Chest X-Ray</td><td style="padding: 3px 5px; border: 1px solid #000; overflow-wrap: break-word;"><strong>${e(l.chestXRay||"Normal")}</strong></td></tr>
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
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.systolicBP||o.systolicBP||"120")} / ${e(g.diastolicBP||o.diastolicBP||"80")} mmHg</strong></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Pulse:</b></td>
                <td style="width: 25%; border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.pulse||"72 bpm")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>ECG:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.ecg||"Normal")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Ear (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.earRt||"Normal")} / ${e(g.earLt||"Normal")}</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Height & Weight:</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.height||"170 cm")} / ${e(g.weight||"65 kg")}</strong></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><b>Vision (RT / LT):</b></td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 10.5px;"><strong>${e(g.visionRt||"6/6")} / ${e(g.visionLt||"6/6")}</strong></td>
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
              "${e($.declarationText||"I hereby declare that all information provided above is true.")}"
            </p>
            <div class="imed-a4-decl-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding-top: 3px; border-top: 1px dashed #718096;">
              <div><b>Doctor Name:</b> <strong>${e($.doctorName||E||L)}</strong></div>
              <div><b>Signature:</b> <span style="display: inline-block; min-width: 90px; border-bottom: 1px solid #000;">&nbsp;</span></div>
              <div><b>Date:</b> <span>${e(P($.signatureDate||new Date))}</span></div>
            </div>
          </div>
        </div>
      </div>
    `}else if(p)if(R=`Pathology Examination Report — ${e(t.testType||"Biopsy")}`,C="Pathologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)k=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const a=t.structuredReport||{};k=`
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
      `}else if(v)if(R=`Radiology & Imaging Report — ${e(t.customExaminationName||(t.ultrasoundSubtype?`Ultrasound — ${t.ultrasoundSubtype}`:t.examinationType||"Diagnostic Imaging"))}`,C="Radiologist",t.reportType==="Option A"||!t.reportType&&t.reportContent)k=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${t.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const i=t.structuredReport||{};k=`
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
      `}else{const a=t.results||[],i={},l={};(Array.isArray(t==null?void 0:t.laboratoryTests)?t.laboratoryTests:Array.isArray(o==null?void 0:o.laboratoryTests)?o.laboratoryTests:[]).forEach(d=>{var S,m;if(!d||typeof d!="object")return;const c=d.category?typeof d.category=="object"?d.category.name||"":String(d.category):"",x=Array.isArray(d.parameters)&&d.parameters.length>0?typeof d.parameters[0]=="string"?d.parameters[0]:((S=d.parameters[0])==null?void 0:S.name)||((m=d.parameters[0])==null?void 0:m.sampleName):d.name,n=D(c,x||d.name),f=d.subcategory||"";Array.isArray(d.parameters)&&d.parameters.forEach(y=>{const A=typeof y=="string"?y:(y==null?void 0:y.name)||(y==null?void 0:y.sampleName)||"";A&&(i[A]=n,f&&(l[A]=f.toUpperCase()))}),d.name&&(i[d.name]=n,f&&(l[d.name]=f.toUpperCase()))});const $=new Map;a.forEach(d=>{const c=D(d.category||i[d.sampleName],d.sampleName),x=(d.subcategory||l[d.sampleName]||"").toUpperCase();$.has(c)||$.set(c,new Map);const n=$.get(c),f=x||"GENERAL";n.has(f)||n.set(f,[]),n.get(f).push(d)});const J=Array.from($.entries()).sort(([d],[c])=>{const x=K.indexOf(d),n=K.indexOf(c);return x!==-1&&n!==-1?x-n:x!==-1?-1:n!==-1?1:d.localeCompare(c)}),at=Array.isArray(t.testInterpretations)?t.testInterpretations:[],dt=d=>{const c=D(d),x=at.find(n=>D(n.testName)===c);return(x==null?void 0:x.interpretations)||[]};let w="";J.length>0?J.forEach(([d,c])=>{w+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${e(d)}</h4>`,c.forEach((n,f)=>{f!=="GENERAL"&&(w+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${e(f)}</h5>`);const S=n.map(m=>{const y=pt(m,o.sex);return`<tr><td><b>${e(m.sampleName)}</b>${m.remarks?`<small>${e(m.remarks)}</small>`:""}</td><td>${e(m.result)}</td><td>${e(m.unit)}</td><td>${e(m.referenceValue)}</td><td><b>${e(y)}</b></td></tr>`}).join("");w+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${S}</tbody></table>`});const x=dt(d);x.length>0&&(w+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',x.forEach(n=>{w+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${e(n.title)}:</b> ${e(n.interpretation)}</div>`}),w+="</div>"),w+="</div>"}):w='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',k=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${w}
        ${t.comments?`<p style="margin-top: 10px;"><b>General remarks:</b> ${e(t.comments)}</p>`:""}
      </section>
    `}const it=u?`
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
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #e2e8f0; color: #0f172a; font: 13px Arial, Helvetica, sans-serif; line-height: 1.5; }
    .toolbar { padding: 10px; text-align: center; background: #075c91; position: sticky; top: 0; z-index: 100; }
    .toolbar button { padding: 7px 16px; border: 0; border-radius: 5px; margin: 0 4px; font-weight: bold; cursor: pointer; font-size: 13px; }
    .toolbar .primary { background: #0b95b7; color: white; }
    .page { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 12mm 14mm; background: white; box-shadow: 0 4px 25px rgba(0,0,0,0.15); border-radius: 2px; }
    .header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2.5px solid #087ca8; padding-bottom: 8px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
    .header h1 { margin: 2px 0 0; color: #075c91; font-size: 20px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 800; line-height: 1.2; }
    .header p.sub { margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.8px; }
    .section { margin-top: 10px; page-break-inside: auto; break-inside: auto; }
    .section h2 { margin: 0 0 6px; padding: 5px 8px; background: #e8f5fa; color: #075c91; border-left: 4px solid #0b95b7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; page-break-after: avoid; break-after: avoid; }
    .patient { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px 16px; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid; }
    .patient div { display: flex; gap: 8px; }
    .patient b { min-width: 120px; color: #475569; }
    .result-cat-block { margin-bottom: 14px; page-break-inside: auto; break-inside: auto; }
    .result-cat-header { margin: 0 0 6px 0; padding: 5px 10px; background: #075c91; color: #ffffff; border-radius: 4px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.4px; page-break-after: avoid; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { background: #075c91; color: white; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td small { display: block; color: #64748b; margin-top: 2px; font-size: 10.5px; }
    .rich-report-body { padding: 10px 12px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; line-height: 1.55; color: #0f172a; word-break: break-word; page-break-inside: auto; break-inside: auto; }
    .rich-report-body img { max-width: 100%; height: auto; display: block; margin: 8px auto; border-radius: 4px; page-break-inside: avoid; break-inside: avoid; }
    .rich-report-body table { width: 100%; border-collapse: collapse; margin: 8px 0; page-break-inside: auto; break-inside: auto; }
    .rich-report-body table tr { page-break-inside: avoid; break-inside: avoid; }
    .rich-report-body table th, .rich-report-body table td { border: 1px solid #cbd5e1; padding: 5px 8px; }
    .signoff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 14px; font-size: 11.5px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid; }
    .signoff-grid div { display: flex; flex-direction: column; gap: 2px; }
    .signoff-grid b { color: #475569; }
    .signoff-grid strong { color: #0f172a; }
    .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 11px; page-break-inside: avoid; break-inside: avoid; }
    @media print {
      body { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .toolbar { display: none !important; }
      .page { margin: 0 !important; width: 100% !important; max-width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
      .header, .patient, .signoff-grid, .footer, tr, img { page-break-inside: avoid !important; break-inside: avoid !important; }
      .section, .rich-report-body, table { page-break-inside: auto !important; break-inside: auto !important; }
    }
  </style>
</head>
<body>
  <nav class="toolbar">
    <button onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print / Export PDF</button>
  </nav>
  <main class="page">
    ${u?`
      <header class="header">
        ${Q}
        <div>
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${R}</p>
        </div>
      </header>
    `:`
      <div style="border-bottom: 2px solid #075c91; padding-bottom: 6px; margin-bottom: 14px;">
        <h2 style="margin: 0; color: #075c91; font-size: 18px; text-transform: uppercase;">${R}</h2>
      </div>
    `}

    <section class="section" style="margin-top: ${b?"6px":"8px"};">
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
                <td style="width: 20%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Name:</td>
                <td style="width: 30%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase;">${e(o.name||o.patientName||t.name||t.patientName||"—")}</strong></td>
                <td style="width: 20%; background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Nationality:</td>
                <td style="width: 30%; border: 1px solid #000; padding: 3px 5px;"><strong style="text-transform: uppercase;">${e(o.nationality||t.nationality||"ETHIOPIA")}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Date of Birth:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(P(o.dateOfBirth||o.dob||o.birthDate||t.dateOfBirth||t.dob||t.birthDate))}</td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Age:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><strong>${e(o.age!==void 0&&o.age!==null&&o.age!==""?`${o.age} YRS`:t.age!==void 0&&t.age!==null&&t.age!==""?`${t.age} YRS`:"—")}</strong></td>
              </tr>
              <tr>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport No.:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;"><code>${e(o.passportNumber||o.passportNo||o.passport_no||t.passportNumber||t.passportNo||t.passport_no||"—")}</code></td>
                <td style="background: #f0f4f8; font-weight: 800; border: 1px solid #000; padding: 3px 5px;">Passport Issue Date:</td>
                <td style="border: 1px solid #000; padding: 3px 5px;">${e(P(o.passportIssueDate||o.passportIssue||o.passport_issue_date||t.passportIssueDate||t.passportIssue||t.passport_issue_date))}</td>
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
          <div><b>Patient Name</b>${e(o.name)}</div>
          <div><b>Patient ID</b>${e(o.patientId)}</div>
          <div><b>Age / Sex</b>${e(o.age)} / ${e(o.sex)}</div>
          <div><b>Phone</b>${e(o.phone)}</div>
          <div><b>Examination Type</b>${e(t.testType||t.customExaminationName||t.ultrasoundSubtype||t.examinationType||"General Laboratory Investigation")}</div>
          <div><b>Registration Date</b>${e(ot)}</div>
          <div><b>Report Date</b>${e(B)}</div>
          <div><b>Branch</b>📍 ${e(t.branchName||o.branchName||"Main")}</div>
          ${et}
          ${tt}
        </div>
      `}
    </section>

    ${k}

    ${b?"":`
      <section class="section">
        <h2>Authorization & Sign-off</h2>
        <div class="signoff-grid">
          <div><b>Authorized Specialist:</b> <strong>${L}</strong></div>
          <div><b>Approved By:</b> <strong>Dr. ${E}</strong> <span style="font-size: 10.5px; color: #64748b;">(${e(C)})</span></div>
          <div><b>Approval Date:</b> <strong>${e(B)}</strong></div>
        </div>
      </section>
    `}

    ${it}
  </main>
</body>
</html>`}async function gt(t,r,s,z){typeof r!="string"&&(s=r||s||X(),r=rt()),s||(s=X());const h=typeof t=="string"?t:t==null?void 0:t._id;if(!h)throw new Error("The requested document could not be loaded.");const o=window.open("","_blank","width=980,height=900");if(!o)throw new Error("Print preview was blocked. Please allow pop-ups and try again.");try{let p=typeof t=="object"?t:null,v="",b="";if(!p||!p.patient)try{const u=await I(`/final-reports/${h}`,{token:r});p=u.report,v=u.logoBase64,b=u.referralHospitalAddress}catch{try{p=(await I(`/pathology/cases/${h}`,{token:r})).case}catch{p=(await I(`/radiology/cases/${h}`,{token:r})).case}}o.document.write(lt(p,s,v,b,z)),o.document.close()}catch(p){throw o.close(),new Error(p.message||"The requested document could not be loaded.")}}export{gt as p};
