import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useNavigate } from 'react-router-dom';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  return String(h);
}

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function login() {
    setError('');
    try {
      const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle();
      if (error) throw error;
      if (!data) { setError('Admin not setup yet.'); return; }
      if (data.username === username && data.password_hash === hash(password)) {
        sessionStorage.setItem('admin', '1');
        await supabase.from('vote_audit').insert({ action:'login', details:{username} });
        nav('/admin');
      } else {
        setError('Invalid credentials');
      }
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-3 max-w-sm">
      <h2 className="text-xl font-semibold">Admin Login</h2>
      <input className="border rounded-md p-2 w-full" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input className="border rounded-md p-2 w-full" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="px-4 py-2 border rounded-md" onClick={login}>Login</button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
