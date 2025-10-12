
import React, { useEffect, useMemo, useState } from "react";
import "./app.css";
import { AdminSetup, AdminLogin, AdminDashboard } from "./admin.jsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";
const hideAdminLinks = (import.meta.env.VITE_HIDE_ADMIN_LINKS || "true").toString().toLowerCase() === "true";

function useHashRoute(){
  const [hash,setHash]=useState(typeof window!=='undefined'?(window.location.hash||''):'');
  useEffect(()=>{const h=()=>setHash(window.location.hash||''); window.addEventListener('hashchange',h); return()=>window.removeEventListener('hashchange',h);},[]);
  return (hash||'').replace(/^#/,'');
}

export default function App(){
  const route = useHashRoute();
  if (route === "admin-setup") return <AdminSetup />;
  if (route === "admin-login") return <AdminLogin />;
  if (route === "admin") return <AdminDashboard />;
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
  return (<div className="container">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1>🎨 Indah Samudra Condo Painting – Voting</h1>
      {showAdmin && <a className="link" href="#admin-login">Admin</a>}
    </div>
    {checking? <div className='panel'>Validating your QR…</div> : valid? <div className='panel'>
      <div><b>Unit</b>: <code>{unit?.unit_id}</code></div>
      <div className="muted">Owner: {unit?.owner_name||'-'}</div>
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
