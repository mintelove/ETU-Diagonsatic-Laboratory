import{p as q,r as d,j as e,q as J,i as Q}from"./index-B7qoxV_w.js";import{F as Z}from"./flagHelper-OjoKup0l.js";import{n as h,f as W,M as L}from"./doctorNameHelper-D1tsotDR.js";function re(){var N,R,A,B,D,E;const{token:f}=q(),[r,C]=d.useState(null),[I,u]=d.useState(!0),[c,x]=d.useState(""),[y,S]=d.useState(!1);d.useLayoutEffect(()=>{const t=document.body.style.backgroundColor,i=document.documentElement.getAttribute("data-theme"),o=document.body.className;return document.body.style.backgroundColor="#f1f3f5",document.documentElement.setAttribute("data-theme","light"),document.documentElement.classList.remove("dark"),document.body.classList.remove("dark"),()=>{document.body.style.backgroundColor=t,i?document.documentElement.setAttribute("data-theme",i):document.documentElement.removeAttribute("data-theme"),document.body.className=o}},[]),d.useEffect(()=>{async function t(){if(!f){x("Report not found."),u(!1);return}try{u(!0),x("");const i="http://localhost:5000/api".replace(/\/+$/,"");let o=await fetch(`${i}/reports/public/${f}`);if(o.status===404){const l=await fetch(`${i}/public/reports/${f}`);l.ok&&(o=l)}const a=await o.json();if(!o.ok)throw o.status===404?new Error("Report not found."):o.status===403?new Error(a.message||"This report is not available for public viewing."):new Error(a.message||"Unable to load report. Please try again.");C(a.report)}catch(i){Q(i)?x(""):x(i.message||"Unable to load report.")}finally{u(!1)}}t()},[f]);const P=()=>{const t=window.location.href;navigator.clipboard.writeText(t),S(!0),setTimeout(()=>S(!1),3e3)},U=()=>{const t="http://localhost:5000/api".replace(/\/+$/,"");window.open(`${t}/reports/public/${f}/pdf`,"_blank")};if(I)return e.jsx("div",{style:{minHeight:"100vh",height:"auto",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f3f5",color:"#0f172a",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',padding:"16px",boxSizing:"border-box"},children:e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:"48px",height:"48px",margin:"0 auto 16px",border:"4px solid #e2e8f0",borderTopColor:"#075c91",borderRadius:"50%",animation:"spin 1s linear infinite"}}),e.jsx("h2",{style:{fontSize:"1.1rem",color:"#0f172a",fontWeight:700,margin:"0 0 4px 0"},children:"Processing..."}),e.jsx("p",{style:{color:"#64748b",fontSize:"0.85rem",margin:0},children:"Loading official diagnostic report…"})]})});if(c||!r)return e.jsx("div",{style:{minHeight:"100vh",height:"auto",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f3f5",color:"#0f172a",padding:"20px",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',boxSizing:"border-box"},children:e.jsxs("div",{style:{maxWidth:"480px",width:"100%",background:"#ffffff",borderRadius:"16px",padding:"32px 24px",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.05)",textAlign:"center",border:"1px solid #cbd5e1",boxSizing:"border-box"},children:[e.jsx("div",{style:{width:"56px",height:"56px",borderRadius:"50%",background:c.includes("not available")?"#fef3c7":"#fef2f2",color:c.includes("not available")?"#d97706":"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",margin:"0 auto 16px"},children:c.includes("not available")?"🔒":"⚠️"}),e.jsx("h2",{style:{fontSize:"1.25rem",color:"#0f172a",marginBottom:"8px",fontWeight:700},children:c||"Unable to load report. Please try again."}),e.jsx("p",{style:{color:"#64748b",fontSize:"0.9rem",lineHeight:"1.5",marginBottom:"24px"},children:c.includes("not available")?"This report has not completed final administrative approval or sharing is disabled.":c.includes("not found")?"The requested report token is invalid or has been removed.":"Please check your connection or contact ETU Diagnostic Laboratory support."}),e.jsx("div",{style:{padding:"12px",background:"#f1f5f9",borderRadius:"8px",fontSize:"0.8rem",color:"#475569"},children:"🔒 ETU Diagnostic Laboratory — Official Results Portal"})]})});const n=r.patient||{},F=r.patientName||n.name||"—",O=r.patientId||n.patientId||"—",H=r.age||n.age||"—",w=r.sex||n.sex||"—",M=n.phone||"—",G=(n.sampleTypes||[]).map(t=>(t==null?void 0:t.name)||t).filter(Boolean).join(", ")||"Specimen Assigned",$=n.collectionDate||n.createdDate||r.createdDate?new Date(n.collectionDate||n.createdDate||r.createdDate).toLocaleString():"—",T=r.approvedDate||r.approvalDate||r.reportDate?new Date(r.approvedDate||r.approvalDate||r.reportDate).toLocaleString():new Date().toLocaleString(),V=r.results||[],X=Array.isArray(r==null?void 0:r.laboratoryTests)?r.laboratoryTests:Array.isArray(n==null?void 0:n.laboratoryTests)?n.laboratoryTests:r.tests||[],j={},v={};X.forEach(t=>{var m,b;if(!t||typeof t!="object")return;const i=t.category?typeof t.category=="object"?t.category.name||"":String(t.category):t.categoryName||"",o=Array.isArray(t.parameters)&&t.parameters.length>0?typeof t.parameters[0]=="string"?t.parameters[0]:((m=t.parameters[0])==null?void 0:m.name)||((b=t.parameters[0])==null?void 0:b.sampleName):t.testName||t.name,a=h(i,o||t.testName||t.name),l=t.subcategory||"";Array.isArray(t.parameters)&&t.parameters.forEach(p=>{const k=typeof p=="string"?p:(p==null?void 0:p.name)||(p==null?void 0:p.sampleName)||"";k&&(j[k]=a,l&&(v[k]=l.toUpperCase()))});const s=t.testName||t.name||"";s&&(j[s]=a,l&&(v[s]=l.toUpperCase()))});const g=new Map;V.forEach(t=>{const i=t.parameter||t.sampleName||t.name||"",o=h(t.category||j[i],i),a=(t.subcategory||v[i]||"").toUpperCase();g.has(o)||g.set(o,new Map);const l=g.get(o),s=a||"GENERAL";l.has(s)||l.set(s,[]),l.get(s).push(t)});const z=Array.from(g.entries()).sort(([t],[i])=>{const o=L.indexOf(t),a=L.indexOf(i);return o!==-1&&a!==-1?o-a:o!==-1?-1:a!==-1?1:t.localeCompare(i)}),Y=Array.isArray(r.testInterpretations)?r.testInterpretations:[],_=t=>{const i=h(t),o=Y.find(a=>h(a.testName)===i);return(o==null?void 0:o.interpretations)||[]};return e.jsxs("div",{className:"public-report-page",style:{minHeight:"100vh",height:"auto",width:"100%",background:"#f1f3f5",color:"#0f172a",padding:"24px 16px",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',boxSizing:"border-box",overflowX:"hidden",overflowY:"visible",WebkitOverflowScrolling:"touch"},children:[e.jsx("style",{children:`
        :root, html, body {
          color-scheme: light !important;
          background-color: #f1f3f5 !important;
          color: #0f172a !important;
        }
        .public-report-page,
        .public-report-page *,
        .public-report-page *::before,
        .public-report-page *::after {
          color-scheme: light !important;
          box-sizing: border-box !important;
          transition: none !important;
          animation: none !important;
        }
        .public-report-page {
          background-color: #f1f3f5 !important;
          color: #0f172a !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .public-report-main,
        .public-report-main * {
          cursor: default !important;
        }
        .public-report-main {
          position: relative !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        .public-report-watermark {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          pointer-events: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          z-index: 0 !important;
          overflow: hidden !important;
        }
        .public-report-watermark span {
          font-size: 4.2rem !important;
          font-weight: 700 !important;
          color: #075c91 !important;
          opacity: 0.07 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.22em !important;
          transform: rotate(-35deg) !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          user-select: none !important;
          font-family: 'Georgia', 'Times New Roman', 'Palatino Linotype', serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .public-report-main > *:not(.public-report-watermark) {
          position: relative !important;
          z-index: 1 !important;
        }
        .public-report-page .public-category-header,
        .public-report-page h4 {
          background-color: #075c91 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .public-report-page .public-category-header:hover,
        .public-report-page h4:hover {
          background-color: #075c91 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .public-report-page table {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .public-report-page table th,
        .public-report-page table th:hover {
          background-color: #075c91 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .public-report-page table td {
          color: #0f172a !important;
          border-bottom-color: #d6e2e7 !important;
        }
        .public-report-page table tr:nth-child(even) td,
        .public-report-page table tr:nth-child(even):hover td {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        .public-report-page table tr:nth-child(odd) td,
        .public-report-page table tr:nth-child(odd):hover td {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .public-report-page table tr:hover td strong {
          color: #0f172a !important;
          font-weight: 700 !important;
        }
        @media print {
          .public-report-actions { display: none !important; }
          .public-report-page { background: #ffffff !important; padding: 0 !important; }
          .public-report-main { box-shadow: none !important; border: none !important; padding: 0 !important; }
          .public-report-watermark {
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
            z-index: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .public-report-watermark span {
            font-size: 52pt !important;
            font-weight: 700 !important;
            color: #075c91 !important;
            opacity: 0.07 !important;
            transform: rotate(-35deg) !important;
            letter-spacing: 8px !important;
            font-family: 'Georgia', 'Times New Roman', 'Palatino Linotype', serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}),e.jsxs("div",{style:{maxWidth:"850px",width:"100%",margin:"0 auto",boxSizing:"border-box"},children:[e.jsxs("header",{className:"public-report-actions",style:{background:"#ffffff",borderRadius:"16px",padding:"16px 20px",marginBottom:"20px",boxShadow:"0 4px 12px rgba(0,0,0,0.03)",border:"1px solid #cbd5e1",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:"12px",boxSizing:"border-box"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 10px",background:"#e0f2fe",color:"#0369a1",borderRadius:"20px",fontSize:"0.75rem",fontWeight:700,marginBottom:"6px"},children:"✓ VERIFIED DIAGNOSTIC REPORT"}),e.jsx("h1",{style:{margin:0,fontSize:"1.3rem",color:"#075c91",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px"},children:"ETU DIAGNOSTIC LABORATORY"}),e.jsx("p",{style:{margin:"2px 0 0 0",fontSize:"0.82rem",fontWeight:700,color:"#0369a1",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Laboratory Test Report"})]}),e.jsxs("div",{style:{display:"flex",gap:"10px",flexWrap:"wrap"},children:[e.jsx("button",{type:"button",onClick:P,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"8px",background:y?"#10b981":"#f1f5f9",color:y?"#fff":"#334155",border:"none",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",transition:"all 0.2s"},children:y?"✓ Link Copied!":"🔗 Copy Share Link"}),r.allowPdfDownload!==!1&&e.jsx("button",{type:"button",onClick:U,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 18px",borderRadius:"8px",background:"#075c91",color:"#ffffff",border:"none",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",boxShadow:"0 2px 4px rgba(7,92,145,0.2)"},children:"📥 Download PDF"})]})]}),e.jsxs("main",{className:"public-report-main",style:{position:"relative",overflow:"hidden",background:"#ffffff",borderRadius:"16px",padding:"24px 20px",boxShadow:"0 4px 14px rgba(0,0,0,0.06)",border:"1px solid #cbd5e1",boxSizing:"border-box",overflowWrap:"break-word",wordBreak:"break-word",pointerEvents:"none",userSelect:"text",cursor:"default"},children:[e.jsx("div",{className:"public-report-watermark","aria-hidden":"true",children:e.jsx("span",{children:"ETU Diagnostic Laboratory"})}),e.jsxs("div",{style:{textAlign:"center",borderBottom:"3px solid #087ca8",paddingBottom:"16px",marginBottom:"20px"},children:[e.jsx("img",{src:J,alt:"ETU Diagnostic Laboratory Logo",style:{maxHeight:"95px",width:"auto",maxWidth:"100%",objectFit:"contain",margin:"0 auto 10px",display:"block"}}),e.jsx("h2",{style:{margin:0,color:"#075c91",fontSize:"1.5rem",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:800},children:"ETU Diagnostic Laboratory"}),e.jsx("p",{style:{margin:"4px 0 0 0",fontSize:"0.85rem",fontWeight:700,color:"#0369a1",textTransform:"uppercase",letterSpacing:"1px"},children:"Laboratory Test Report"})]}),e.jsxs("div",{style:{marginBottom:"24px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 10px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Patient Information"}),e.jsxs("div",{className:"public-info-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"10px 20px",fontSize:"0.88rem",background:"#f8fafc",padding:"14px 16px",borderRadius:"8px",border:"1px solid #cbd5e1",boxSizing:"border-box"},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Patient Name:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:F})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Patient ID:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:O})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Age / Sex:"})," ",e.jsxs("span",{style:{color:"#0f172a"},children:[H," / ",w]})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Phone:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:M})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Sample Type:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:G})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Collection Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:$})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Report Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:T})]}),(n.systolicBP||n.diastolicBP)&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Blood Pressure:"})," ",e.jsxs("span",{style:{color:"#0f172a"},children:[n.systolicBP||"—","/",n.diastolicBP||"—"," mmHg"]})]}),n.referralHospital&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Referral Hospital:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:n.referralHospital})]})]})]}),e.jsxs("div",{style:{marginBottom:"24px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 12px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Laboratory Results"}),z.length>0?z.map(([t,i])=>{const o=_(t);return e.jsxs("div",{style:{marginBottom:"22px"},children:[e.jsx("h4",{className:"public-category-header",style:{margin:"0 0 8px 0",padding:"7px 12px",background:"#075c91",color:"#ffffff",borderRadius:"5px",fontSize:"0.82rem",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:700},children:t}),Array.from(i.entries()).map(([a,l])=>e.jsxs("div",{style:{marginBottom:"10px"},children:[a!=="GENERAL"&&e.jsx("h5",{className:"public-subcategory-header",style:{margin:"4px 0 6px 0",fontSize:"0.75rem",textTransform:"uppercase",color:"#075c91",background:"#e8f5fa",padding:"3px 8px",borderRadius:"4px",display:"inline-block"},children:a}),e.jsx("div",{style:{width:"100%",overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:"6px"},children:e.jsxs("table",{style:{width:"100%",minWidth:"520px",borderCollapse:"collapse",background:"#ffffff"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Test / Parameter"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Result"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"SI Unit"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Reference Range"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"center",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Flag"})]})}),e.jsx("tbody",{children:l.map((s,m)=>{const b=s.parameter||s.sampleName||s.name||"";return e.jsxs("tr",{style:{background:m%2===0?"#ffffff":"#f8fafc",borderBottom:"1px solid #d6e2e7"},children:[e.jsxs("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#0f172a"},children:[e.jsx("strong",{style:{color:"#0f172a"},children:b}),s.remarks&&e.jsx("small",{style:{display:"block",color:"#657d87",marginTop:"2px",fontSize:"0.75rem"},children:s.remarks})]}),e.jsx("td",{className:"public-result-val",style:{padding:"9px",fontSize:"0.88rem",fontWeight:700,color:"#075c91"},children:s.result}),e.jsx("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#475569"},children:s.unit||"—"}),e.jsx("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#475569"},children:s.referenceValue||"—"}),e.jsx("td",{style:{padding:"9px",textAlign:"center"},children:e.jsx(Z,{flag:s.flag,result:s.result,referenceValue:s.referenceValue,sex:w})})]},m)})})]})})]},a)),o.length>0&&e.jsxs("div",{className:"public-interpretation-box",style:{margin:"6px 0 14px 0",padding:"8px 12px",background:"#f0f7fa",borderLeft:"4px solid #075c91",borderRadius:"4px"},children:[e.jsx("b",{style:{color:"#075c91",fontSize:"0.78rem",textTransform:"uppercase"},children:"Clinical Interpretation:"}),o.map((a,l)=>e.jsxs("div",{style:{marginTop:"4px",fontSize:"0.82rem",color:"#203640"},children:[e.jsxs("strong",{style:{color:"#0f172a"},children:[a.title,":"]})," ",a.interpretation]},l))]})]},t)}):e.jsx("div",{style:{width:"100%",overflowX:"auto",WebkitOverflowScrolling:"touch"},children:e.jsxs("table",{style:{width:"100%",minWidth:"520px",borderCollapse:"collapse",background:"#ffffff"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Test / Parameter"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Result"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"SI Unit"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Reference Range"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"center",padding:"9px",fontSize:"0.8rem"},children:"Flag"})]})}),e.jsx("tbody",{children:e.jsx("tr",{children:e.jsx("td",{colSpan:"5",style:{padding:"12px",textAlign:"center",color:"#64748b"},children:"No laboratory results recorded."})})})]})})]}),r.comments&&e.jsxs("div",{className:"public-remarks-box",style:{padding:"12px 16px",background:"#f8fafc",borderRadius:"8px",border:"1px solid #cbd5e1",marginBottom:"20px"},children:[e.jsx("strong",{style:{color:"#075c91",fontSize:"0.85rem"},children:"General Remarks:"}),e.jsx("p",{style:{margin:"4px 0 0",color:"#334155",fontSize:"0.88rem"},children:r.comments})]}),e.jsxs("div",{style:{marginBottom:"20px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 10px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Authorization"}),e.jsxs("div",{className:"public-info-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"10px 20px",fontSize:"0.88rem",background:"#f8fafc",padding:"14px 16px",borderRadius:"8px",border:"1px solid #cbd5e1",boxSizing:"border-box"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"11px",color:"#64748b",fontWeight:600},children:"Title: Head of ETU Diagnostic Laboratory"}),e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Prepared By:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:((N=r.technician)==null?void 0:N.fullName)||((R=r.submittedBy)==null?void 0:R.fullName)||r.collectorName||"Technician"})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Approved By:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:W(((A=r.approvedBy)==null?void 0:A.fullName)||(typeof r.approvedBy=="string"?r.approvedBy:"Approved"))})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Approval Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:T})]})]})]}),e.jsxs("footer",{style:{borderTop:"1px solid #c9d9df",paddingTop:"14px",marginTop:"24px",display:"flex",flexWrap:"wrap",justifyContent:"space-between",fontSize:"0.78rem",color:"#59727c",gap:"12px"},children:[e.jsxs("div",{children:["Title: Head of ETU Diagnostic Laboratory",e.jsx("br",{}),"Prepared by: ",e.jsx("strong",{style:{color:"#203640"},children:((B=r.technician)==null?void 0:B.fullName)||((D=r.submittedBy)==null?void 0:D.fullName)||r.collectorName||"Technician"})]}),e.jsxs("div",{children:["Approved by",e.jsx("br",{}),e.jsx("strong",{style:{color:"#203640"},children:W(((E=r.approvedBy)==null?void 0:E.fullName)||(typeof r.approvedBy=="string"?r.approvedBy:"Approved"))})]}),e.jsxs("div",{children:[e.jsx("br",{}),e.jsx("strong",{style:{color:"#203640"},children:"ETU Diagnostic Laboratory"})]})]})]})]})]})}export{re as PublicReportViewer,re as default};
