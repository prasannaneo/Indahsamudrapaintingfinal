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
  const [pollId, setPollId] = useState(import.meta.env.VITE_DEFAULT_POLL_ID || 'painting-2025');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState(null);
  const [token, setToken] = useState(null);
  const [qrError, setQrError] = useState('');

  const [optAUrl,setOptAUrl]=useState('/images/optionA.svg');
  const [optBUrl,setOptBUrl]=useState('/images/optionB.svg');
  const [optCUrl,setOptCUrl]=useState('/images/optionC.svg');

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from('admin_settings').select('option_a_url, option_b_url, option_c_url').maybeSingle();
    if (data){
      if (data.option_a_url) setOptAUrl(data.option_a_url);
      if (data.option_b_url) setOptBUrl(data.option_b_url);
      if (data.option_c_url) setOptCUrl(data.option_c_url);
    }
  })();},[]);

  useEffect(()=>{
    function getAllParams(){
      let hashQs = '';
      if (window.location.hash.includes('?')) hashQs = window.location.hash.split('?').slice(1).join('?');
      else if (window.location.hash.includes('=')) hashQs = window.location.hash.substring(1);
      const searchQs = window.location.search ? window.location.search.substring(1) : '';
      return new URLSearchParams(hashQs || searchQs || '');
    }
    async function resolveFromToken(tok){
      const { data: t, error } = await supabase.from('qr_tokens').select('unit_id, expires_at, used_at').eq('token', tok).maybeSingle();
      if (error) { setQrError(error.message); return; }
      if (!t) { setQrError('Invalid QR'); return; }
      const expired = t.expires_at && new Date(t.expires_at) < new Date();
      if (expired) { setQrError('This QR has expired.'); return; }
      if (t.used_at) { setQrError('This QR has already been used.'); return; }
      setUnitId(t.unit_id);
      const { data: r } = await supabase.from('residents').select('owner_name').eq('unit_id', t.unit_id).maybeSingle();
      if (r?.owner_name) setVoterName(r.owner_name);
    }
    async function applyFromUrl(){
      const q = getAllParams();
      const unit = q.get('unit_id') || q.get('unit') || q.get('unitNo') || q.get('u');
      const name = q.get('name') || q.get('owner_name') || q.get('owner') || q.get('n');
      const tok = q.get('token') || q.get('t');
      const p = q.get('poll_id') || q.get('poll') || q.get('pid');
      if (p) setPollId(p);
      if (tok){ setToken(tok); await resolveFromToken(tok); }
      else { if (unit) setUnitId(unit); if (name) setVoterName(decodeURIComponent(name)); }
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
    if(!unitId || !selected){
      alert('Please open this page using your QR code, then choose an option.');
      return;
    }
    if (qrError){ alert(qrError); return; }
    setSaving(true); setProgress(10);
    try{
      if (token){
        const { data: t } = await supabase.from('qr_tokens').select('used_at, expires_at').eq('token', token).maybeSingle();
        const expired = t?.expires_at && new Date(t.expires_at) < new Date();
        if (!t || expired || t.used_at){ throw new Error(t?.used_at ? 'This QR has already been used.' : 'Invalid or expired QR.'); }
      }

      const ip = await fetchIP(); setProgress(40);
      const ua = navigator.userAgent;
      const { error: vErr } = await supabase.from('votes').insert({ unit_id: unitId, option: selected, poll_id: pollId, token: token || null });
      if (vErr) {
        if (vErr.code === '23505' || /duplicate key|unique constraint/i.test(vErr.message || '')) {
          setProgress(100); setDone(true); return;
        }
        throw vErr;
      }
      setProgress(70);
      await supabase.from('vote_audit').insert({
        action:'vote', voter_name: voterName || null, unit_id: unitId,
        ip, user_agent: ua, details:{ option: selected, poll_id: pollId, token: token||null }
      });
      if (token){
        await supabase.from('qr_tokens').update({ used_at: new Date().toISOString(), used_by_unit: unitId }).eq('token', token);
      }
      setProgress(100); setDone(true);
    }catch(e){
      alert('Failed to save vote: ' + (e?.message || e));
      console.error(e);
      setProgress(0);
    }finally{ setSaving(false); }
  }

  const disabled = saving || !!qrError;

  return (
    <div className="vote-wrap">
      <div style={{textAlign:'center', marginBottom:18}}>
        <h2 style={{margin:'0 0 6px'}}>Choose your preferred option</h2>
        {unitId ? (
          <div className="muted">Unit: <strong>{unitId}</strong>{voterName ? <> · Name: <strong>{voterName}</strong></> : null} · Poll: <strong>{pollId}</strong></div>
        ) : (
          <div className="muted">Scan your QR to auto-fill your unit</div>
        )}
        {qrError && <div style={{color:'#b91c1c', marginTop:6}}>{qrError}</div>}
      </div>

      <div className="grid v-grid">
        <OptionCard label="A" img={optAUrl} selected={selected==='A'} onSelect={()=>!disabled&&setSelected('A')} onPreview={(src)=>setPreview({src,label:'A'})} />
        <OptionCard label="B" img={optBUrl} selected={selected==='B'} onSelect={()=>!disabled&&setSelected('B')} onPreview={(src)=>setPreview({src,label:'B'})} />
        <OptionCard label="C" img={optCUrl} selected={selected==='C'} onSelect={()=>!disabled&&setSelected('C')} onPreview={(src)=>setPreview({src,label:'C'})} />
      </div>

      <div className="row" style={{justifyContent:'center', marginTop:20}}>
        <button className="btn primary lg" disabled={disabled || !selected} onClick={submitVote}>
          {saving ? 'Submitting…' : `Submit Vote (${selected || '—'})`}
        </button>
      </div>

      {saving && (
        <div className="card" style={{maxWidth:520, margin:'16px auto 0'}}>
          <div className="muted" style={{marginBottom:8}}>Saving your vote…</div>
          <div className="progress"><div style={{width:progress+'%'}}></div></div>
        </div>
      )}

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

      {done && (
        <div className="card thankyou" style={{textAlign:'center', marginTop:18}}>
          <div className="pulse">✓</div>
          <h2 style={{margin:0}}>Thank you!</h2>
          <p style={{margin:0}}>Your vote has been recorded.</p>
        </div>
      )}
    </div>
  );
}