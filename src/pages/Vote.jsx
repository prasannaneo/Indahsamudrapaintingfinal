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
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(()=>{
    const q = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const u = q.get('unit_id');
    const n = q.get('name');
    const t = q.get('token');
    if (u) setUnitId(u);
    if (n) setVoterName(decodeURIComponent(n));
    // If you later want to validate token, you can store it in state here
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

  if (done) return <div className="card" style={{textAlign:'center'}}><h2>Thank you!</h2><p>Your vote has been recorded.</p></div>;

  return (
    <div className="grid" style={{gap:16}}>
      <div className="row" style={{gap:12}}>
        <input className="input" style={{flex:1}} placeholder="Unit ID" value={unitId} onChange={e=>setUnitId(e.target.value)} />
        <input className="input" style={{flex:1}} placeholder="Your Name (optional)" value={voterName} onChange={e=>setVoterName(e.target.value)} />
      </div>

      <div className="grid grid-3" style={{gap:16}}>
        <OptionCard label="A" img="/images/optionA.jpg" selected={selected==='A'} onSelect={()=>setSelected('A')} onPreview={(src)=>setPreview({src,label:'A'})} />
        <OptionCard label="B" img="/images/optionB.jpg" selected={selected==='B'} onSelect={()=>setSelected('B')} onPreview={(src)=>setPreview({src,label:'B'})} />
        <OptionCard label="C" img="/images/optionC.jpg" selected={selected==='C'} onSelect={()=>setSelected('C')} onPreview={(src)=>setPreview({src,label:'C'})} />
      </div>

      <div className="row" style={{justifyContent:'center', marginTop:8}}>
        <button className="btn primary" disabled={saving} onClick={submitVote}>{saving?'Saving…':'Submit Vote'}</button>
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
    </div>
  );
}
