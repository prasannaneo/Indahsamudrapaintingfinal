import React, { useMemo, useState, useEffect } from 'react';
import OptionCard from '../components/OptionCard.jsx';
import { supabase } from '../lib/supabase.js';

async function fetchIP() {
  try {
    const url = import.meta.env.VITE_IP_ENDPOINT;
    if (!url) return 'unknown';
    const res = await fetch(url);
    if (!res.ok) return 'unknown';
    return (await res.text()).trim();
  } catch { return 'unknown'; }
}

export default function Vote() {
  const [selected, setSelected] = useState(null);
  const [unitId, setUnitId] = useState('');
  const [voterName, setVoterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const options = useMemo(() => (['A','B','C']), []);

  useEffect(() => {
    // If scanned by QR with unit_id in hash params
    const q = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const u = q.get('unit_id');
    if (u) setUnitId(u);
  }, []);

  async function submitVote() {
    if (!selected || !unitId) {
      alert('Please enter Unit ID and select an option.');
      return;
    }
    setSaving(true);
    try {
      const ip = await fetchIP();
      const ua = navigator.userAgent;
      const { error: vErr } = await supabase.from('votes').insert({ unit_id: unitId, option: selected });
      if (vErr) throw vErr;
      await supabase.from('vote_audit').insert({
        action: 'vote',
        voter_name: voterName || null,
        unit_id: unitId,
        ip,
        user_agent: ua,
        details: { option: selected }
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      alert('Failed to submit vote: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="p-4 border rounded-xl">
        <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
        <p>Your vote has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <label className="text-sm">Unit ID</label>
        <input value={unitId} onChange={(e)=>setUnitId(e.target.value)} placeholder="e.g., A-12-05"
               className="border rounded-md p-2" />
      </div>
      <div className="grid gap-3">
        <label className="text-sm">Your Name (optional)</label>
        <input value={voterName} onChange={(e)=>setVoterName(e.target.value)} placeholder="Owner/Resident name"
               className="border rounded-md p-2" />
      </div>
      <div className="mt-4">
        <div className="font-medium mb-2">Choose one option</div>
        {options.map(opt => (
          <OptionCard key={opt}
            label={opt}
            selected={selected === opt}
            onSelect={()=>setSelected(opt)}
            description={opt === 'A' ? 'Scheme A' : opt === 'B' ? 'Scheme B' : 'Scheme C'}
          />
        ))}
      </div>
      <button
        onClick={submitVote}
        disabled={saving}
        className="mt-2 px-4 py-2 border rounded-md"
      >{saving ? 'Saving...' : 'Submit Vote'}</button>
    </div>
  );
}
