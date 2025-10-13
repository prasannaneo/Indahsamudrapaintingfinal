import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useNavigate } from 'react-router-dom';
function hash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return String(h); }
export default function AdminLogin(){
  const nav = useNavigate();
  const [u,setU]=useState(''); const [p,setP]=useState(''); const [err,setErr]=useState('');
  async function login(){
    setErr('');
    try{
      const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle();
      if (error) throw error;
      if (!data) { setErr('Admin not set up.'); return; }
      if (data.username===u && data.password_hash===hash(p)){
        sessionStorage.setItem('admin','1');
        nav('/admin');
      } else setErr('Invalid credentials');
    }catch(e){ setErr(e?.message||String(e)); }
  }
  return (<div className="grid" style={{gap:8, maxWidth:380}}>
    <h2>Admin Login</h2>
    <input placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/>
    <input placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)}/>
    <button className="btn" onClick={login}>Login</button>
    {err && <div style={{color:'crimson', fontSize:14}}>{err}</div>}
  </div>);
}
