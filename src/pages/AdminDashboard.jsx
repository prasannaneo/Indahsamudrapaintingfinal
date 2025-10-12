import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { downloadCsv } from '../utils/csv.js';

function requireAdmin() {
  const ok = sessionStorage.getItem('admin') === '1';
  if (!ok) window.location.hash = '#/admin-login';
  return ok;
}

export default function AdminDashboard() {
  const [votes, setVotes] = useState([]);
  const [audit, setAudit] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAdmin()) return;
    (async () => {
      setLoading(true);
      const [{ data: v }, { data: a }, { data: r }] = await Promise.all([
        supabase.from('votes').select('*').order('created_at', { ascending: false }),
        supabase.from('vote_audit').select('*').order('created_at', { ascending: false }),
        supabase.from('residents').select('*').order('unit_id')
      ]);
      setVotes(v || []);
      setAudit(a || []);
      setResidents(r || []);
      setLoading(false);
    })();
  }, []);

  function tally() {
    const t = { A:0, B:0, C:0 };
    for (const v of votes) if (t[v.option] !== undefined) t[v.option]++;
    return t;
  }

  async function resetVotes() {
    if (!confirm('This will delete ALL votes. Continue?')) return;
    const { error } = await supabase.from('votes').delete().neq('id', -1);
    if (error) { alert('Reset failed: ' + error.message); return; }
    await supabase.from('vote_audit').insert({ action:'reset', details:{ reason: 'admin reset' } });
    alert('Votes cleared.');
    location.reload();
  }

  function exportVotesCsv() {
    const rows = votes.map(v => ({
      id: v.id,
      unit_id: v.unit_id,
      option: v.option,
      created_at: v.created_at
    }));
    downloadCsv('votes.csv', rows);
  }

  function exportAuditCsv() {
    const rows = audit.map(a => ({
      id: a.id,
      action: a.action,
      voter_name: a.voter_name || '',
      unit_id: a.unit_id || '',
      ip: a.ip || '',
      user_agent: a.user_agent || '',
      details: a.details ? JSON.stringify(a.details) : '',
      created_at: a.created_at
    }));
    downloadCsv('vote_audit.csv', rows);
  }

  function exportResidentsCsv() {
    const rows = residents.map(r => ({ unit_id: r.unit_id, owner_name: r.owner_name }));
    downloadCsv('residents.csv', rows);
  }

  if (!requireAdmin()) return null;

  const t = tally();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>

      <section className="border rounded-xl p-4">
        <div className="font-medium mb-2">Tally</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-md p-3">Option A: <b>{t.A}</b></div>
          <div className="border rounded-md p-3">Option B: <b>{t.B}</b></div>
          <div className="border rounded-md p-3">Option C: <b>{t.C}</b></div>
        </div>
        <div className="mt-3 flex gap-3">
          <button onClick={exportVotesCsv} className="px-3 py-2 border rounded-md">Export Votes CSV</button>
          <button onClick={exportAuditCsv} className="px-3 py-2 border rounded-md">Export Audit CSV</button>
          <button onClick={exportResidentsCsv} className="px-3 py-2 border rounded-md">Export Residents CSV</button>
          <button onClick={resetVotes} className="px-3 py-2 border rounded-md">Reset Votes</button>
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <div className="font-medium mb-2">Recent Activity</div>
        <div className="max-h-64 overflow-auto text-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Time</th>
                <th className="p-2">Action</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Name</th>
                <th className="p-2">IP</th>
                <th className="p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-2">{a.action}</td>
                  <td className="p-2">{a.unit_id || ''}</td>
                  <td className="p-2">{a.voter_name || ''}</td>
                  <td className="p-2">{a.ip || ''}</td>
                  <td className="p-2">{a.details ? JSON.stringify(a.details) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <div className="font-medium mb-2">Residents</div>
        <div className="max-h-64 overflow-auto text-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Unit</th>
                <th className="p-2">Owner Name</th>
              </tr>
            </thead>
            <tbody>
              {residents.map(r => (
                <tr key={r.unit_id} className="border-b">
                  <td className="p-2">{r.unit_id}</td>
                  <td className="p-2">{r.owner_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
