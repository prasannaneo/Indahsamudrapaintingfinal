import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { downloadCsv } from '../utils/csv.js';
import Papa from 'papaparse';

function requireAdmin(){ const ok = sessionStorage.getItem('admin')==='1'; if(!ok) window.location.hash='#/admin-login'; return ok; }

export default function AdminDashboard(){
  const [votes,setVotes]=useState([]);
  const [audit,setAudit]=useState([]);
  const [residents,setResidents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);

  useEffect(()=>{ if(!requireAdmin()) return; (async()=>{
    setLoading(true);
    const [{data:v},{data:a},{data:r}] = await Promise.all([
      supabase.from('votes').select('*').order('created_at',{ascending:false}),
      supabase.from('vote_audit').select('*').order('created_at',{ascending:false}),
      supabase.from('residents').select('*').order('unit_id')
    ]);
    setVotes(v||[]); setAudit(a||[]); setResidents(r||[]);
    setLoading(false);
  })(); },[]);

  const tally = votes.reduce((acc,v)=>{ acc[v.option]=(acc[v.option]||0)+1; return acc; }, {A:0,B:0,C:0});

  async function resetVotes(){
    if(!confirm('Delete ALL votes and ALL QR tokens?')) return;
    const { error: ev } = await supabase.from('votes').delete().neq('id', -1);
    if (ev){ alert('Reset votes failed: '+ev.message); return; }
    const { error: eq } = await supabase.from('qr_tokens').delete().neq('token','');
    if (eq){ alert('Clearing QR tokens failed: '+eq.message); return; }
    await supabase.from('vote_audit').insert({ action:'reset', details:{ votes:true, qr_tokens:true } });
    alert('Votes and QR tokens cleared.');
    location.reload();
  }

  function exportVotes(){ downloadCsv('votes.csv', votes.map(v=>({id:v.id,unit_id:v.unit_id,option:v.option,created_at:v.created_at}))); }
  function exportAudit(){ downloadCsv('vote_audit.csv', audit.map(a=>({id:a.id,action:a.action,voter_name:a.voter_name||'',unit_id:a.unit_id||'',ip:a.ip||'',user_agent:a.user_agent||'',details:a.details?JSON.stringify(a.details):'',created_at:a.created_at}))); }
  function exportResidents(){ downloadCsv('residents.csv', residents); }
  function exportPDF(){ window.print(); }

  async function handleResidentsFile(file){
    setUploading(true);
    Papa.parse(file,{
      header:true,
      skipEmptyLines:true,
      complete: async (results)=>{
        try{
          const rows = results.data
            .map(r=>({ unit_id: String(r.unit_id||r.Unit||r.unit||'').trim(), owner_name: String(r.owner_name||r.Owner||r.name||'').trim()}))
            .filter(r=>r.unit_id);
          if (rows.length===0){ alert('No valid rows found. Columns needed: unit_id, owner_name'); setUploading(false); return; }
          const { error } = await supabase.from('residents').upsert(rows, { onConflict:'unit_id' });
          if (error) throw error;
          await supabase.from('vote_audit').insert({ action:'residents_upload', details:{ rows: rows.length } });
          const { data: r2 } = await supabase.from('residents').select('*').order('unit_id');
          setResidents(r2||[]);
          alert('Residents uploaded: '+rows.length);
        }catch(e){
          alert('Upload failed: '+(e?.message||e));
        }finally{ setUploading(false); }
      },
      error: (err)=>{ alert('CSV parse error: '+err.message); setUploading(false); }
    });
  }

  if(!requireAdmin()) return null;
  if(loading) return <div>Loading…</div>;

  return (
    <div className="grid" style={{gap:16}}>
      <h2>Admin Dashboard</h2>

      <section className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <strong>Tally</strong>
          <div className="toolbar">
            <button className="btn" onClick={exportVotes}>Export Votes CSV</button>
            <button className="btn" onClick={exportAudit}>Export Audit CSV</button>
            <button className="btn" onClick={exportResidents}>Export Residents CSV</button>
            <button className="btn" onClick={exportPDF}>Export PDF</button>
            <button className="btn" onClick={resetVotes}>Reset Votes + QR</button>
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
        <div className="row" style={{margin:'8px 0'}}>
          <input type="file" accept=".csv" onChange={e=>e.target.files[0] && handleResidentsFile(e.target.files[0])} disabled={uploading} />
          {uploading && <span className="muted">Uploading…</span>}
        </div>
        <div style={{maxHeight:300, overflow:'auto'}}>
          <table>
            <thead><tr><th>Unit</th><th>Owner</th></tr></thead>
            <tbody>
              {residents.map(r=>(<tr key={r.unit_id}><td>{r.unit_id}</td><td>{r.owner_name}</td></tr>))}
            </tbody>
          </table>
        </div>
        <div className="muted">CSV headers: <code>unit_id, owner_name</code></div>
      </section>
    </div>
  );
}
