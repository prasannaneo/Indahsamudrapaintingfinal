import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

function hash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return String(h); }

export default function AdminSetup(){
  const [username,setUsername]=useState(import.meta.env.VITE_DEFAULT_ADMIN_USERNAME||'');
  const [password,setPassword]=useState(import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD||'');
  const [status,setStatus]=useState('');

  useEffect(()=>{(async()=>{
    const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle();
    if (!error && data){ setStatus('Admin exists. You may update.'); }
  })();},[]);

  async function save(){
    if(!username||!password){ alert('Enter both'); return; }
    const password_hash = hash(password);
    const { error } = await supabase.from('admin_settings').upsert({ id:true, username, password_hash }, { onConflict:'id' });
    if (error){ alert(error.message); return; }
    await supabase.from('vote_audit').insert({ action:'setup', details:{ username } });
    setStatus('Saved.');
  }

  return (<div className="grid" style={{gap:8}}>
    <h2>Admin Setup</h2>
    <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
    <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
    <button className="btn" onClick={save}>Save</button>
    {status && <div className="muted">{status}</div>}
  </div>);
}
