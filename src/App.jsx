
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AdminSetup, AdminLogin, AdminDashboard } from "./admin.jsx";
import './app.css';

// --- Lightweight hash router so Admin pages are always reachable ---
function useHashRoute(){
  const [hash, setHash] = React.useState(typeof window !== 'undefined' ? (window.location.hash || '') : '');
  React.useEffect(() => {
    const h = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', h);
      // Route Admin views by hash
  if (hashRoute === 'admin-setup') return <AdminSetup/>;
  if (hashRoute === 'admin-login') return <AdminLogin/>;
  if (hashRoute === 'admin') return <AdminDashboard/>;

  return () => window.removeEventListener('hashchange', h);
  }, []);
  return hash.replace(/^#/, '');
}


const styles_css = String.raw`\n.panel{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;margin:10px 0}\n.panel.error{border-color:#fecaca;background:#fff1f2;color:#991b1b}\n.results{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;margin-top:12px}\n.progress{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin-top:8px}\n.progress>div{height:100%;background:#0ea5e9}\n.btn{padding:10px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;cursor:pointer}\n.btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}\n.input{padding:10px;border:1px solid #e5e7eb;border-radius:10px}\n.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}\n.card{position:relative;border:1px solid #e5e7eb;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 6px 18px rgba(2,8,23,0.06)}\n.card-img{width:100%;height:220px;object-fit:cover;display:block}\n.card-body{padding:10px}\n.badge{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:.2px}\n.link{color:#0ea5e9;text-decoration:none}\n.container{max-width:1100px;margin:0 auto;padding:24px}\n`;

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";
const hideAdminLinks = (import.meta.env.VITE_HIDE_ADMIN_LINKS || "true").toString().toLowerCase() === "true";

export default function App(){
  const hashRoute = useHashRoute();

  const [route, setRoute] = useState(window.location.hash || "");
  useEffect(()=>{const f=()=>setRoute(window.location.hash||""); window.addEventListener("hashchange",f); return()=>window.removeEventListener("hashchange",f);},[]);
  if (route === "#admin-setup") return <AdminSetup />;
  if (route === "#admin-login") return <AdminLogin />;
  if (route === "#admin") return <AdminDashboard />;
  return <PublicVote />;
}

function PublicVote(){
  const [counts,setCounts]=useState({A:0,B:0,C:0});
  const [checking,setChecking]=useState(true);
  const [valid,setValid]=useState(false);
  const [unit,setUnit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const designs=[
    {id:'A',name:'Dark Green & Yellow',image:'/images/design-a.jpg'},
    {id:'B',name:'Grey Modern',image:'/images/design-b.jpg'},
    {id:'C',name:'Earthy Beige',image:'/images/design-c.jpg'},
  ];
  useEffect(()=>{(async()=>{
    await refresh();
    const t=new URLSearchParams(window.location.search).get('t')||'';
    if(!t){ setValid(false); setChecking(false); return; }
    const r=await fetch('/api/cast-vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pollId,token:t,dryRun:true})});
    const out=await r.json().catch(()=>({}));
    setValid(r.ok); if(r.ok) setUnit(out.unit); setChecking(false);
  })()},[]);
  async function refresh(){
    const {data}=await supabase.from('votes').select('option_id').eq('poll_id',pollId);
    const t={A:0,B:0,C:0}; (data||[]).forEach(x=>t[x.option_id]=(t[x.option_id]||0)+1); setCounts(t);
  }
  async function vote(id){
    setConfirm(null);
    const token=new URLSearchParams(window.location.search).get('t')||'';
    const r=await fetch('/api/cast-vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pollId,token,optionId:id})});
    const out=await r.json().catch(()=>({}));
    if(!r.ok){ alert(out.error||'Vote failed'); return; }
    alert('Thank you! Your vote has been recorded.'); await refresh();
  }
  const total=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts]);
  const showAdmin = !hideAdminLinks && !new URLSearchParams(window.location.search).has("t");
    // Route Admin views by hash
  if (hashRoute === 'admin-setup') return <AdminSetup/>;
  if (hashRoute === 'admin-login') return <AdminLogin/>;
  if (hashRoute === 'admin') return <AdminDashboard/>;

  return (<div className="container">
  <div style={{display:"flex",justifyContent:"flex-end"}}>
    <a className="link" href="#admin-login" aria-label="Admin Login">Admin</a>
  </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1>🎨 Indah Samudra Condo Painting – Voting</h1>
      {showAdmin && <a className="link" href="#admin-login">Admin Login</a>}
    </div>
    {checking? <div className='panel'>Validating your QR…</div> : valid? <div className='panel'>
      <div><b>Unit</b>: <code>{unit?.unit_id}</code></div>
      <div style={{color:'#475569',fontSize:13}}>Owner: {unit?.owner_name||'-'}</div>
    </div> : <div className='panel error'>Please scan the official QR provided by Management.</div>}
    <div className='results'>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
        <b>Live Results</b><div>{total} vote{total===1?'':'s'}</div>
      </div>
      <div className='grid3'>
        {designs.map(d=>{
          const v=counts[d.id]||0; const pct=total?Math.round(v/total*100):0;
          return <div key={d.id} className='card'>
            <div className='badge'>Option {d.id} — {d.name}</div>
            <img className='card-img' src={d.image} alt={d.name} onError={(e)=>e.currentTarget.src='https://placehold.co/800x500?text=Upload+design-'+d.id}/>
            <div className='card-body'>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <code style={{color:'#64748b'}}>{v} vote{v===1?'':'s'} • {pct}%</code>
                <button className='btn' onClick={()=>window.open(d.image,'_blank')}>Preview</button>
              </div>
              <div className='progress'><div style={{width:`${pct}%`}}/></div>
              <div style={{marginTop:8}}>
                <button className='btn primary' disabled={!valid} onClick={()=>setConfirm(d.id)}>Vote for {d.id}</button>
              </div>
            </div>
          </div>
        })}
      </div>
    </div>
    {confirm && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',padding:16,borderRadius:12,width:360}}>
        <div style={{fontWeight:600,marginBottom:6}}>Confirm your vote?</div>
        <div style={{fontSize:14,color:'#334155'}}>Unit <b>{unit?.unit_id}</b> voting for option <b>{confirm}</b>.</div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
          <button className='btn' onClick={()=>setConfirm(null)}>Cancel</button>
          <button className='btn primary' onClick={()=>vote(confirm)}>Confirm Vote</button>
        </div>
      </div>
    </div>}
    
  </div>)
}
