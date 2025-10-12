import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { downloadCsv } from '../utils/csv.js';

function requireAdmin(){ const ok = sessionStorage.getItem('admin')==='1'; if(!ok) window.location.hash = '#/admin-login'; return ok; }
const days14 = () => { const d = new Date(); d.setDate(d.getDate()+14); return d.toISOString(); };

export default function AdminDashboard(){
  const [votes,setVotes]=useState([]);
  const [audit,setAudit]=useState([]);
  const [residents,setResidents]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ if(!requireAdmin()) return; (async()=>{
    setLoading(true);
    const [{data:v},{data:a},{data:r}] = await Promise.all([
      supabase.from('votes').select('*').order('created_at',{ascending:false}),
      supabase.from('vote_audit').select('*').order('created_at',{ascending:false}),
      supabase.from('residents').select('*').order('unit_id')
    ]);
    setVotes(v||[]); setAudit(a||[]); setResidents(r||[]); setLoading(false);
  })(); },[]);

  const tally = votes.reduce((acc,v)=>{ acc[v.option]=(acc[v.option]||0)+1; return acc; }, {A:0,B:0,C:0});

  async function resetVotes(){
    if(!confirm('Delete ALL votes?')) return;
    const { error } = await supabase.from('votes').delete().neq('id', -1);
    if (error){ alert(error.message); return; }
    await supabase.from('vote_audit').insert({ action:'reset', details:{ reason:'admin reset' } });
    location.reload();
  }

  function exportVotes(){ downloadCsv('votes.csv', votes.map(v=>({id:v.id,unit_id:v.unit_id,option:v.option,created_at:v.created_at}))); }
  function exportAudit(){ downloadCsv('vote_audit.csv', audit.map(a=>({id:a.id,action:a.action,voter_name:a.voter_name||'',unit_id:a.unit_id||'',ip:a.ip||'',user_agent:a.user_agent||'',details:a.details?JSON.stringify(a.details):'',created_at:a.created_at}))); }
  function exportResidents(){ downloadCsv('residents.csv', residents); }
  function exportPDF(){ window.print(); }

  async function genQR(){
    // generate tokens for all residents, 14-day validity
    const now = new Date();
    const expires = new Date(now.getTime() + 14*24*3600*1000).toISOString();
    const payload = residents.map(r=>({ token: crypto.randomUUID(), unit_id: r.unit_id, expires_at: expires }));
    const { error } = await supabase.from('qr_tokens').upsert(payload, { onConflict:'token' });
    if (error){ alert('QR generation failed: '+error.message); return; }
    await supabase.from('vote_audit').insert({ action:'qr_generate', details:{ count: payload.length, expires_at: expires } });
    alert('QR tokens generated for '+payload.length+' units.');
  }

  if(!requireAdmin()) return null;
  if(loading) return <div>Loading…</div>;

  return (<div className="grid" style={{gap:16}}>
    <h2>Admin Dashboard</h2>

    <section className="card">
      <div className="row" style={{justifyContent:'space-between'}}>
        <strong>Tally</strong>
        <div className="toolbar">
          <button className="btn" onClick={exportVotes}>Export Votes CSV</button>
          <button className="btn" onClick={exportAudit}>Export Audit CSV</button>
          <button className="btn" onClick={exportResidents}>Export Residents CSV</button>
          <button className="btn" onClick={exportPDF}>Export PDF</button>
          <button className="btn" onClick={resetVotes}>Reset Votes</button>
          <button className="btn" onClick={genQR}>Generate QR Tokens (14 days)</button>
        </div>
      </div>
      <div className="grid grid-3" style={{marginTop:8}}>
        <div className="card"><div>Option A</div><h3>{tally.A||0}</h3></div>
        <div className="card"><div>Option B</div><h3>{tally.B||0}</h3></div>
        <div className="card"><div>Option C</div><h3>{tally.C||0}</h3></div>
      </div>
    </section>

    <section className="card">
      <strong>Recent Activity</strong>
      <div style={{maxHeight:300, overflow:'auto', marginTop:8}}>
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>Unit</th><th>Name</th><th>IP</th><th>Details</th></tr></thead>
          <tbody>
            {audit.map(a=>(
              <tr key={a.id}>
                <td>{new Date(a.created_at).toLocaleString()}</td>
                <td>{a.action}</td>
                <td>{a.unit_id||''}</td>
                <td>{a.voter_name||''}</td>
                <td>{a.ip||''}</td>
                <td>{a.details?JSON.stringify(a.details):''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="card">
      <strong>Residents</strong>
      <div style={{maxHeight:300, overflow:'auto', marginTop:8}}>
        <table>
          <thead><tr><th>Unit</th><th>Owner</th></tr></thead>
          <tbody>
            {residents.map(r=>(<tr key={r.unit_id}><td>{r.unit_id}</td><td>{r.owner_name}</td></tr>))}
          </tbody>
        </table>
      </div>
      <div className="muted">Upload residents via Supabase (unit_id, owner_name).</div>
    </section>
  </div>);
}
