import{n as T}from"./categoryHelper-DRBJIStQ.js";import{f as h}from"./currencyHelper-Bz2jO5_A.js";const X=["WBC","RBC","HGB","HCT","MCV","MCH","MCHC","PLT","LYM","MID","GRAN","RDW","MPV","PDW","PCT","NEUTROPHIL","LYMPHOCYTE","MONOCYTE","EOSINOPHIL","BASOPHIL","WHITE BLOOD","RED BLOOD","HEMOGLOBIN","HEMATOCRIT","PLATELET"];function Y(e,d=""){var s;if(!e||e.parentBundle==="Urine Microscopy"||e.parentBundle==="Chemical Analysis")return!1;const o=(e.subcategory||"").trim().toUpperCase();if(o==="URINE MICROSCOPY"||o==="CHEMICAL ANALYSIS"||/MICROSCOP/i.test(o)||/^CHEM/i.test(o))return!1;const t=T(d||(typeof e.category=="object"?(s=e.category)==null?void 0:s.name:e.category)||e.categoryName||"").toUpperCase();if(t==="URINALYSIS"||/^URIN/i.test(t)||t.includes("URINE"))return!1;if(o==="CBC"||e.parentBundle==="CBC")return!0;const i=(e.name||"").trim().toUpperCase();return t==="HEMATOLOGY"||/^HEMATO/i.test(t)?o==="CBC"?!0:["ESR","ERYTHROCYTE SEDIMENTATION RATE","BLOOD FILM","PERIPHERAL MORPHOLOGY","RETICULOCYTE COUNT","CD4 COUNT"].includes(i)?!1:X.some(l=>i.includes(l)):!!(i.startsWith("CBC")||i.includes("(CBC)"))}function v(e,d=""){if(!e)return!1;const o=(e.name||"").trim().toUpperCase(),t=(e.subcategory||"").trim().toUpperCase();return/PREGNANCY/i.test(o)||/HCG/i.test(o)||/PREGNANCY/i.test(t)}function w(e,d=""){var l;if(!e||v(e,d))return!1;const o=(e.subcategory||"").trim().toUpperCase(),t=(e.name||"").trim().toUpperCase(),i=T(d||(typeof e.category=="object"?(l=e.category)==null?void 0:l.name:e.category)||e.categoryName||"").toUpperCase();if(e.parentBundle==="Chemical Analysis"||o==="CHEMICAL ANALYSIS"||o==="CHEMICAL"||/^CHEMICAL/i.test(o)||t==="URINALYSIS (ROUTINE)"||t==="CHEMICAL ANALYSIS"||t==="URINALYSIS"||t==="ROUTINE URINALYSIS")return!0;const s=["SPECIFIC GRAVITY","LEUKOCYTE ESTERASE","PH","NITRITE","GLUCOSE","PROTEIN","BLOOD","KETONE","BILIRUBIN","UROBILINOGEN"];return i==="URINALYSIS"||/^URIN/i.test(i)||e.parentBundle==="Chemical Analysis"?s.includes(t):!!(s.includes(t)&&(/CHEM/i.test(o)||/URIN/i.test(i)))}function H(e,d=""){var l;if(!e||v(e,d))return!1;const o=(e.subcategory||"").trim().toUpperCase(),t=(e.name||"").trim().toUpperCase(),i=T(d||(typeof e.category=="object"?(l=e.category)==null?void 0:l.name:e.category)||e.categoryName||"").toUpperCase();if(e.parentBundle==="Urine Microscopy"||o==="URINE MICROSCOPY"||o==="MICROSCOPY"||/MICROSCOP/i.test(o)||t==="URINE MICROSCOPY"||t==="MICROSCOPY")return!0;const s=["WBC","RBC","EPITHELIAL CELLS","WBC CASTS","RBC CASTS","GRANULAR CASTS","AMORPHOUS PHOSPHATE CRYSTAL","AMORPHOUS URATE CRYSTAL","CALCIUM OXALATE CRYSTAL","TRIPLE PHOSPHATE CRYSTAL","BACTERIA","OTHERS"];return i==="URINALYSIS"||/^URIN/i.test(i)||e.parentBundle==="Urine Microscopy"?s.includes(t):!!(s.includes(t)&&(/MICROSCOP/i.test(o)||/URIN/i.test(i)))}function k(e,d=""){var s;if(!e)return!1;const o=(e.name||"").trim().toUpperCase();if(/^MAGNESIUM/i.test(o)||/^PHOSPHORUS/i.test(o)||/^PHOSPHATE/i.test(o)||o==="MG")return!1;const t=T(d||(typeof e.category=="object"?(s=e.category)==null?void 0:s.name:e.category)||e.categoryName||"").toUpperCase();if(t==="OTHER TESTS"||t==="REFERRAL")return!1;const i=(e.subcategory||"").trim().toUpperCase();return t==="SERUM ELECTROLYTE"||/^SERUM ELECTROLYTE$/i.test(t)||/^ELECTROLYTE/i.test(t)||i==="SERUM ELECTROLYTE"||i==="ELECTROLYTE"||e.parentBundle==="Serum Electrolyte"||/^SERUM ELECTROLYTE/i.test(o)||o.includes("(K-LYTE")}function q(e={},d={}){var M,B;const{testCategories:o=[],cbcGroupPrice:t=150,paymentDetails:i={}}=d,s=!!e._id,l=e.name||"Walk-in Patient",$=e.patientId||"TEMP-REG",_=e.receiptNumber||"RC-PENDING",S=e.paymentDate||e.registrationDate,L=S&&!isNaN(new Date(S).getTime())?new Date(S):new Date,G=L.toLocaleDateString(),z=L.toLocaleTimeString(),W=(s?(M=e.laboratoryTests)!=null&&M.length?e.laboratoryTests:e.sampleTypes:e.samplesSelected||e.laboratoryTests||e.sampleTypes)||[],C=new Map;o.forEach(n=>{const r=(n.name||"").trim().toUpperCase();(n.tests||[]).forEach(u=>{if(u._id&&C.set(String(u._id),{...u,categoryName:n.name}),u.name){const y=u.name.trim().toUpperCase();C.set(`${r}::${y}`,{...u,categoryName:n.name}),C.has(y)||C.set(y,{...u,categoryName:n.name})}})});const N=[];W.forEach(n=>{var b,a;if(!n)return;let r=null;if(typeof n=="string")r=C.get(String(n));else{const f=((typeof n.category=="object"?(b=n.category)==null?void 0:b.name:n.category)||n.categoryName||"").trim().toUpperCase(),P=(n.name||"").trim().toUpperCase();r=C.get(String(n._id))||(f&&P?C.get(`${f}::${P}`):null)||C.get(P)}const u=n._id||(r==null?void 0:r._id)||String(Math.random()),y=n.name||(r==null?void 0:r.name)||"Laboratory Test",m=n.subcategory||(r==null?void 0:r.subcategory)||"",p=(typeof n.category=="object"?(a=n.category)==null?void 0:a.name:n.category)||n.categoryName||(r==null?void 0:r.categoryName)||"",E=T(p||"GENERAL LABORATORY");let c=Number((r==null?void 0:r.price)??n.price??0);N.push({_id:u,name:y,subcategory:m,categoryName:E,price:c})});const R=new Map;N.forEach(n=>{const r=n.categoryName||"GENERAL LABORATORY";R.has(r)||R.set(r,[]),R.get(r).push(n)});let g=0;const O=[];R.forEach((n,r)=>{const u=/^HEMATOLOGY$/i.test(r),y=/^URINALYSIS$/i.test(r)||/^URINE/i.test(r),m=[];if(u){const p=n.filter(c=>Y(c,r)),E=n.filter(c=>!Y(c,r));if(p.length>0){const c=Number(t??150);g+=c,m.push({isCbcParent:!0,name:"CBC — Complete Blood Count",price:c,children:p.map(b=>({_id:b._id,name:b.name,included:!0}))})}E.forEach(c=>{g+=c.price||0,m.push({_id:c._id,isCbcParent:!1,name:c.name,price:c.price||0})})}else if(y){const p=n.filter(a=>w(a,r)),E=n.filter(a=>H(a,r)),c=n.filter(a=>v(a,r)),b=n.filter(a=>!w(a,r)&&!H(a,r)&&!v(a,r));if(p.length>0){const a=Number(d.urineChemicalPrice??300);g+=a,m.push({isCbcParent:!0,name:"Chemical Analysis",price:a,children:p.map(f=>({_id:f._id,name:f.name,included:!0}))})}if(E.length>0){const a=Number(d.urineMicroscopyPrice??300);g+=a,m.push({isCbcParent:!0,name:"Urine Microscopy",price:a,children:E.map(f=>({_id:f._id,name:f.name,included:!0}))})}c.forEach(a=>{const f=a.price||200;g+=f,m.push({_id:a._id,isCbcParent:!1,name:a.name,price:f})}),b.forEach(a=>{g+=a.price||0,m.push({_id:a._id,isCbcParent:!1,name:a.name,price:a.price||0})})}else if(/^SERUM ELECTROLYTE$/i.test(r)||/^ELECTROLYTE/i.test(r)){const p=n.filter(k),E=n.filter(c=>!k(c));if(p.length>0){const c=Number(d.serumElectrolytePrice??1e3);g+=c,m.push({isCbcParent:!0,name:"Serum Electrolyte",price:c,children:p.map(b=>({_id:b._id,name:b.name,included:!0}))})}E.forEach(c=>{g+=c.price||1e3,m.push({_id:c._id,isCbcParent:!1,name:c.name,price:c.price||1e3})})}else n.forEach(p=>{g+=p.price||0,m.push({_id:p._id,isCbcParent:!1,name:p.name,price:p.price||0})});m.length>0&&O.push({categoryName:r,items:m})});const A=Number(e.discountPercent??0);let I=e.subtotal!==void 0&&s?Number(e.subtotal):g,U=e.discountAmount!==void 0&&s?Number(e.discountAmount):I*A/100,x=e.grandTotal!==void 0&&s?Number(e.grandTotal):I-U;s&&e.grandTotal!==void 0&&(x=Number(e.grandTotal));const j=e.paymentMethod||i.method||"Cash",K=i.received!==void 0?Number(i.received):void 0,F=i.balance!==void 0?Number(i.balance):void 0,V=(typeof e.registeredBy=="object"?(B=e.registeredBy)==null?void 0:B.fullName:e.registeredBy)||i.cashier||"Receptionist";return{receiptNumber:_,patientId:$,patientName:l,dateStr:G,timeStr:z,isReprint:s,registrationType:e.registrationType||"Regular Patient",patientCategory:e.patientCategory||e.serviceType||"Laboratory Test",serviceType:e.serviceType||"Laboratory Test",paymentMethod:j,amountReceived:K,changeBalance:F,cashier:V,subtotal:I,discountPercent:A,discountAmount:U,grandTotal:x,categories:O,hasTests:O.length>0}}function D(e){let d="";e.hasTests?e.categories.forEach(i=>{d+=`
        <div class="pos80-cat-group">
          <div class="pos80-cat-title">${i.categoryName}</div>
      `,i.items.forEach(s=>{s.isCbcParent?d+=`
            <div class="pos80-cbc-block">
              <div class="pos80-item-row pos80-cbc-main">
                <span class="pos80-item-name">${s.name}</span>
                <span class="pos80-item-price">${h(s.price)}</span>
              </div>
              <div class="pos80-cbc-subtests">
                ${s.children.map(l=>`
                  <div class="pos80-cbc-subitem">
                    <span class="pos80-check">✓</span>
                    <span class="pos80-subname">${l.name}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `:d+=`
            <div class="pos80-item-row">
              <span class="pos80-item-name">${s.name}</span>
              <span class="pos80-item-price">${h(s.price)}</span>
            </div>
          `}),d+="</div>"}):d='<div style="font-size:9.5px; font-style:italic; color:#444; padding:4px 0;">Counseling Only Service</div>';let o="";e.isReprint&&e.discountPercent>0&&(o=`<div><strong>Discount:</strong> ${e.discountPercent}% (${h(e.discountAmount)})</div>`);let t="";return e.amountReceived!==void 0&&(t+=`<div><strong>Amount Received:</strong> ${h(e.amountReceived)}</div>`),e.changeBalance!==void 0&&(t+=`<div><strong>Change:</strong> ${h(e.changeBalance)}</div>`),`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pos80-container {
      width: 72mm;
      margin: 0 auto;
      padding: 4mm 0 8mm 0;
    }
    .pos80-header {
      text-align: center;
      margin-bottom: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pos80-subtitle {
      font-size: 10px;
      margin-top: 1px;
    }
    .pos80-divider {
      border: none;
      border-top: 1px dashed #000000;
      margin: 5px 0;
    }
    .pos80-info {
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-heading {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 4px 0 3px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-cat-group {
      margin-bottom: 6px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cat-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
      border-bottom: 1px dotted #333333;
      padding-bottom: 1px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-item-name {
      flex: 1;
      padding-right: 6px;
      word-break: break-word;
    }
    .pos80-item-price {
      white-space: nowrap;
      text-align: right;
      font-weight: 600;
    }
    .pos80-cbc-block {
      margin-bottom: 4px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cbc-main {
      font-weight: bold;
      font-size: 10px;
    }
    .pos80-cbc-subtests {
      padding-left: 8px;
      margin-top: 2px;
      margin-bottom: 3px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .pos80-cbc-subitem {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 9px;
      line-height: 1.35;
      color: #111111;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-check {
      font-weight: bold;
    }
    .pos80-subname {
      word-break: break-word;
    }
    .pos80-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: bold;
      margin-top: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-summary {
      font-size: 9.5px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pos80-footer {
      text-align: center;
      font-size: 9px;
      font-style: italic;
      margin-top: 10px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media screen {
      body {
        padding: 10px 0;
        background: #f8fafc;
      }
      .pos80-container {
        background: #ffffff;
        padding: 5mm;
        box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      }
    }
    @media print {
      body {
        background: #ffffff;
      }
      .pos80-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="pos80-container">
    <div class="pos80-header">
      <div class="pos80-title">ETU Diagnostic Lab</div>
      <div class="pos80-subtitle">
        Non-official payout receipt<br />
        Used for internal auditing only
      </div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-info">
      <div><strong>Receipt #:</strong> ${e.receiptNumber}</div>
      <div><strong>Patient ID:</strong> ${e.patientId}</div>
      <div><strong>Patient:</strong> ${e.patientName}</div>
      <div><strong>Date:</strong> ${e.dateStr}</div>
      <div><strong>Time:</strong> ${e.timeStr}</div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-heading">SELECTED TESTS</div>
    ${d}
    <hr class="pos80-divider" />

    <div class="pos80-total-row">
      <span>GRAND TOTAL</span>
      <span>${h(e.grandTotal)}</span>
    </div>

    ${e.isReprint?`
    <div class="pos80-summary" style="margin-top: 4px;">
      <div><strong>Patient Category:</strong> ${e.registrationType}</div>
      <div><strong>Service Type:</strong> ${e.patientCategory}</div>
      ${o}
    </div>
    `:""}
    <hr class="pos80-divider" />

    <div class="pos80-summary">
      <div><strong>Payment Method:</strong> ${e.paymentMethod}</div>
      ${t}
      <div><strong>Cashier:</strong> ${e.cashier}</div>
    </div>
    <hr class="pos80-divider" />

    <div class="pos80-footer">
      Thank you for choosing ETU.<br />
      Professional laboratory diagnostics.
    </div>
  </div>
</body>
</html>`}function Z(e,d={}){const o=q(e,d),t=D(o);let i=document.getElementById("pos80-thermal-frame");if(i)try{i.remove()}catch{}i=document.createElement("iframe"),i.id="pos80-thermal-frame",i.style.position="fixed",i.style.left="0",i.style.top="0",i.style.width="80mm",i.style.height="100px",i.style.opacity="0",i.style.pointerEvents="none",i.style.border="none",i.style.zIndex="-9999",document.body.appendChild(i);const s=i.contentWindow.document;s.open(),s.write(t),s.close(),setTimeout(()=>{try{i.contentWindow.focus(),i.contentWindow.print()}catch(l){console.warn("Iframe print fallback to window.print():",l),window.print()}},250)}export{k as a,w as b,H as c,v as d,Z as e,Y as i,q as p};
