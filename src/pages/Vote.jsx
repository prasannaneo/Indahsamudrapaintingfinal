
import React, { useEffect, useState } from 'react';
import OptionCard from '../components/OptionCard.jsx';
import { supabase } from '../lib/supabase.js';

async function fetchIP() {
  try { const url = import.meta.env.VITE_IP_ENDPOINT; if (!url) return 'unknown';
    const r = await fetch(url); if (!r.ok) return 'unknown'; return (await r.text()).trim();
  } catch { return 'unknown'; }
}

export default function Vote(){
  const [unitId, setUnitId] = useState('');
  const [voterName, setVoterName] = useState('');
  const [pollId, setPollId] = useState(import.meta.env.VITE_DEFAULT_POLL_ID || 'painting-2025');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(()=>{
    function getAllParams(){
      let hashQs = '';
      if (window.location.hash.includes('?')) hashQs = window.location.hash.split('?').slice(1).join('?');
      else if (window.location.hash.includes('=')) hashQs = window.location.hash.substring(1);
      const searchQs = window.location.search ? window.location.search.substring(1) : '';
      const qs = hashQs || searchQs || '';
      return new URLSearchParams(qs);
    }
    async function resolveFromToken(token){
      const { data: tokenRow } = await supabase.from('qr_tokens').select('unit_id, expires_at').eq('token', token).maybeSingle();
      if (!tokenRow) return { unit_id: null, owner_name: null, expired: false };
      let owner = null;
      const { data: residentRow } = await supabase.from('residents').select('owner_name').eq('unit_id', tokenRow.unit_id).maybeSingle();
      owner = residentRow?.owner_name || null;
      let expired=false; try{ expired = tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(); }catch{}
      return { unit_id: tokenRow.unit_id, owner_name: owner, expired };
    }
    async function applyFromUrl(){
      const q = getAllParams();
      const unit = q.get('unit_id') || q.get('unit') || q.get('unitNo') || q.get('u');
      const name = q.get('name') || q.get('owner_name') || q.get('owner') || q.get('n');
      const token = q.get('token') || q.get('t');
      const p = q.get('poll_id') || q.get('poll') || q.get('pid');
      if (unit) setUnitId(unit);
      if (name) setVoterName(decodeURIComponent(name));
      if (p) setPollId(p);
      if (!unit && token){
        const { unit_id, owner_name } = await resolveFromToken(token);
        if (unit_id) setUnitId(unit_id);
        if (owner_name && !name) setVoterName(owner_name);
      }
    }
    applyFromUrl();
    window.addEventListener('hashchange', applyFromUrl);
    window.addEventListener('popstate', applyFromUrl);
    return () => {
      window.removeEventListener('hashchange', applyFromUrl);
      window.removeEventListener('popstate', applyFromUrl);
    };
  }, []);

  async function submitVote(){
    if(!unitId || !selected){ alert('Please open this page using your QR code, then choose an option.'); return; }
    setSaving(true); setProgress(10);
    try{
      const ip = await fetchIP(); setProgress(40);
      const ua = navigator.userAgent;
      const { error: vErr } = await supabase.from('votes').insert({ unit_id: unitId, option: selected, poll_id: pollId });
      if (vErr) {
        if (vErr.code === '23505' || /duplicate key|unique constraint/i.test(vErr.message || '')) { setProgress(100); setDone(true); return; }
        throw vErr;
      }
      setProgress(70);
      await supabase.from('vote_audit').insert({ action:'vote', voter_name: voterName || null, unit_id: unitId, ip, user_agent: ua, details:{ option: selected, poll_id: pollId } });
      setProgress(100); setDone(true);
    }catch(e){ alert('Failed to save vote: ' + (e?.message || e)); setProgress(0); }
    finally{ setSaving(false); }
  }

  return (
    <div className="vote-wrap">
      <div style={{textAlign:'center', marginBottom:18}}>
        <h2 style={{margin:'0 0 6px'}}>Choose your preferred option</h2>
        {unitId ? <div className="muted">Unit: <strong>{unitId}</strong>{voterName ? <> · Name: <strong>{voterName}</strong></> : null} · Poll: <strong>{pollId}</strong></div> : <div className="muted">Scan your QR to auto-fill your unit</div>}
      </div>
      <div className="grid v-grid">
        <OptionCard label="A" img="/images/optionA.svg" selected={selected==='A'} onSelect={()=>setSelected('A')} onPreview={(src)=>setPreview({src,label:'A'})} />
        <OptionCard label="B" img="/images/optionB.svg" selected={selected==='B'} onSelect={()=>setSelected('B')} onPreview={(src)=>setPreview({src,label:'B'})} />
        <OptionCard label="C" img="/images/optionC.svg" selected={selected==='C'} onSelect={()=>setSelected('C')} onPreview={(src)=>setPreview({src,label:'C'})} />
      </div>
      <div className="row" style={{justifyContent:'center', marginTop:20}}>
        <button className="btn primary lg" disabled={saving || !selected} onClick={submitVote}>{saving ? 'Submitting…' : `Submit Vote (${selected || '—'})`}</button>
      </div>
      {saving && (<div className="card" style={{maxWidth:520, margin:'16px auto 0'}}><div className="muted" style={{marginBottom:8}}>Saving your vote…</div><div className="progress"><div style={{width:progress+'%'}}></div></div></div>)}
      {preview && (<div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}} onClick={()=>setPreview(null)}>
          <div className="card" style={{maxWidth:'80vw', maxHeight:'85vh', overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <img src={preview.src} alt={'Option '+preview.label} style={{maxWidth:'100%', maxHeight:'70vh', borderRadius:12}}/>
            <div className="row" style={{justifyContent:'space-between', marginTop:10}}>
              <div><strong>Option {preview.label}</strong></div>
              <div className="row" style={{gap:8}}>
                <button className="btn" onClick={()=>setPreview(null)}>Close</button>
                <button className="btn primary" onClick={()=>{ setSelected(preview.label); setPreview(null); }}>Choose Option {preview.label}</button>
              </div>
            </div>
          </div>
        </div>)}
      {done && (<div className="card thankyou" style={{textAlign:'center', marginTop:18}}><div className="pulse">✓</div><h2 style={{margin:0}}>Thank you!</h2><p style={{margin:0}}>Your vote has been recorded.</p></div>)}
    </div>
  );
}
