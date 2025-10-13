import React, { useEffect, useState } from 'react';
import OptionCard from '../components/OptionCard.jsx';
import { supabase } from '../lib/supabase.js';

async function fetchIP() {
  try {
    const url = import.meta.env.VITE_IP_ENDPOINT;
    if (!url) return 'unknown';
    const r = await fetch(url);
    if (!r.ok) return 'unknown';
    return (await r.text()).trim();
  } catch { return 'unknown'; }
}

export default function Vote(){
  const [preview, setPreview] = useState(null);
  const [unitId, setUnitId] = useState('');
  const [voterName, setVoterName] = useState('');
  const [selected, setSelected] = useState(null);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(()=>{
  function applyFromHash(){
    const qs = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const q = new URLSearchParams(qs);
    const u = q.get('unit_id');
    const n = q.get('name');
    const t = q.get('token');
    if (u) setUnitId(u);
    if (n) setVoterName(decodeURIComponent(n));
    // token (t) can be stored if you add validation later
  }
  applyFromHash();
  window.addEventListener('hashchange', applyFromHash);
  return () => window.removeEventListener('hashchange', applyFromHash);
}, []);


  async function submitVote(){
    if(!unitId || !selected){ alert('Enter Unit ID and choose an option.'); return; }
    setSaving(true);
    try{
      const ip = await fetchIP();
      const ua = navigator.userAgent;
      const { error: vErr } = await supabase.from('votes').insert({ unit_id: unitId, option: selected });
      if (vErr) throw vErr;
      await supabase.from('vote_audit').insert({
        action:'vote',
        voter_name: voterName || null,
        unit_id: unitId,
        ip, user_agent: ua, details:{ option: selected }
      });
      setDone(true);
    }catch(e){
      alert('Failed to save vote: ' + (e?.message || e));
      console.error(e);
    }finally{ setSaving(false); }
  }

    if (done) return (
    <div className="card thankyou" style={{textAlign:'center'}}>
      <div className="pulse">✓</div>
      <h2 style={{margin:0}}>Thank you!</h2>
      <p style={{margin:0}}>Your vote has been recorded.</p>
    </div>
  );

  return (
  <div className="vote-wrap">
    {parsed && !unitId ? (
      <div className="card" style={{textAlign:'center', padding:'32px'}}>
        <h2 style={{margin:'0 0 8px'}}>⚠️ Invalid QR – please contact admin</h2>
        <p className="muted" style={{margin:0}}>This page must be opened via a valid QR code link.</p>
      </div>
    ) : (
      <>
        <div style={{textAlign:'center', marginBottom:16}}>
          <h2 style={{margin:'0 0 6px'}}>Choose your preferred option</h2>
          {voterName ? <div className="muted" style={{marginBottom:6}}>Owner: <strong>{voterName}</strong></div> : null}
          <div className="muted">Unit: <strong>{unitId}</strong>{voterName ? <> · Name: <strong>{voterName}</strong></> : null}</div>
        </div>

        <div className="grid v-grid">
          <OptionCard label="A" img="/images/optionA.jpg" selected={selected==='A'} onSelect={()=>setSelected('A')} onPreview={(src)=>setPreview({src,label:'A'})} />
          <OptionCard label="B" img="/images/optionB.jpg" selected={selected==='B'} onSelect={()=>setSelected('B')} onPreview={(src)=>setPreview({src,label:'B'})} />
          <OptionCard label="C" img="/images/optionC.jpg" selected={selected==='C'} onSelect={()=>setSelected('C')} onPreview={(src)=>setPreview({src,label:'C'})} />
        </div>

        <div className="row" style={{justifyContent:'center', marginTop:18}}>
          <button className="btn primary lg" disabled={saving || !selected} onClick={submitVote}>
            {saving ? 'Saving…' : `Submit Vote (${selected || '—'})`}
          </button>
        </div>

        {preview && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}} onClick={()=>setPreview(null)}>
            <div className="card" style={{maxWidth: '80vw', maxHeight:'85vh', overflow:'auto'}} onClick={e=>e.stopPropagation()}>
              <img src={preview.src} alt={'Option '+preview.label} style={{maxWidth:'100%', maxHeight:'70vh', borderRadius:12}}/>
              <div className="row" style={{justifyContent:'space-between', marginTop:10}}>
                <div><strong>Option {preview.label}</strong></div>
                <div className="row" style={{gap:8}}>
                  <button className="btn" onClick={()=>setPreview(null)}>Close</button>
                  <button className="btn primary" onClick={()=>{ setSelected(preview.label); setPreview(null); }}>Choose Option {preview.label}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);
}
