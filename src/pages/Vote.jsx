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
  const [unitId, setUnitId] = useState('');
  const [voterName, setVoterName] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(()=>{
    const q = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const u = q.get('unit_id');
    if (u) setUnitId(u);
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

  if (done) return <div className="card"><h3>Thank you!</h3><p>Your vote has been recorded.</p></div>;

  return (
    <div className="grid" style={{gap:16}}>
      <div className="row">
        <input style={{flex:1}} placeholder="Unit ID" value={unitId} onChange={e=>setUnitId(e.target.value)} />
        <input style={{flex:1}} placeholder="Name (optional)" value={voterName} onChange={e=>setVoterName(e.target.value)} />
      </div>

      <div className="grid grid-3">
        <OptionCard label="A" img="/images/optionA.jpg" selected={selected==='A'} onSelect={()=>setSelected('A')} />
        <OptionCard label="B" img="/images/optionB.jpg" selected={selected==='B'} onSelect={()=>setSelected('B')} />
        <OptionCard label="C" img="/images/optionC.jpg" selected={selected==='C'} onSelect={()=>setSelected('C')} />
      </div>

      <div className="row">
        <button className="btn" disabled={saving} onClick={submitVote}>{saving?'Saving...':'Submit'}</button>
      </div>
    </div>
  );
}
