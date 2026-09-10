import{p as ae,k as ie,r as f,j as e,q as ne,i as se}from"./index-CSLwTApa.js";import{F as le}from"./flagHelper-BrWFEqPW.js";import{n as u,M as O}from"./categoryHelper-DRBJIStQ.js";import{l as pe,c as ce,f as $}from"./etu_cli-BwHrebo7.js";function ge(){var I,L,C,P,U,F;const{token:m}=ae(),[y,H]=ie(),z=y.get("stamp")||y.get("stampType"),[r,M]=f.useState(null),[j,N]=f.useState(z||null),[G,S]=f.useState(!0),[d,g]=f.useState(""),[k,R]=f.useState(!1);f.useLayoutEffect(()=>{const t=document.body.style.backgroundColor,a=document.documentElement.getAttribute("data-theme"),o=document.body.className;return document.body.style.backgroundColor="#f1f3f5",document.documentElement.setAttribute("data-theme","light"),document.documentElement.classList.remove("dark"),document.body.classList.remove("dark"),()=>{document.body.style.backgroundColor=t,a?document.documentElement.setAttribute("data-theme",a):document.documentElement.removeAttribute("data-theme"),document.body.className=o}},[]),f.useEffect(()=>{async function t(){var a;if(!m){g("Report not found."),S(!1);return}try{S(!0),g("");const o="http://localhost:5000/api".replace(/\/+$/,"");let i=await fetch(`${o}/reports/public/${m}`);if(i.status===404){const n=await fetch(`${o}/public/reports/${m}`);n.ok&&(i=n)}const l=await i.json();if(!i.ok)throw i.status===404?new Error("Report not found."):i.status===403?new Error(l.message||"This report is not available for public viewing."):new Error(l.message||"Unable to load report. Please try again.");M(l.report),!z&&((a=l.report)!=null&&a.stampType)&&N(l.report.stampType)}catch(o){se(o)?g(""):g(o.message||"Unable to load report.")}finally{S(!1)}}t()},[m]);const p=j??(r==null?void 0:r.stampType),A=p==="lab"?pe:p==="clinic"?ce:null,V=p==="clinic"?"ETU Clinic Stamp":"ETU Lab Stamp",B=t=>{const a=p===t?null:t;N(a);const o=new URLSearchParams(y);a?o.set("stamp",a):(o.delete("stamp"),o.delete("stampType")),H(o,{replace:!0})},X=()=>{const t=window.location.href;navigator.clipboard.writeText(t),R(!0),setTimeout(()=>R(!1),3e3)},Y=()=>{const t="http://localhost:5000/api".replace(/\/+$/,""),a=p?`?stampType=${p}`:"";window.open(`${t}/reports/public/${m}/pdf${a}`,"_blank")};if(G)return e.jsx("div",{style:{minHeight:"100vh",height:"auto",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f3f5",color:"#0f172a",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',padding:"16px",boxSizing:"border-box"},children:e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:"48px",height:"48px",margin:"0 auto 16px",border:"4px solid #e2e8f0",borderTopColor:"#075c91",borderRadius:"50%",animation:"spin 1s linear infinite"}}),e.jsx("h2",{style:{fontSize:"1.1rem",color:"#0f172a",fontWeight:700,margin:"0 0 4px 0"},children:"Processing..."}),e.jsx("p",{style:{color:"#64748b",fontSize:"0.85rem",margin:0},children:"Loading official diagnostic report…"})]})});if(d||!r)return e.jsx("div",{style:{minHeight:"100vh",height:"auto",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f3f5",color:"#0f172a",padding:"20px",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',boxSizing:"border-box"},children:e.jsxs("div",{style:{maxWidth:"480px",width:"100%",background:"#ffffff",borderRadius:"16px",padding:"32px 24px",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.05)",textAlign:"center",border:"1px solid #cbd5e1",boxSizing:"border-box"},children:[e.jsx("div",{style:{width:"56px",height:"56px",borderRadius:"50%",background:d.includes("not available")?"#fef3c7":"#fef2f2",color:d.includes("not available")?"#d97706":"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",margin:"0 auto 16px"},children:d.includes("not available")?"🔒":"⚠️"}),e.jsx("h2",{style:{fontSize:"1.25rem",color:"#0f172a",marginBottom:"8px",fontWeight:700},children:d||"Unable to load report. Please try again."}),e.jsx("p",{style:{color:"#64748b",fontSize:"0.9rem",lineHeight:"1.5",marginBottom:"24px"},children:d.includes("not available")?"This report has not completed final administrative approval or sharing is disabled.":d.includes("not found")?"The requested report token is invalid or has been removed.":"Please check your connection or contact ETU Diagnostic Laboratory support."}),e.jsx("div",{style:{padding:"12px",background:"#f1f5f9",borderRadius:"8px",fontSize:"0.8rem",color:"#475569"},children:"🔒 ETU Diagnostic Laboratory — Official Results Portal"})]})});const s=r.patient||{},_=r.patientName||s.name||"—",q=r.patientId||s.patientId||"—",J=r.age||s.age||"—",E=r.sex||s.sex||"—",Q=s.phone||"—",Z=(s.sampleTypes||[]).map(t=>(t==null?void 0:t.name)||t).filter(Boolean).join(", ")||"Specimen Assigned",K=s.collectionDate||s.createdDate||r.createdDate?new Date(s.collectionDate||s.createdDate||r.createdDate).toLocaleString():"—",D=r.approvedDate||r.approvalDate||r.reportDate?new Date(r.approvedDate||r.approvalDate||r.reportDate).toLocaleString():new Date().toLocaleString(),ee=r.results||[],te=Array.isArray(r==null?void 0:r.laboratoryTests)?r.laboratoryTests:Array.isArray(s==null?void 0:s.laboratoryTests)?s.laboratoryTests:r.tests||[],v={},w={};te.forEach(t=>{var x,h;if(!t||typeof t!="object")return;const a=t.category?typeof t.category=="object"?t.category.name||"":String(t.category):t.categoryName||"",o=Array.isArray(t.parameters)&&t.parameters.length>0?typeof t.parameters[0]=="string"?t.parameters[0]:((x=t.parameters[0])==null?void 0:x.name)||((h=t.parameters[0])==null?void 0:h.sampleName):t.testName||t.name,i=u(a,o||t.testName||t.name),l=t.subcategory||"";Array.isArray(t.parameters)&&t.parameters.forEach(c=>{const T=typeof c=="string"?c:(c==null?void 0:c.name)||(c==null?void 0:c.sampleName)||"";T&&(v[T]=i,l&&(w[T]=l.toUpperCase()))});const n=t.testName||t.name||"";n&&(v[n]=i,l&&(w[n]=l.toUpperCase()))});const b=new Map;ee.forEach(t=>{const a=t.parameter||t.sampleName||t.name||"",o=u(t.category||v[a],a),i=(t.subcategory||w[a]||"").toUpperCase();b.has(o)||b.set(o,new Map);const l=b.get(o),n=i||"GENERAL";l.has(n)||l.set(n,[]),l.get(n).push(t)});const W=Array.from(b.entries()).sort(([t],[a])=>{const o=O.indexOf(t),i=O.indexOf(a);return o!==-1&&i!==-1?o-i:o!==-1?-1:i!==-1?1:t.localeCompare(a)}),re=Array.isArray(r.testInterpretations)?r.testInterpretations:[],oe=t=>{const a=u(t),o=re.find(i=>u(i.testName)===a);return(o==null?void 0:o.interpretations)||[]};return e.jsxs("div",{className:"public-report-page",style:{minHeight:"100vh",height:"auto",width:"100%",background:"#f1f3f5",color:"#0f172a",padding:"24px 16px",fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',boxSizing:"border-box",overflowX:"hidden",overflowY:"visible",WebkitOverflowScrolling:"touch"},children:[e.jsx("style",{children:`
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
          top: 40px !important;
          bottom: 40px !important;
          left: 10px !important;
          right: 10px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-around !important;
          align-items: center !important;
          pointer-events: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          z-index: 0 !important;
          overflow: hidden !important;
        }
        .public-report-watermark span,
        .public-report-watermark .public-watermark-row {
          font-size: 2.3rem !important;
          font-weight: 700 !important;
          color: #075c91 !important;
          opacity: 0.16 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.18em !important;
          transform: rotate(-25deg) !important;
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
            z-index: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .public-report-watermark span,
          .public-report-watermark .public-watermark-row {
            font-size: 26pt !important;
            font-weight: 700 !important;
            color: #075c91 !important;
            opacity: 0.16 !important;
            transform: rotate(-25deg) !important;
            letter-spacing: 6px !important;
            font-family: 'Georgia', 'Times New Roman', 'Palatino Linotype', serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}),e.jsxs("div",{style:{maxWidth:"850px",width:"100%",margin:"0 auto",boxSizing:"border-box"},children:[e.jsxs("header",{className:"public-report-actions",style:{background:"#ffffff",borderRadius:"16px",padding:"16px 20px",marginBottom:"20px",boxShadow:"0 4px 12px rgba(0,0,0,0.03)",border:"1px solid #cbd5e1",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:"12px",boxSizing:"border-box"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 10px",background:"#e0f2fe",color:"#0369a1",borderRadius:"20px",fontSize:"0.75rem",fontWeight:700,marginBottom:"6px"},children:"✓ VERIFIED DIAGNOSTIC REPORT"}),e.jsx("h1",{style:{margin:0,fontSize:"1.3rem",color:"#075c91",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px"},children:"ETU DIAGNOSTIC LABORATORY"}),e.jsx("p",{style:{margin:"2px 0 0 0",fontSize:"0.82rem",fontWeight:700,color:"#0369a1",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Laboratory Test Report"})]}),e.jsxs("div",{style:{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},children:[e.jsxs("label",{style:{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"12.5px",fontWeight:600,color:p==="lab"?"#0284c7":"#334155",cursor:"pointer",background:p==="lab"?"#e0f2fe":"#f1f5f9",padding:"6px 12px",borderRadius:"8px",border:`1px solid ${p==="lab"?"#0284c7":"#cbd5e1"}`,transition:"all 0.15s ease"},children:[e.jsx("input",{type:"checkbox",checked:p==="lab",onChange:()=>B("lab")}),"Add Stamp for Lab"]}),e.jsxs("label",{style:{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"12.5px",fontWeight:600,color:p==="clinic"?"#0284c7":"#334155",cursor:"pointer",background:p==="clinic"?"#e0f2fe":"#f1f5f9",padding:"6px 12px",borderRadius:"8px",border:`1px solid ${p==="clinic"?"#0284c7":"#cbd5e1"}`,transition:"all 0.15s ease"},children:[e.jsx("input",{type:"checkbox",checked:p==="clinic",onChange:()=>B("clinic")}),"Add Stamp for Clinic"]})]}),e.jsx("button",{type:"button",onClick:X,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"8px",background:k?"#10b981":"#f1f5f9",color:k?"#fff":"#334155",border:"1px solid #cbd5e1",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",transition:"all 0.2s"},children:k?"✓ Link Copied!":"🔗 Copy Share Link"}),e.jsx("button",{type:"button",onClick:()=>window.print(),style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"8px",background:"#f8fafc",color:"#075c91",border:"1px solid #075c91",fontWeight:600,fontSize:"0.85rem",cursor:"pointer"},children:"🖨 Print Report"}),r.allowPdfDownload!==!1&&e.jsx("button",{type:"button",onClick:Y,style:{display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 18px",borderRadius:"8px",background:"#075c91",color:"#ffffff",border:"none",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",boxShadow:"0 2px 4px rgba(7,92,145,0.2)"},children:"📥 Download PDF"})]})]}),e.jsxs("main",{className:"public-report-main",style:{position:"relative",overflow:"hidden",background:"#ffffff",borderRadius:"16px",padding:"24px 20px",boxShadow:"0 4px 14px rgba(0,0,0,0.06)",border:"1px solid #cbd5e1",boxSizing:"border-box",overflowWrap:"break-word",wordBreak:"break-word",pointerEvents:"none",userSelect:"text",cursor:"default"},children:[e.jsxs("div",{className:"public-report-watermark","aria-hidden":"true",children:[e.jsx("span",{className:"public-watermark-row",children:"ETU Diagnostic Laboratory"}),e.jsx("span",{className:"public-watermark-row",children:"ETU Diagnostic Laboratory"}),e.jsx("span",{className:"public-watermark-row",children:"ETU Diagnostic Laboratory"})]}),e.jsxs("div",{style:{textAlign:"center",borderBottom:"3px solid #087ca8",paddingBottom:"16px",marginBottom:"20px"},children:[e.jsx("img",{src:ne,alt:"ETU Diagnostic Laboratory Logo",style:{maxHeight:"95px",width:"auto",maxWidth:"100%",objectFit:"contain",margin:"0 auto 10px",display:"block"}}),e.jsx("h2",{style:{margin:0,color:"#075c91",fontSize:"1.5rem",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:800},children:"ETU Diagnostic Laboratory"}),e.jsx("p",{style:{margin:"4px 0 0 0",fontSize:"0.85rem",fontWeight:700,color:"#0369a1",textTransform:"uppercase",letterSpacing:"1px"},children:"Laboratory Test Report"})]}),e.jsxs("div",{style:{marginBottom:"24px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 10px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Patient Information"}),e.jsxs("div",{className:"public-info-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"10px 20px",fontSize:"0.88rem",background:"#f8fafc",padding:"14px 16px",borderRadius:"8px",border:"1px solid #cbd5e1",boxSizing:"border-box"},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Patient Name:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:_})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Patient ID:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:q})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Age / Sex:"})," ",e.jsxs("span",{style:{color:"#0f172a"},children:[J," / ",E]})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Phone:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:Q})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Sample Type:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:Z})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Collection Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:K})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Report Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:D})]}),(s.systolicBP||s.diastolicBP)&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Blood Pressure:"})," ",e.jsxs("span",{style:{color:"#0f172a"},children:[s.systolicBP||"—","/",s.diastolicBP||"—"," mmHg"]})]}),s.referralHospital&&e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Referral Hospital:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:s.referralHospital})]})]})]}),e.jsxs("div",{style:{marginBottom:"24px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 12px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Laboratory Results"}),W.length>0?W.map(([t,a])=>{const o=oe(t);return e.jsxs("div",{style:{marginBottom:"22px"},children:[e.jsx("h4",{className:"public-category-header",style:{margin:"0 0 8px 0",padding:"7px 12px",background:"#075c91",color:"#ffffff",borderRadius:"5px",fontSize:"0.82rem",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:700},children:t}),Array.from(a.entries()).map(([i,l])=>e.jsxs("div",{style:{marginBottom:"10px"},children:[i!=="GENERAL"&&e.jsx("h5",{className:"public-subcategory-header",style:{margin:"4px 0 6px 0",fontSize:"0.75rem",textTransform:"uppercase",color:"#075c91",background:"#e8f5fa",padding:"3px 8px",borderRadius:"4px",display:"inline-block"},children:i}),e.jsx("div",{style:{width:"100%",overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:"6px"},children:e.jsxs("table",{style:{width:"100%",minWidth:"520px",borderCollapse:"collapse",background:"#ffffff"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Test / Parameter"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Result"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"SI Unit"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Reference Range"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"center",padding:"9px",fontSize:"0.8rem",textTransform:"uppercase"},children:"Flag"})]})}),e.jsx("tbody",{children:l.map((n,x)=>{const h=n.parameter||n.sampleName||n.name||"";return e.jsxs("tr",{style:{background:x%2===0?"#ffffff":"#f8fafc",borderBottom:"1px solid #d6e2e7"},children:[e.jsxs("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#0f172a"},children:[e.jsx("strong",{style:{color:"#0f172a"},children:h}),n.remarks&&e.jsx("small",{style:{display:"block",color:"#657d87",marginTop:"2px",fontSize:"0.75rem"},children:n.remarks})]}),e.jsx("td",{className:"public-result-val",style:{padding:"9px",fontSize:"0.88rem",fontWeight:700,color:"#075c91"},children:n.result}),e.jsx("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#475569"},children:n.unit||"—"}),e.jsx("td",{style:{padding:"9px",fontSize:"0.88rem",color:"#475569"},children:n.referenceValue||"—"}),e.jsx("td",{style:{padding:"9px",textAlign:"center"},children:e.jsx(le,{flag:n.flag,result:n.result,referenceValue:n.referenceValue,sex:E})})]},x)})})]})})]},i)),o.length>0&&e.jsxs("div",{className:"public-interpretation-box",style:{margin:"6px 0 14px 0",padding:"8px 12px",background:"#f0f7fa",borderLeft:"4px solid #075c91",borderRadius:"4px"},children:[e.jsx("b",{style:{color:"#075c91",fontSize:"0.78rem",textTransform:"uppercase"},children:"Clinical Interpretation:"}),o.map((i,l)=>e.jsxs("div",{style:{marginTop:"4px",fontSize:"0.82rem",color:"#203640"},children:[e.jsxs("strong",{style:{color:"#0f172a"},children:[i.title,":"]})," ",i.interpretation]},l))]})]},t)}):e.jsx("div",{style:{width:"100%",overflowX:"auto",WebkitOverflowScrolling:"touch"},children:e.jsxs("table",{style:{width:"100%",minWidth:"520px",borderCollapse:"collapse",background:"#ffffff"},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Test / Parameter"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Result"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"SI Unit"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"left",padding:"9px",fontSize:"0.8rem"},children:"Reference Range"}),e.jsx("th",{style:{background:"#075c91",color:"#ffffff",textAlign:"center",padding:"9px",fontSize:"0.8rem"},children:"Flag"})]})}),e.jsx("tbody",{children:e.jsx("tr",{children:e.jsx("td",{colSpan:"5",style:{padding:"12px",textAlign:"center",color:"#64748b"},children:"No laboratory results recorded."})})})]})})]}),r.comments&&e.jsxs("div",{className:"public-remarks-box",style:{padding:"12px 16px",background:"#f8fafc",borderRadius:"8px",border:"1px solid #cbd5e1",marginBottom:"20px"},children:[e.jsx("strong",{style:{color:"#075c91",fontSize:"0.85rem"},children:"General Remarks:"}),e.jsx("p",{style:{margin:"4px 0 0",color:"#334155",fontSize:"0.88rem"},children:r.comments})]}),e.jsxs("div",{style:{marginBottom:"20px"},children:[e.jsx("h3",{className:"public-section-title",style:{margin:"0 0 10px 0",padding:"8px 12px",background:"#e8f5fa",color:"#075c91",borderLeft:"4px solid #0b95b7",fontSize:"0.85rem",textTransform:"uppercase",letterSpacing:"0.5px"},children:"Authorization"}),e.jsxs("div",{className:"public-info-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"10px 20px",fontSize:"0.88rem",background:"#f8fafc",padding:"14px 16px",borderRadius:"8px",border:"1px solid #cbd5e1",boxSizing:"border-box",position:"relative"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"11px",color:"#64748b",fontWeight:600},children:"Title: Head of ETU Diagnostic Laboratory"}),e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Prepared By:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:((I=r.technician)==null?void 0:I.fullName)||((L=r.submittedBy)==null?void 0:L.fullName)||r.collectorName||"Technician"})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Approved By:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:$(((C=r.approvedBy)==null?void 0:C.fullName)||(typeof r.approvedBy=="string"?r.approvedBy:"Approved"))})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:"#475569",minWidth:"100px",display:"inline-block"},children:"Approval Date:"})," ",e.jsx("span",{style:{color:"#0f172a"},children:D})]}),A&&e.jsx("div",{className:"public-report-stamp-container",style:{position:"absolute",right:"12px",top:"-18px",pointerEvents:"none",zIndex:2},children:e.jsx("img",{src:A,alt:V,style:{width:"114px",height:"114px",objectFit:"contain",display:"block"}})})]})]}),e.jsxs("footer",{style:{borderTop:"1px solid #c9d9df",paddingTop:"14px",marginTop:"24px",display:"flex",flexWrap:"wrap",justifyContent:"space-between",fontSize:"0.78rem",color:"#59727c",gap:"12px"},children:[e.jsxs("div",{children:["Title: Head of ETU Diagnostic Laboratory",e.jsx("br",{}),"Prepared by: ",e.jsx("strong",{style:{color:"#203640"},children:((P=r.technician)==null?void 0:P.fullName)||((U=r.submittedBy)==null?void 0:U.fullName)||r.collectorName||"Technician"})]}),e.jsxs("div",{children:["Approved by",e.jsx("br",{}),e.jsx("strong",{style:{color:"#203640"},children:$(((F=r.approvedBy)==null?void 0:F.fullName)||(typeof r.approvedBy=="string"?r.approvedBy:"Approved"))})]}),e.jsxs("div",{children:[e.jsx("br",{}),e.jsx("strong",{style:{color:"#203640"},children:"ETU Diagnostic Laboratory"})]})]})]})]})]})}export{ge as PublicReportViewer,ge as default};
