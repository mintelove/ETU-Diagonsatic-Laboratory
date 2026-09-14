import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, isSilentNetworkError } from '../api/client.js';
import { download } from '../api/download.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import ModalPortal from '../components/ModalPortal.jsx';
import '../styles/pages/patientManagement.css';

import { useScrollLock } from '../utils/useScrollLock.js';
import { formatETB as money } from '../utils/currencyHelper.js';
const palette = ['#075c91','#16a4d8','#54c4a9','#f2b13c','#7b78e7','#ef7f75'];
const emptyHospital = { name:'',code:'',phone:'',email:'',address:'',city:'',contactPerson:'',description:'',active:true };
function Toast({ notice }) { return notice ? <div className={`pm-toast ${notice.error?'error':''}`}>{notice.text}</div> : null; }
function Chart({ title, children }) { return <section className="pm-chart"><h3>{title}</h3><div className="pm-chart-space">{children}</div></section>; }

export default function PatientManagementPage() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscribe, unsubscribe } = useRealtime();
  const initialPeriod = searchParams.get('period') || '';
  const initialDate = searchParams.get('date') || '';
  const initialPatientType = searchParams.get('patientType') || '';
  const [dashboard,setDashboard]=useState(null),[patients,setPatients]=useState([]),[pagination,setPagination]=useState({}),[hospitals,setHospitals]=useState([]),[samples,setSamples]=useState([]),[users,setUsers]=useState([]),[loading,setLoading]=useState(true),[notice,setNotice]=useState(null),[profile,setProfile]=useState(null),[hospitalForm,setHospitalForm]=useState(null),[filters,setFilters]=useState({q:'',period:initialPeriod,date:initialDate,patientType:initialPatientType,paymentStatus:'',reportStatus:'',sampleType:'',referralHospital:'',receptionist:'',branchName:'',sort:'registrationDate',order:'desc'}),[page,setPage]=useState(1);
  useScrollLock(!!profile || !!hospitalForm);
  const notify=(text,error=false)=>{setNotice({text,error});setTimeout(()=>setNotice(null),3500)};
  const query=useMemo(()=>new URLSearchParams(Object.entries({...filters,page,limit:15}).filter(([,v])=>v!=='' )).toString(),[filters,page]);
  const load = useCallback(async()=>{setLoading(true);try{const [d,p,h,s,u]=await Promise.all([api(`/patient-management/dashboard?${query}`,{token}),api(`/patient-management/patients?${query}`,{token}),api('/patient-management/hospitals',{token}),api('/reception/sample-types',{token}),api('/users',{token})]);setDashboard(d);setPatients(p.patients);setPagination(p.pagination);setHospitals(h.hospitals);setSamples(s.sampleTypes);setUsers(u.users.filter(user=>user.role==='Reception'));}catch(e){if(!isSilentNetworkError(e))notify(e.message,true)}finally{setLoading(false)}},[token,query]);
  useEffect(()=>{load()},[load]);
  useEffect(() => {
    const p = searchParams.get('period');
    const d = searchParams.get('date');
    const pt = searchParams.get('patientType');
    if (p !== null || d !== null || pt !== null) {
      setFilters(old => ({
        ...old,
        ...(p !== null ? { period: p } : {}),
        ...(d !== null ? { date: d } : {}),
        ...(pt !== null ? { patientType: pt } : {})
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    subscribe('patients:change', load);
    subscribe('reception:change', load);
    return () => {
      unsubscribe('patients:change', load);
      unsubscribe('reception:change', load);
    };
  }, [subscribe, unsubscribe, load]);
  const change=(key,value)=>{setFilters(old=>({...old,[key]:value}));setPage(1)};
  const showProfile=async id=>{try{setProfile(await api(`/patient-management/patients/${id}`,{token}))}catch(e){if(!isSilentNetworkError(e))notify(e.message,true)}};
  const saveHospital=async event=>{event.preventDefault();try{const method=hospitalForm._id?'PUT':'POST',url=hospitalForm._id?`/patient-management/hospitals/${hospitalForm._id}`:'/patient-management/hospitals';await api(url,{token,method,body:JSON.stringify(hospitalForm)});setHospitalForm(null);notify('Referral hospital saved.');load()}catch(e){if(!isSilentNetworkError(e))notify(e.message,true)}};
  const updateStatus=async hospital=>{try{await api(`/patient-management/hospitals/${hospital._id}/status`,{token,method:'PATCH',body:JSON.stringify({active:!hospital.active})});load();notify(`Hospital ${hospital.active?'deactivated':'activated'}.`)}catch(e){if(!isSilentNetworkError(e))notify(e.message,true)}};
  const removeHospital=async hospital=>{if(!window.confirm(`Remove ${hospital.name}?`))return;try{await api(`/patient-management/hospitals/${hospital._id}`,{token,method:'DELETE'});notify('Referral hospital removed.');load()}catch(e){if(!isSilentNetworkError(e))notify(e.message,true)}};
  const cards=dashboard?[['👥','Total Registered Patients',dashboard.summary.total],['📅',"Today's Patients",dashboard.summary.today],['📆',"This Week's Patients",dashboard.summary.week],['🏥','Referral Patients',dashboard.summary.referral],['🙋','Self Patients',dashboard.summary.self],['💰',"Today's Income",money(dashboard.summary.todayIncome)],['💵','Total Income',money(dashboard.summary.totalIncome)],['🧪','Total Samples Collected',dashboard.summary.samples]]:[];
  return <div className="pm-page"><Toast notice={notice}/><div className="pm-heading"><div><p className="eyebrow">ADMINISTRATION / CENTRAL REGISTRY</p><h1>Patient Management</h1><span>Secure patient history, billing, sample and reporting oversight.</span></div><div className="pm-actions"><button onClick={()=>window.print()}>🖨 Print view</button><button onClick={()=>download(`/patient-management/exports/patients.pdf?${query}`,token)}>PDF</button><button onClick={()=>download(`/patient-management/exports/patients.csv?${query}`,token)}>CSV</button><button className="primary-button" onClick={()=>download(`/patient-management/exports/patients.xlsx?${query}`,token)}>Excel</button></div></div>
    {filters.period === 'today' && (
      <div className="pm-active-filter-banner" style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '10px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <div>
            <strong style={{ color: '#0369a1', fontSize: '0.95rem' }}>
              Filtered to Today's Patients ({new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#0c4a6e' }}>
              Showing only patients registered today ({pagination.total ?? patients.length} records found).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            change('period', '');
            setSearchParams({});
          }}
          style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
        >
          ✕ Clear Filter
        </button>
      </div>
    )}
    <section className="pm-cards">{cards.map(([icon,label,value])=><article className="pm-card" key={label}><i>{icon}</i><div><small>{label}</small><strong>{value}</strong></div></article>)}</section>
    <section className="pm-panel pm-filters"><div className="pm-panel-title"><div><h2>Patient registry</h2><span>Search, filter, sort and export the visible patient records.</span></div></div><div className="pm-filter-grid"><input value={filters.q} onChange={e=>change('q',e.target.value)} placeholder="Search ID, name, phone, barcode…"/><select value={filters.period} onChange={e=>change('period',e.target.value)}><option value="">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This week</option><option value="lastWeek">Last week</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="year">This year</option></select><select value={filters.branchName} onChange={e=>change('branchName',e.target.value)}><option value="">All branches</option><option value="Main">Main Branch</option><option value="Otona">Otona Branch</option></select><select value={filters.patientType} onChange={e=>change('patientType',e.target.value)}><option value="">All patient types</option><option>Self</option><option>Referral</option><option>Self Aware</option></select><select value={filters.paymentStatus} onChange={e=>change('paymentStatus',e.target.value)}><option value="">All payments</option><option>Paid</option><option>Unpaid</option><option>Counselling</option></select><select value={filters.reportStatus} onChange={e=>change('reportStatus',e.target.value)}><option value="">All report statuses</option>{['Draft','Submitted','Pending','Approved','Ready for Printing','Rejected'].map(x=><option key={x}>{x}</option>)}</select><select value={filters.sampleType} onChange={e=>change('sampleType',e.target.value)}><option value="">All sample types</option>{samples.map(s=><option value={s._id} key={s._id}>{s.name}</option>)}</select><select value={filters.referralHospital} onChange={e=>change('referralHospital',e.target.value)}><option value="">All referral hospitals</option>{hospitals.map(h=><option key={h._id}>{h.name}</option>)}</select><select value={filters.receptionist} onChange={e=>change('receptionist',e.target.value)}><option value="">All receptionists</option>{users.map(u=><option value={u._id} key={u._id}>{u.fullName}</option>)}</select><input type="date" title="Single date" onChange={e=>change('date',e.target.value)}/><select value={`${filters.sort}:${filters.order}`} onChange={e=>{const [sort,order]=e.target.value.split(':');change('sort',sort);change('order',order)}}><option value="registrationDate:desc">Newest first</option><option value="registrationDate:asc">Oldest first</option><option value="name:asc">Name A–Z</option><option value="grandTotal:desc">Amount high–low</option></select></div></section>
    <section className="pm-panel pm-table-wrap"><div className="pm-table-scroll"><table><thead><tr>{['Patient ID','Barcode','Patient Name','Age','Sex','Phone Number','Branch','Patient Type','Referral Hospital','Sample Types','Tests','Total Paid','Payment','Receptionist','Registration','Current Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan="17" className="pm-empty">Loading patient registry…</td></tr>:patients.length?patients.map(p=><tr key={p._id}><td><b>{p.patientId}</b></td><td>{p.barcode}</td><td>{p.name}</td><td>{p.age}</td><td>{p.sex}</td><td>{p.phone}</td><td><span className="pm-badge">📍 {p.branchName||'Main'}</span></td><td><span className={`pm-badge ${p.registrationType.toLowerCase()}`}>{p.registrationType}</span></td><td>{p.referralHospital||'—'}</td><td title={p.samples}>{p.samples}</td><td>{p.sampleCount}</td><td>{money(p.grandTotal)}</td><td><span className={`pm-badge ${p.paymentStatus.toLowerCase()}`}>{p.paymentStatus}</span></td><td>{p.registeredBy?.[0]?.fullName||'—'}</td><td>{new Date(p.registrationDate).toLocaleString()}</td><td><span className="pm-status">{p.reportStatus}</span></td><td><button className="pm-view" onClick={()=>showProfile(p._id)}>View</button></td></tr>):<tr><td colSpan="17" className="pm-empty">No patient records match the selected filters.</td></tr>}</tbody></table></div><footer className="pm-pagination"><span>{pagination.total||0} patients</span><button disabled={page<=1} onClick={()=>setPage(page-1)}>← Previous</button><span>Page {pagination.page||1} of {pagination.pages||1}</span><button disabled={page>=pagination.pages} onClick={()=>setPage(page+1)}>Next →</button></footer></section>
    {dashboard&&<section className="pm-charts"><Chart title="Patient Registration Trend"><ResponsiveContainer><LineChart data={dashboard.charts.trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" stroke="#075c91" strokeWidth={3}/></LineChart></ResponsiveContainer></Chart><Chart title="Daily Income"><ResponsiveContainer><BarChart data={dashboard.charts.income}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#16a4d8" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></Chart><Chart title="Gender Distribution"><ResponsiveContainer><PieChart><Pie data={dashboard.charts.gender} dataKey="value" nameKey="name" outerRadius={78} label>{dashboard.charts.gender.map((_,i)=><Cell key={i} fill={palette[i]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></Chart><Chart title="Age Distribution"><ResponsiveContainer><BarChart data={dashboard.charts.age}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#54c4a9" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></Chart><Chart title="Top Sample Types"><ResponsiveContainer><BarChart layout="vertical" data={dashboard.charts.topSamples}><XAxis type="number"/><YAxis type="category" dataKey="name" width={100}/><Tooltip/><Bar dataKey="value" fill="#7b78e7"/></BarChart></ResponsiveContainer></Chart><Chart title="Top Referral Hospitals"><ResponsiveContainer><BarChart layout="vertical" data={dashboard.charts.topHospitals}><XAxis type="number"/><YAxis type="category" dataKey="name" width={110}/><Tooltip/><Bar dataKey="value" fill="#f2b13c"/></BarChart></ResponsiveContainer></Chart></section>}
    <section className="pm-panel"><div className="pm-panel-title"><div><h2>Referral Hospital Management</h2><span>Only active hospitals are available to Reception when registering referral patients.</span></div><button className="primary-button" onClick={()=>setHospitalForm({...emptyHospital})}>+ Add referral hospital</button></div><div className="pm-table-scroll"><table><thead><tr>{['Hospital','Code','Contact','City','Contact person','Status','Created','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{hospitals.map(h=><tr key={h._id}><td><b>{h.name}</b><small className="pm-description">{h.description}</small></td><td>{h.code||'—'}</td><td>{h.phone||h.email||'—'}</td><td>{h.city||'—'}</td><td>{h.contactPerson||'—'}</td><td><span className={`pm-badge ${h.active?'paid':'unpaid'}`}>{h.active?'Active':'Inactive'}</span></td><td>{new Date(h.createdDate).toLocaleDateString()}</td><td className="pm-row-actions"><button onClick={()=>setHospitalForm({...h})}>Edit</button><button onClick={()=>updateStatus(h)}>{h.active?'Deactivate':'Activate'}</button><button className="danger" onClick={()=>removeHospital(h)}>Delete</button></td></tr>)}</tbody></table></div></section>
    {profile&&<Profile profile={profile} close={()=>setProfile(null)} token={token} user={user}/>} {hospitalForm&&<HospitalModal value={hospitalForm} change={(key,value)=>setHospitalForm(old=>({...old,[key]:value}))} close={()=>setHospitalForm(null)} save={saveHospital}/>}</div>;
}
function Profile({profile,close,token,user}){
  const {patient,payment,collection,report,counselling,previousVisits,laboratoryHistory=[]}=profile;
  const [selectedReport,setSelectedReport]=useState(null);
  const [historyTab,setHistoryTab]=useState('all');

  return (
    <div className="pm-modal-backdrop">
      <article className="pm-modal profile" style={{maxWidth:1120,width:'96vw',maxHeight:'92vh',overflowY:'auto'}}>
        <button className="pm-close" onClick={close}>×</button>
        <div className="pm-profile-head">
          <div className="pm-avatar">{patient.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
          <div>
            <p className="eyebrow">PATIENT PROFILE &amp; COMPLETE MEDICAL HISTORY</p>
            <h2>{patient.name}</h2>
            <span>ID: <b>{patient.patientId}</b> · Barcode: <b>{patient.barcode}</b> · 📍 Branch: <b>{patient.branchName||'Main'}</b></span>
          </div>
          <button onClick={()=>window.print()} className="secondary">🖨 Print profile</button>
        </div>
        <div className="pm-profile-grid">
          <Info title="Patient Information" values={{
            Age:`${patient.age} years`,
            Sex:patient.sex,
            Phone:patient.phone,
            Address:patient.address||'—',
            Nationality:patient.nationality||'—',
            'Blood Pressure':(patient.systolicBP||patient.diastolicBP)?`${patient.systolicBP||'—'}/${patient.diastolicBP||'—'} mmHg`:'Not recorded',
            'Patient Type':patient.registrationType,
            'Referral Hospital':patient.referralHospital||'—',
            Registered:new Date(patient.registrationDate).toLocaleString(),
            Receptionist:patient.registeredBy?.fullName||'—'
          }}/>
          <Info title="Payment &amp; Billing Summary" values={{
            Status:patient.paymentStatus,
            Method:patient.paymentMethod,
            'Receipt Number':patient.receiptNumber||'—',
            'Subtotal':money(patient.subtotal||patient.grandTotal),
            'Discount':patient.discountPercent?`${patient.discountPercent}% (${money(patient.discountAmount)})`:'None',
            'Grand Total':money(patient.grandTotal),
            'Payment Date':patient.paymentDate?new Date(patient.paymentDate).toLocaleString():'—',
            'Received By':payment?.receivedBy?.fullName||'—'
          }}/>
          <Info title="Sample &amp; Clinical Status" values={{
            'Sample Types':(patient.sampleTypes||[]).map(s=>s.name).join(', ')||'None',
            'Collection Status':collection?.status||'Pending',
            Collector:collection?.collector?.fullName||patient.collectedBy?.fullName||'—',
            'Active Report Status':report?.status||'Not started',
            'Approval Status':report?.approvedBy?`Approved by ${report.approvedBy.fullName||'Approver'}`:'Pending',
            'Historical Visits':previousVisits?.length||1,
            'Counselling Records':counselling?.length||0
          }}/>
        </div>

        {/* ── Complete Laboratory History Section ── */}
        <section className="pm-lab-history-section" style={{marginTop:'20px',borderTop:'2px solid #e2e8f0',paddingTop:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <h3 style={{margin:0,fontSize:'1.15rem',color:'#0f172a',display:'flex',alignItems:'center',gap:'8px'}}>
                <span>🧪</span> Complete Laboratory History ({laboratoryHistory.length} Tests / Orders)
              </h3>
              <p style={{margin:'2px 0 0',fontSize:'0.8rem',color:'#64748b'}}>
                All laboratory tests, orders, collection, investigation, and approval records across all branch visits.
              </p>
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              <button
                type="button"
                className={historyTab==='all'?'active':''}
                onClick={()=>setHistoryTab('all')}
                style={{padding:'5px 12px',fontSize:'0.8rem',borderRadius:'6px',border:'1px solid #cbd5e1',background:historyTab==='all'?'#075c91':'#fff',color:historyTab==='all'?'#fff':'#334155',cursor:'pointer',fontWeight:600}}
              >
                All Tests ({laboratoryHistory.length})
              </button>
              <button
                type="button"
                className={historyTab==='counselling'?'active':''}
                onClick={()=>setHistoryTab('counselling')}
                style={{padding:'5px 12px',fontSize:'0.8rem',borderRadius:'6px',border:'1px solid #cbd5e1',background:historyTab==='counselling'?'#075c91':'#fff',color:historyTab==='counselling'?'#fff':'#334155',cursor:'pointer',fontWeight:600}}
              >
                Counselling History ({counselling?.length||0})
              </button>
            </div>
          </div>

          {historyTab==='all'?(
            laboratoryHistory.length>0?(
              <div style={{overflowX:'auto',border:'1px solid #e2e8f0',borderRadius:'8px'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                  <thead>
                    <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0',textAlign:'left',color:'#475569'}}>
                      <th style={{padding:'10px 12px'}}>Date</th>
                      <th style={{padding:'10px 12px'}}>Category</th>
                      <th style={{padding:'10px 12px'}}>Test Name &amp; Details</th>
                      <th style={{padding:'10px 12px'}}>Order / Barcode</th>
                      <th style={{padding:'10px 12px'}}>Branch</th>
                      <th style={{padding:'10px 12px'}}>Payment</th>
                      <th style={{padding:'10px 12px'}}>Collection</th>
                      <th style={{padding:'10px 12px'}}>Status &amp; Approval</th>
                      <th style={{padding:'10px 12px',textAlign:'center'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laboratoryHistory.map((item,idx)=>(
                      <tr key={item.id||idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          <b>{new Date(item.testDate).toLocaleDateString()}</b>
                          <small style={{display:'block',color:'#64748b'}}>{new Date(item.testDate).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small>
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{background:'#e0f2fe',color:'#0369a1',padding:'2px 8px',borderRadius:'4px',fontSize:'0.75rem',fontWeight:700}}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <strong style={{color:'#0f172a'}}>{item.testName}</strong>
                          {item.subtest&&<small style={{display:'block',color:'#64748b'}}>{item.subtest}</small>}
                          {item.investigationStatus&&<small style={{display:'block',color:'#0284c7'}}>{item.investigationStatus}</small>}
                        </td>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          <code>{item.orderId}</code>
                        </td>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          <span>📍 {item.branch}</span>
                          {item.isTransferred&&(
                            <span style={{display:'block',color:'#7c3aed',fontSize:'0.72rem',fontWeight:700}}>
                              ⇄ Transferred ({item.transferDetails?.sourceBranch} → {item.transferDetails?.destinationBranch})
                            </span>
                          )}
                        </td>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          <span className={`pm-badge ${String(item.paymentStatus).toLowerCase()}`}>
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          <span style={{fontWeight:600,color:item.collectionStatus==='Completed'?'#059669':'#d97706'}}>
                            {item.collectionStatus}
                          </span>
                          {item.collectorName&&<small style={{display:'block',color:'#64748b'}}>by {item.collectorName}</small>}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <span className={`pm-status status-${String(item.reportStatus).toLowerCase().replace(/\s+/g,'-')}`}>
                            {item.reportStatus}
                          </span>
                          {item.approvalStatus&&(
                            <small style={{display:'block',color:'#475569',fontSize:'0.72rem'}}>
                              {item.approvalStatus}
                            </small>
                          )}
                        </td>
                        <td style={{padding:'10px 12px',textAlign:'center',whiteSpace:'nowrap'}}>
                          {item.results&&item.results.length>0?(
                            <button
                              type="button"
                              onClick={()=>setSelectedReport(item)}
                              style={{background:'#0284c7',color:'#fff',border:'none',borderRadius:'4px',padding:'4px 10px',fontSize:'0.75rem',fontWeight:600,cursor:'pointer'}}
                            >
                              👁 View Results ({item.results.length})
                            </button>
                          ):(
                            <span style={{color:'#94a3b8',fontSize:'0.75rem'}}>No results yet</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ):(
              <p style={{padding:'24px',textAlign:'center',color:'#64748b',background:'#f8fafc',borderRadius:'8px'}}>
                No laboratory history found for this patient.
              </p>
            )
          ):(
            <div className="pm-sample-list">
              {counselling&&counselling.length>0?(
                counselling.map((x)=>(
                  <div key={x._id} style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #f1f5f9'}}>
                    <div>
                      <strong>{new Date(x.completedAt||x.createdDate).toLocaleDateString()}</strong> · {x.counselledBy?.fullName||'Counselor'}
                      <p style={{margin:'4px 0 2px',fontSize:'0.82rem',color:'#334155'}}>Advice: {x.adviceGiven||x.reason}</p>
                      <small style={{color:'#64748b'}}>Recommendations: {x.recommendedTests||x.followUp||'None'}</small>
                    </div>
                    <span style={{fontWeight:700,color:'#075c91'}}>{x.status}</span>
                  </div>
                ))
              ):(
                <p style={{padding:'16px',color:'#64748b'}}>No counseling visits recorded.</p>
              )}
            </div>
          )}
        </section>

        {/* Inner Results Modal */}
        {selectedReport && (
          <ModalPortal isOpen={!!selectedReport} onClose={()=>setSelectedReport(null)}>
            <div className="modal-content" style={{maxWidth:750,width:'92vw'}} onClick={(e)=>e.stopPropagation()}>
              <header className="modal-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{margin:0}}>Laboratory Results — {selectedReport.testName}</h3>
                <button type="button" className="close-button" onClick={()=>setSelectedReport(null)}>×</button>
              </header>
              <div className="modal-body" style={{padding:'16px'}}>
                <div style={{background:'#f8fafc',padding:'10px 14px',borderRadius:'6px',marginBottom:'14px',fontSize:'0.85rem'}}>
                  <strong>Patient:</strong> {patient.name} ({patient.patientId}) · <strong>Date:</strong> {new Date(selectedReport.testDate).toLocaleDateString()} · <strong>Status:</strong> {selectedReport.reportStatus}
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                  <thead>
                    <tr style={{background:'#f1f5f9',borderBottom:'1px solid #cbd5e1',textAlign:'left'}}>
                      <th style={{padding:'8px'}}>Parameter</th>
                      <th style={{padding:'8px'}}>Result</th>
                      <th style={{padding:'8px'}}>Reference Range</th>
                      <th style={{padding:'8px'}}>Flag</th>
                      <th style={{padding:'8px'}}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.results.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #e2e8f0'}}>
                        <td style={{padding:'8px',fontWeight:600}}>{r.sampleName}</td>
                        <td style={{padding:'8px',fontWeight:700,color:r.flag?'#dc2626':'#0f172a'}}>
                          {r.result} {r.unit}
                        </td>
                        <td style={{padding:'8px',color:'#64748b'}}>{r.referenceValue||'—'}</td>
                        <td style={{padding:'8px'}}>
                          {r.flag?<span style={{background:'#fee2e2',color:'#b91c1c',padding:'2px 6px',borderRadius:'4px',fontWeight:700}}>{r.flag}</span>:'—'}
                        </td>
                        <td style={{padding:'8px',color:'#64748b'}}>{r.remarks||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer style={{padding:'12px 16px',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setSelectedReport(null)} className="secondary">Close</button>
              </footer>
            </div>
          </ModalPortal>
        )}
      </article>
    </div>
  );
}

function Info({title,values}){return <section className="pm-info"><h3>{title}</h3>{Object.entries(values).map(([key,value])=><div key={key}><span>{key}</span><b>{value}</b></div>)}</section>}
function HospitalModal({value,change,close,save}){return <div className="pm-modal-backdrop"><form className="pm-modal hospital-form" onSubmit={save}><button type="button" className="pm-close" onClick={close}>×</button><h2>{value._id?'Edit':'Add'} Referral Hospital</h2><div className="pm-form-grid">{[['name','Hospital name',true],['code','Hospital code'],['phone','Phone number'],['email','Email'],['address','Address'],['city','City'],['contactPerson','Contact person']].map(([key,label,required])=><label key={key}>{label}<input required={required} type={key==='email'?'email':'text'} value={value[key]||''} onChange={e=>change(key,e.target.value)}/></label>)}<label className="full">Description<textarea value={value.description||''} onChange={e=>change('description',e.target.value)}/></label></div><footer><button type="button" onClick={close}>Cancel</button><button className="primary-button">Save hospital</button></footer></form></div>}
