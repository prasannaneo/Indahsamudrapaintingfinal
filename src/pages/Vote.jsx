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
  const [preview, setPreview] = useState(null);
  const [parsed, setParsed] = useState(false);

  useEffect(()=>{
    function getAllParams(){
      let hashQs = '';
      if (window.location.hash.includes('?')) {
        hashQs = window.location.hash.split('?').slice(1).join('?');
      } else if (window.location.hash.includes('=')) {
        hashQs = window.location.hash.substring(1);
      }
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
      if (unit) setUnitId(unit);
      if (name) setVoterName(decodeURIComponent(name));
      if (!unit && token){
        const { unit_id, owner_name } = await resolveFromToken(token);
        if (unit_id) setUnitId(unit_id);
        if (owner_name && !name) setVoterName(owner_name);
      }
      setParsed(true);
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
    if(!unitId || !selected){ alert('Invalid QR or no option selected.'); return; }
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
      {!parsed ? (
        <div className="card" style={{textAlign:'center', padding:'32px'}}>Loading…</div>
      ) : !unitId ? (
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
        </>
      )}
    </div>
  );
}
