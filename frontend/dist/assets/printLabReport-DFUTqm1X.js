import{k as q,m as X,b as k}from"./index-BoGDwV4N.js";import{c as Z}from"./flagHelper-CYiOYGll.js";import{n as C,M as _}from"./categoryHelper-BwrWtoFY.js";const t=e=>String(e??"—").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]),V=e=>e?new Date(e).toLocaleString():"—";function ee(e,r=""){let n=String(e.flag||"").trim().toUpperCase();return!n&&e.result&&e.referenceValue&&(n=Z(e.result,e.referenceValue,r)),["CH","CRITICAL HIGH","CRITICAL_HIGH"].includes(n)?"CH":["CL","CRITICAL LOW","CRITICAL_LOW"].includes(n)?"CL":n==="H"||n==="HIGH"?"H":n==="L"||n==="LOW"?"L":n==="N"||n==="NORMAL"?"Normal":"—"}function te(e,r,n,w,x){var L,E,I,B,M,F,U,G;const y=(e==null?void 0:e.testType)||(e==null?void 0:e.docType)==="PathologyCase"||!!((L=e==null?void 0:e.structuredReport)!=null&&L.grossDescription||(E=e==null?void 0:e.structuredReport)!=null&&E.cytologicalFindings||(I=e==null?void 0:e.structuredReport)!=null&&I.rbcMorphology),c=(e==null?void 0:e.examinationType)||(e==null?void 0:e.docType)==="RadiologyCase"||!!((B=e==null?void 0:e.structuredReport)!=null&&B.liver||(M=e==null?void 0:e.structuredReport)!=null&&M.findings),s=e.patient||{},u=x!==void 0?x:e.showFooter!==void 0?e.showFooter:!0,h=u&&n?`<img src="${n}" alt="ETU Diagnostic Laboratory Logo" style="max-height: 90px; width: auto; max-width: 100%; display: block; margin: 0 auto 10px; object-fit: contain;" />`:u?'<div class="logo">ETU</div>':"",D=s.referralHospital?`<div><b>Referral Hospital Name</b>${t(s.referralHospital)}</div><div><b>Referral Hospital Address</b>${t(w||s.address||"Not recorded")}</div>`:"",W=s.systolicBP||s.diastolicBP?`<div><b>Blood Pressure</b>${t(s.systolicBP||"—")}/${t(s.diastolicBP||"—")} mmHg</div>`:"",O=(s.sampleTypes||[]).map(o=>(o==null?void 0:o.name)||o).filter(Boolean).join(", ")||(y?"Pathology Specimen":c?"Imaging Scan":"Specimen Assigned"),K=V(s.collectionDate||s.registrationDate||s.createdDate||e.createdDate),P=V(e.approvedAt||e.approvedDate||e.approvalDate||e.updatedDate||new Date);let v="",$="Official Laboratory Test Report",S=t(((F=e.technician)==null?void 0:F.fullName)||((U=e.submittedBy)==null?void 0:U.fullName)||(r==null?void 0:r.fullName)||"Clinical Specialist"),H=t(((G=e.approvedBy)==null?void 0:G.fullName)||(e.status==="Approved"?r==null?void 0:r.fullName:"Pending Specialist Approval")),R=e.approverRole||(y?"Pathologist":c?"Radiologist":"Approver / Laboratory Technologist");if(y)if($=`Pathology Examination Report — ${t(e.testType||"Biopsy")}`,R="Pathologist",e.reportType==="Option A"||!e.reportType&&e.reportContent)v=`
        <section class="section">
          <h2>Pathology Examination Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${e.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const o=e.structuredReport||{};v=`
        <section class="section">
          <h2>Structured Pathology Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${o.clinicalHistory?`<div><b style="color: #075c91;">Clinical History:</b><div style="margin-top: 2px;">${t(o.clinicalHistory)}</div></div>`:""}
            ${o.specimen?`<div><b style="color: #075c91;">Specimen / Site:</b><div style="margin-top: 2px;">${t(o.specimen)}</div></div>`:""}
            ${o.grossDescription?`<div><b style="color: #075c91;">Gross Description:</b><div style="margin-top: 2px;">${t(o.grossDescription)}</div></div>`:""}
            ${o.microscopicDescription?`<div><b style="color: #075c91;">Microscopic Findings:</b><div style="margin-top: 2px;">${t(o.microscopicDescription)}</div></div>`:""}
            ${o.cytologicalFindings?`<div><b style="color: #075c91;">Cytological Findings:</b><div style="margin-top: 2px;">${t(o.cytologicalFindings)}</div></div>`:""}
            ${o.rbcMorphology||o.wbcMorphology||o.plateletMorphology?`
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div><b style="color: #075c91; font-size: 11.5px;">RBC Morphology:</b><div style="font-size: 12.5px;">${t(o.rbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">WBC Morphology:</b><div style="font-size: 12.5px;">${t(o.wbcMorphology)}</div></div>
                <div><b style="color: #075c91; font-size: 11.5px;">Platelet Morphology:</b><div style="font-size: 12.5px;">${t(o.plateletMorphology)}</div></div>
              </div>
            `:""}
            ${o.diagnosis?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Pathological Diagnosis:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${t(o.diagnosis)}</div></div>`:""}
            ${o.comments?`<div><b style="color: #075c91;">Comments:</b><div style="margin-top: 2px;">${t(o.comments)}</div></div>`:""}
            ${o.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${t(o.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else if(c)if($=`Radiology & Imaging Report — ${t(e.customExaminationName||(e.ultrasoundSubtype?`Ultrasound — ${e.ultrasoundSubtype}`:e.examinationType||"Diagnostic Imaging"))}`,R="Radiologist",e.reportType==="Option A"||!e.reportType&&e.reportContent)v=`
        <section class="section">
          <h2>Radiology & Medical Imaging Report</h2>
          <div class="rich-report-body" style="padding: 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${e.reportContent||"<p>No content recorded.</p>"}
          </div>
        </section>
      `;else{const a=e.structuredReport||{};v=`
        <section class="section">
          <h2>Structured Imaging Findings</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${a.clinicalInformation?`<div><b style="color: #075c91;">Clinical Information / Indications:</b><div style="margin-top: 2px;">${t(a.clinicalInformation)}</div></div>`:""}
            ${a.technique?`<div><b style="color: #075c91;">Technique / Protocol:</b><div style="margin-top: 2px;">${t(a.technique)}</div></div>`:""}
            ${a.liver||a.gallbladder||a.pancreas||a.spleen||a.kidneys||a.urinaryBladder?`
              <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <b style="color: #075c91; font-size: 12px; text-transform: uppercase;">Sonographic Organ Findings:</b>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-top: 6px; font-size: 12.5px;">
                  ${a.liver?`<div><b>Liver:</b> ${t(a.liver)}</div>`:""}
                  ${a.gallbladder?`<div><b>Gallbladder & Biliary:</b> ${t(a.gallbladder)}</div>`:""}
                  ${a.pancreas?`<div><b>Pancreas:</b> ${t(a.pancreas)}</div>`:""}
                  ${a.spleen?`<div><b>Spleen:</b> ${t(a.spleen)}</div>`:""}
                  ${a.kidneys?`<div><b>Kidneys:</b> ${t(a.kidneys)}</div>`:""}
                  ${a.urinaryBladder?`<div><b>Urinary Bladder:</b> ${t(a.urinaryBladder)}</div>`:""}
                </div>
              </div>
            `:""}
            ${a.findings?`<div><b style="color: #075c91;">General Findings:</b><div style="margin-top: 2px;">${t(a.findings)}</div></div>`:""}
            ${a.impression?`<div style="background: #f0f7fa; padding: 10px 14px; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 13px; text-transform: uppercase;">Radiological Impression / Conclusion:</b><div style="margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f172a;">${t(a.impression)}</div></div>`:""}
            ${a.recommendation?`<div><b style="color: #075c91;">Recommendations:</b><div style="margin-top: 2px;">${t(a.recommendation)}</div></div>`:""}
          </div>
        </section>
      `}else{const o=e.results||[],a={},N={};(Array.isArray(e==null?void 0:e.laboratoryTests)?e.laboratoryTests:Array.isArray(s==null?void 0:s.laboratoryTests)?s.laboratoryTests:[]).forEach(i=>{var A,g;if(!i||typeof i!="object")return;const p=i.category?typeof i.category=="object"?i.category.name||"":String(i.category):"",l=Array.isArray(i.parameters)&&i.parameters.length>0?typeof i.parameters[0]=="string"?i.parameters[0]:((A=i.parameters[0])==null?void 0:A.name)||((g=i.parameters[0])==null?void 0:g.sampleName):i.name,d=C(p,l||i.name),b=i.subcategory||"";Array.isArray(i.parameters)&&i.parameters.forEach(m=>{const z=typeof m=="string"?m:(m==null?void 0:m.name)||(m==null?void 0:m.sampleName)||"";z&&(a[z]=d,b&&(N[z]=b.toUpperCase()))}),i.name&&(a[i.name]=d,b&&(N[i.name]=b.toUpperCase()))});const T=new Map;o.forEach(i=>{const p=C(i.category||a[i.sampleName],i.sampleName),l=(i.subcategory||N[i.sampleName]||"").toUpperCase();T.has(p)||T.set(p,new Map);const d=T.get(p),b=l||"GENERAL";d.has(b)||d.set(b,[]),d.get(b).push(i)});const j=Array.from(T.entries()).sort(([i],[p])=>{const l=_.indexOf(i),d=_.indexOf(p);return l!==-1&&d!==-1?l-d:l!==-1?-1:d!==-1?1:i.localeCompare(p)}),J=Array.isArray(e.testInterpretations)?e.testInterpretations:[],Q=i=>{const p=C(i),l=J.find(d=>C(d.testName)===p);return(l==null?void 0:l.interpretations)||[]};let f="";j.length>0?j.forEach(([i,p])=>{f+=`<div class="result-cat-block" style="margin-bottom: 22px;"><h4 class="result-cat-header">${t(i)}</h4>`,p.forEach((d,b)=>{b!=="GENERAL"&&(f+=`<h5 style="margin: 6px 0 4px 0; font-size: 11px; text-transform: uppercase; color: #075c91; background: #e8f5fa; padding: 3px 8px; border-radius: 4px; display: inline-block;">${t(b)}</h5>`);const A=d.map(g=>{const m=ee(g,s.sex);return`<tr><td><b>${t(g.sampleName)}</b>${g.remarks?`<small>${t(g.remarks)}</small>`:""}</td><td>${t(g.result)}</td><td>${t(g.unit)}</td><td>${t(g.referenceValue)}</td><td><b>${t(m)}</b></td></tr>`}).join("");f+=`<table style="margin-bottom: 6px;"><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${A}</tbody></table>`});const l=Q(i);l.length>0&&(f+='<div style="margin: 6px 0 14px 0; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #075c91; border-radius: 4px;"><b style="color: #075c91; font-size: 11px; text-transform: uppercase;">Clinical Interpretation:</b>',l.forEach(d=>{f+=`<div style="margin-top: 4px; font-size: 11px; color: #203640;"><b>${t(d.title)}:</b> ${t(d.interpretation)}</div>`}),f+="</div>"),f+="</div>"}):f='<table><thead><tr><th>Test / Parameter</th><th>Result</th><th>SI Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody><tr><td colspan="5">No laboratory results recorded.</td></tr></tbody></table>',v=`
      <section class="section">
        <h2>Laboratory Results</h2>
        ${f}
        ${e.comments?`<p style="margin-top: 10px;"><b>General remarks:</b> ${t(e.comments)}</p>`:""}
      </section>
    `}const Y=u?`
    <footer class="footer">
      <span>Prepared / Authorized by<br><b>${S}</b></span>
      <span>Approved by<br><b>Dr. ${H}</b> (${t(R)})</span>
      <span>ETU Diagnostic Laboratory</span>
    </footer>
  `:"";return`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ETU Diagnostic Laboratory Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eaf1f5; color: #203640; font: 13.5px Arial, sans-serif; }
    .toolbar { padding: 10px; text-align: center; background: #063d5b; }
    .toolbar button { padding: 7px 14px; border: 0; border-radius: 5px; margin: 0 4px; font-weight: bold; cursor: pointer; }
    .toolbar .primary { background: #17a2b8; color: white; }
    .page { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 14mm; background: white; box-shadow: 0 2px 14px rgba(0,0,0,0.15); page-break-after: always; }
    .header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 3px solid #087ca8; padding-bottom: 12px; }
    .logo { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 15px; background: linear-gradient(135deg, #075c91, #10a4c7); color: #fff; font-size: 22px; font-weight: 800; margin-bottom: 8px; }
    .header h1 { margin: 6px 0 0; color: #075c91; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p.sub { margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; }
    .section { margin-top: 18px; }
    .section h2 { margin: 0 0 10px; padding: 7px 11px; background: #e8f5fa; color: #075c91; border-left: 4px solid #0b95b7; font-size: 12.5px; text-transform: uppercase; letter-spacing: .5px; }
    .patient { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; font-size: 12.5px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; }
    .patient div { display: flex; gap: 8px; }
    .patient b { min-width: 115px; color: #475569; }
    .result-cat-block { margin-bottom: 16px; }
    .result-cat-header { margin: 0 0 6px 0; padding: 6px 12px; background: #075c91; color: #ffffff; border-radius: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #075c91; color: white; text-align: left; padding: 8px 10px; font-size: 12px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #d6e2e7; font-size: 12.5px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td small { display: block; color: #657d87; margin-top: 4px; font-size: 11px; }
    .rich-report-body img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 6px; }
    .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #c9d9df; display: flex; justify-content: space-between; color: #59727c; font-size: 11px; }
    .footer b { color: #203640; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { margin: 0; width: auto; min-height: 0; padding: 0; box-shadow: none; }
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
        ${h}
        <div>
          <h1>ETU Diagnostic Laboratory</h1>
          <p class="sub">${$}</p>
        </div>
      </header>
    `:`
      <div style="border-bottom: 2px solid #075c91; padding-bottom: 6px; margin-bottom: 14px;">
        <h2 style="margin: 0; color: #075c91; font-size: 18px; text-transform: uppercase;">${$}</h2>
      </div>
    `}

    <section class="section" style="margin-top: 14px;">
      <h2>Patient & Case Information</h2>
      <div class="patient">
        <div><b>Patient Name</b>${t(s.name)}</div>
        <div><b>Patient ID</b>${t(s.patientId)}</div>
        <div><b>Age / Sex</b>${t(s.age)} / ${t(s.sex)}</div>
        <div><b>Phone</b>${t(s.phone)}</div>
        <div><b>Examination Type</b>${t(e.testType||e.customExaminationName||e.ultrasoundSubtype||e.examinationType||O)}</div>
        <div><b>Registration Date</b>${t(K)}</div>
        <div><b>Report Date</b>${t(P)}</div>
        <div><b>Branch</b>📍 ${t(e.branchName||s.branchName||"Main")}</div>
        ${W}
        ${D}
      </div>
    </section>

    ${v}

    <section class="section">
      <h2>Authorization & Sign-off</h2>
      <div class="patient">
        <div><b>Authorized Specialist</b>${S}</div>
        <div><b>Approved By</b>Dr. ${H} (${t(R)})</div>
        <div><b>Approval Date</b>${t(P)}</div>
      </div>
    </section>

    ${Y}
  </main>
</body>
</html>`}async function ne(e,r,n,w){typeof r!="string"&&(n=r||n||q(),r=X()),n||(n=q());const x=typeof e=="string"?e:e==null?void 0:e._id;if(!x)throw new Error("The requested document could not be loaded.");const y=window.open("","_blank","width=980,height=900");if(!y)throw new Error("Print preview was blocked. Please allow pop-ups and try again.");try{let c=typeof e=="object"?e:null,s="",u="";if(!c||!c.patient)try{const h=await k(`/final-reports/${x}`,{token:r});c=h.report,s=h.logoBase64,u=h.referralHospitalAddress}catch{try{c=(await k(`/pathology/cases/${x}`,{token:r})).case}catch{c=(await k(`/radiology/cases/${x}`,{token:r})).case}}y.document.write(te(c,n,s,u,w)),y.document.close()}catch(c){throw y.close(),new Error(c.message||"The requested document could not be loaded.")}}export{ne as p};
