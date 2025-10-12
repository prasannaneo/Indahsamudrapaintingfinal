import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

function hash(str) {
  // very simple hash for demo; replace with proper hashing server-side in production
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  return String(h);
}

export default function AdminSetup() {
  const [username, setUsername] = useState(import.meta.env.VITE_DEFAULT_ADMIN_USERNAME || '');
  const [password, setPassword] = useState(import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || '');
  const [status, setStatus] = useState('');

  useEffect(() => { (async () => {
    const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle();
    if (error && error.code !== 'PGRST116') console.warn(error);
    if (data) setStatus('Existing admin is configured. You can update it here.');
  })(); }, []);

  async function save() {
    if (!username || !password) { alert('Username & password required'); return; }
    const password_hash = hash(password);
    const { data, error } = await supabase.from('admin_settings').upsert(
      { id: true, username, password_hash },
      { onConflict: 'id' }
    ).select().maybeSingle();
    if (error) { alert('Save failed: ' + error.message); return; }
    await supabase.from('vote_audit').insert({ action:'setup', details:{username} });
    setStatus('Saved admin settings.');
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Admin Setup</h2>
      <div className="grid gap-2">
        <label className="text-sm">Admin Username</label>
        <input className="border rounded-md p-2" value={username} onChange={e=>setUsername(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Admin Password</label>
        <input className="border rounded-md p-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <button onClick={save} className="px-4 py-2 border rounded-md">Save</button>
      {status && <div className="text-sm text-gray-600">{status}</div>}
    </div>
  );
}
