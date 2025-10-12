import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { downloadCsv } from '../utils/csv.js';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import Papa from 'papaparse';

function requireAdmin(){ const ok = sessionStorage.getItem('admin')==='1'; if(!ok) window.location.hash='#/admin-login'; return ok; }

export default function AdminDashboard(){
  const [votes,setVotes]=useState([]);
  const [audit,setAudit]=useState([]);
  const [residents,setResidents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [progressMsg,setProgressMsg]=useState('');

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
    const { error: ev } = await supabase.from('votes').delete().not('id', 'is', null);
    if (ev){ alert('Reset votes failed: '+ev.message); return; }
    const { error: eq } = await supabase.from('qr_tokens').delete().not('token', 'is', null);
    if (eq){ alert('Clearing QR tokens failed: '+eq.message); return; }
    await supabase.from('vote_audit').insert({ action:'reset', details:{ votes:true, qr_tokens:true } });
    alert('Votes and QR tokens cleared.');
    location.reload();
  }

  function exportVotes(){ downloadCsv('votes.csv', votes.map(v=>({id:v.id,unit_id:v.unit_id,option:v.option,created_at:v.created_at}))); }
  function exportAudit(){ downloadCsv('vote_audit.csv', audit.map(a=>({id:a.id,action:a.action,voter_name:a.voter_name||'',unit_id:a.unit_id||'',ip:a.ip||'',user_agent:a.user_agent||'',details:a.details?JSON.stringify(a.details):'',created_at:a.created_at}))); }
  function exportResidents(){ downloadCsv('residents.csv', residents); }
  
  
  
  async function genQR(){
    try {
      setProgress(0); setProgressMsg('Loading residents…');
      const { data: r, error: er } = await supabase.from('residents').select('unit_id, owner_name');
      if (er) throw er;
      const list = (r||[]).filter(x=>x.unit_id);
      if (!list.length){ alert('No residents found. Upload residents first.'); return; }

      setProgress(12); setProgressMsg('Creating tokens…');
      const expires = new Date(Date.now() + 14*24*3600*1000).toISOString();
      const batch = list.map(x=>({ token: crypto.randomUUID(), unit_id: x.unit_id, expires_at: expires, owner_name: x.owner_name || '' }));

      const { error: eu } = await supabase.from('qr_tokens').upsert(
        batch.map(({token,unit_id,expires_at})=>({token,unit_id,expires_at})),
        { onConflict: 'token' }
      );
      if (eu) throw eu;

      setProgress(40); setProgressMsg('Preparing QR PDF…');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 36;
      const cellW = 260, cellH = 260;
      const cols = 2;
      let x = margin, y = margin;
      const total = batch.length;
      let done = 0;

      for (const row of batch){
        // QR encodes token ONLY (no URL). You can validate token server-side when scanning.
        const dataUrl = await QRCode.toDataURL(row.token, { width: 220, margin: 1 });

        pdf.setFontSize(13);
        pdf.text(`Unit: ${row.unit_id}`, x, y);
        if (row.owner_name) pdf.text(`Owner: ${row.owner_name}`, x, y+16);
        pdf.addImage(dataUrl, 'PNG', x, y+28, 200, 200);

        // grid position
        if ((x - margin) / cellW >= cols-1){
          x = margin; y += cellH;
        } else {
          x += cellW;
        }
        if (y + cellH > pdf.internal.pageSize.getHeight() - margin){
          pdf.addPage(); x = margin; y = margin;
        }

        done++; setProgress(40 + Math.round(60 * (done/total))); setProgressMsg(`Generating ${done}/${total}…`);
      }

      pdf.save('qr_tokens.pdf');
      await supabase.from('vote_audit').insert({ action:'qr_generate', details:{ count: batch.length, expires_at: expires, pdf:true, url:false } });
      setProgressMsg('Done');
    } catch(e){
      alert('QR generation failed: ' + (e?.message || e));
    } finally {
      setTimeout(()=>{ setProgress(0); setProgressMsg(''); }, 1000);
    }
  }


function exportPDF(){ window.print(); }

  
  async function resetResidents(){
    try {
      if(!confirm('Delete ALL residents?')) return;
      setProgress(0); setProgressMsg('Fetching residents…');

      const { data: r, error: er } = await supabase.from('residents').select('unit_id');
      if (er) throw er;
      const ids = (r||[]).map(x=>x.unit_id).filter(Boolean);
      if (!ids.length){ alert('Residents table is already empty.'); return; }

      // Chunk deletes to avoid payload limits
      const chunkSize = 500;
      let done = 0;
      for (let i=0; i<ids.length; i+=chunkSize){
        const chunk = ids.slice(i, i+chunkSize);
        const { error: ed } = await supabase.from('residents').delete().in('unit_id', chunk);
        if (ed) throw ed;
        done += chunk.length;
        setProgress(Math.min(100, Math.round(100 * done / ids.length)));
        setProgressMsg(`Deleting ${done}/${ids.length}…`);
      }

      await supabase.from('vote_audit').insert({ action:'residents_reset', details:{ count: ids.length } });
      setProgressMsg('Done');
      setTimeout(()=>{ setProgress(0); setProgressMsg(''); location.reload(); }, 600);
    } catch(e){
      alert('Reset residents failed: ' + (e?.message || e));
      setProgress(0); setProgressMsg('');
    }
  }


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
            <button className="btn" onClick={resetResidents}>Reset Residents</button>
            <button className="btn" onClick={genQR}>Generate QR Tokens (14 days)</button>
          </div>
        </div>
        {progress>0 && (
          <div className="card" style={{padding:'6px 10px'}}>
            <div style={{fontSize:12, marginBottom:4}}>{progressMsg}</div>
            <div style={{height:10, background:'#eee', borderRadius:6}}>
              <div style={{height:10, width:progress+'%', background:'#111', borderRadius:6}}></div>
            </div>
          </div>
        )}
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
