import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode.react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";
const siteUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : import.meta.env.VITE_PUBLIC_SITE_URL || "";
const hideAdminLinks =
  (import.meta.env.VITE_HIDE_ADMIN_LINKS || "")
    .toString()
    .toLowerCase() === "true";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "");
  const [hasTokenQS, setHasTokenQS] = useState(new URLSearchParams(window.location.search).has("t"));
  useEffect(() => {
    const f = () => { setRoute(window.location.hash || ""); setHasTokenQS(new URLSearchParams(window.location.search).has("t")); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  if (route === "#admin-login") return <AdminLogin />;
  if (route === "#admin-setup") return <AdminSetup />;
  if (route === "#admin") return <AdminDashboard />;
  return <PublicVote hasTokenQS={hasTokenQS} />;
}

/* ===================== Public Vote ===================== */
function PublicVote({ hasTokenQS }) {
  const [token, setToken] = useState("");
  const [record, setRecord] = useState(null);
  const [counts, setCounts] = useState({ A: 0, B: 0, C: 0 });
  const [votedFor, setVotedFor] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const designs = [
    { id: "A", name: "Dark Green & Yellow", image: "/images/design-a.jpg" },
    { id: "B", name: "Grey Modern", image: "/images/design-b.jpg" },
    { id: "C", name: "Earthy Beige", image: "/images/design-c.jpg" },
  ];

  useEffect(() => {
    (async () => {
      const t = new URLSearchParams(window.location.search).get("t") || "";
      if (t) {
        setToken(t);
        await lookupToken(t);
      }
      await refreshResults();
      setLoading(false);
    })();
  }, []);

  async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function lookupToken(raw) {
    setError("");
    if (!raw) { setRecord(null); return; }
    try {
      const hash = await sha256Hex(raw);
      const { data, error } = await supabase
        .from("vote_tokens")
        .select("id, unit_id, owner_name, used_at, expires_at")
        .eq("poll_id", pollId)
        .eq("token_hash", hash)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setError("Invalid QR. Please use the official QR from management."); setRecord(null); return; }
      if (data.used_at) setError("This QR link was already used to vote.");
      if (data.expires_at && new Date(data.expires_at) < new Date()) setError("This QR link has expired. Please request a new one.");
      setRecord(data);
    } catch (e) {
      setError(e.message || String(e)); setRecord(null);
    }
  }

  async function refreshResults() {
    const { data } = await supabase.from("votes").select("option_id").eq("poll_id", pollId);
    const t = { A: 0, B: 0, C: 0 };
    (data || []).forEach((r) => { t[r.option_id] = (t[r.option_id] || 0) + 1; });
    setCounts(t);
  }

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  async function confirmVote() {
    if (!confirmId) return;
    if (!record) { alert("Please scan your unit's official QR to vote."); return; }
    const { error: insErr } = await supabase.from("votes").insert({
      poll_id: pollId,
      unit_id: record.unit_id,
      unit: record.unit_id,
      option_id: confirmId,
      voter_name: record.owner_name || null,
      name: record.owner_name || null,
    });
    if (insErr) {
      alert(insErr.message?.includes("duplicate key") ? "Your unit has already voted. Thank you." : "Vote failed: " + insErr.message);
      setConfirmId(null); return;
    }
    await supabase.from("vote_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);
    setVotedFor(confirmId); setConfirmId(null); await refreshResults();
  }

  if (loading) return <div className="container">Loading…</div>;
  const showAdminLink = !hasTokenQS && !hideAdminLinks;

  return (
    <div className="container gradient">
      <div className="nav">
        {showAdminLink && <a className="link" href="#admin-login">Admin Login</a>}
      </div>
      <div className="header">
        <div style={{ flex: 1 }}>
          <h1>🎨 Indah Samudra Condo Painting – Voting</h1>
          {record && (
            <div className="panel" style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>Welcome{record.owner_name ? ` — ${record.owner_name}` : ""}</div>
              <div className="mono pill" style={{ marginTop: 6 }}>Unit: {record.unit_id}</div>
              {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            </div>
          )}
          {!record && (
            <div className="panel" style={{ marginTop: 8 }}>
              <div className="notice">Paste your token to verify (or scan the official QR):</div>
              <div className="row" style={{ marginTop: 8 }}>
                <input className="input" placeholder="Paste token here" value={token} onChange={(e)=>setToken(e.target.value)} />
                <button className="btn" onClick={() => lookupToken(token)}>Verify</button>
              </div>
              {error && <div className="error">{error}</div>}
            </div>
          )}

          <div className="space"></div>
          <div className="results">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div><strong>Live Results</strong></div>
              <div>{total} vote{total === 1 ? "" : "s"}</div>
            </div>

            <div className="grid3" style={{ marginTop: 12, marginBottom: 8 }}>
              {designs.map((d) => {
                const v = counts[d.id] || 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return (
                  <div key={d.id} className="card">
                    <div className="badge">Option {d.id} — {d.name}</div>
                    <img src={d.image} alt={`Option ${d.id} — ${d.name}`} className="card-img"
                         onError={(e)=>{e.currentTarget.src="https://placehold.co/800x500?text=Upload+design-"+d.id}} />
                    <div className="card-body">
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <div className="mono" style={{ fontSize: 13, color: "#64748b" }}>
                          {v} vote{v === 1 ? "" : "s"} • {pct}%
                        </div>
                        <button className="btn" onClick={() => window.open(d.image, "_blank")}>Preview</button>
                      </div>
                      <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${pct}%` }} /></div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <button className="btn primary" onClick={() => setConfirmId(d.id)} disabled={!record || !!record.used_at || !!votedFor}>
                          {votedFor === d.id ? "Your vote" : `Vote for ${d.id}`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {confirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", padding:16, borderRadius:12, width:360 }}>
            <div style={{ fontWeight:600, marginBottom:6 }}>Confirm your vote?</div>
            <div style={{ fontSize:14, color:"#334155" }}>Unit <b>{record?.unit_id}</b> voting for option <b>{confirmId}</b>.</div>
            <div className="row" style={{ justifyContent:"flex-end", marginTop:12 }}>
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn primary" onClick={confirmVote}>Confirm Vote</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .container{max-width:1100px;margin:0 auto;padding:24px}
        .gradient{background:linear-gradient(180deg,#f8fafc 0%,#ffffff 30%,#f1f5f9 100%)}
        .nav{display:flex;align-items:center;gap:8px;margin-bottom:10px}
        .header{display:flex;gap:20px;align-items:flex-start}
        .panel{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
        .row{display:flex;gap:8px}
        .results{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa}
        .progress{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden}
        .progress>div{height:100%;background:#0ea5e9}
        .btn{padding:10px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;cursor:pointer;text-decoration:none;display:inline-block;transition:transform .06s ease, box-shadow .12s ease}
        .btn:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(2,8,23,.06)}
        .btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
        .btn.destructive{background:#ef4444;color:#fff;border-color:#ef4444}
        .input{padding:8px;border:1px solid #e5e7eb;border-radius:10px;width:100%}
        .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
        .pill{display:inline-block;padding:2px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px}
        .notice{font-size:13px;color:#334155}
        .error{color:#b91c1c;font-size:13px;margin-top:6px}
        .space{height:12px}
        .link{color:#2563eb;text-decoration:none}
        .link:hover{text-decoration:underline}
        .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
        .card{position:relative;border:1px solid #e5e7eb;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 6px 18px rgba(2,8,23,0.06)}
        .card-img{width:100%;height:220px;object-fit:cover;display:block}
        .card-body{padding:10px}
        .badge{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:.2px}
      `}</style>
    </div>
  );
}

/* ===================== Admin Login ===================== */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  async function sha256(t) {
    const enc = new TextEncoder().encode(t);
    const h = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  async function login() {
    if (!email || !pw) return;
    const { data } = await supabase.from("admins").select("pass_sha256").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!data) { alert("Admin not found"); return; }
    const hash = await sha256(pw);
    if (hash !== data.pass_sha256) { alert("Wrong password"); return; }
    localStorage.setItem("adminEmail", email.trim().toLowerCase());
    window.location.hash = "#admin";
  }

  return (
    <div className="container">
      <div className="nav"><a className="link" href="#">← Back</a></div>
      <h1>🔐 Admin Login</h1>
      <div className="grid" style={{ maxWidth: 360 }}>
        <input className="input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} />
        <button className="btn primary" onClick={login}>Login</button>
      </div>
      <div className="space"></div>
      <div className="notice">Need to create an admin? Use <a className="link" href="#admin-setup">Admin Setup</a>.</div>
    </div>
  );
}

/* ===================== Admin Setup ===================== */
function AdminSetup() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [admins, setAdmins] = useState([]);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from("admins").select("email, created_at");
    setAdmins(data || []);
  })()},[]);

  async function sha256(t) {
    const enc = new TextEncoder().encode(t);
    const h = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  async function addAdmin() {
    if (code !== import.meta.env.VITE_ADMIN_SETUP_CODE) { alert("Setup code incorrect"); return; }
    if (!email || !pw) return;
    const hash = await sha256(pw);
    const { error } = await supabase.from("admins").insert({ email: email.trim().toLowerCase(), pass_sha256: hash });
    if (error) { alert("Failed to add admin (maybe exists)"); return; }
    const { data } = await supabase.from("admins").select("email, created_at");
    setAdmins(data || []); setEmail(""); setPw(""); alert("Admin added");
  }

  return (
    <div className="container">
      <div className="nav"><a className="link" href="#">← Back</a></div>
      <h1>🛠️ Admin Setup</h1>
      <div className="grid" style={{ maxWidth: 420 }}>
        <input className="input" placeholder="Setup code" value={code} onChange={(e)=>setCode(e.target.value)} />
        <input className="input" placeholder="Admin email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} />
        <button className="btn primary" onClick={addAdmin}>Add Admin</button>
      </div>
      <div className="space"></div>
      <div className="panel">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Current Admins</div>
        <table>
          <thead><tr><th>Email</th><th>Created</th></tr></thead>
          <tbody>{admins.map((a,i)=>(<tr key={i}><td>{a.email}</td><td>{new Date(a.created_at).toLocaleString()}</td></tr>))}</tbody>
        </table>
        <div className="space"></div>
        <div className="notice">Setup code = <b>VITE_ADMIN_SETUP_CODE</b> (set in Vercel & re-deploy).</div>
      </div>
    </div>
  );
}

/* ===================== Admin Dashboard ===================== */
function AdminDashboard() {
  const [me] = useState(localStorage.getItem("adminEmail") || "");
  const [counts, setCounts] = useState({ A: 0, B: 0, C: 0 });
  const [status, setStatus] = useState({ units: 0, tokens: 0, votes: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [rowsPreview, setRowsPreview] = useState([]);

  useEffect(() => { if (!me) window.location.hash = "#admin-login"; }, [me]);
  useEffect(() => { (async()=>{ await refresh(); })(); }, []);

  async function refresh() {
    setMsg("");
    const { data: v } = await supabase.from("votes").select("unit_id, option_id").eq("poll_id", pollId);
    const tally = { A: 0, B: 0, C: 0 }; (v || []).forEach((r) => { tally[r.option_id] = (tally[r.option_id] || 0) + 1; }); setCounts(tally);
    const { data: r } = await supabase.from("residents").select("unit_id");
    const { data: t } = await supabase.from("vote_tokens").select("id").eq("poll_id", pollId);
    setStatus({ units: (r || []).length, tokens: (t || []).length, votes: (v || []).length });
  }

  async function callApiJSON(path, body) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId, ...body }) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return await res.json();
  }
  async function callApiBLOB(path, body) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId, ...body }) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return await res.blob();
  }

  async function qrPack() {
    try { setBusy(true); setMsg("Generating QR pack (PDF)…");
      const blob = await callApiBLOB("/api/generate-qr-pack", {});
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${pollId}-QR-pack.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMsg("QR pack ready."); await refresh();
    } catch (e) { setMsg("QR pack failed: " + (e.message || e)); }
    finally { setBusy(false); }
  }

  async function resetPoll() {
    const code = prompt("Type the setup/reset code to confirm reset:"); if (!code) return;
    try { setBusy(true); setMsg("Resetting poll…");
      const res = await fetch("/api/reset-poll", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ pollId, code }) });
      const out = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(out?.error || out?.message || "Reset failed");
      setMsg(`Reset complete. Deleted ${out.votesDeleted} vote(s) and ${out.tokensDeleted} token(s).`); await refresh();
    } catch(e) { setMsg("Reset failed: " + (e.message || e)); }
    finally { setBusy(false); }
  }
  async function resetResidents() {
    const code = prompt("Type the setup/reset code to delete ALL residents (this also removes all tokens & votes due to cascade):"); if (!code) return;
    try { setBusy(true); setMsg("Resetting resident roster…");
      const res = await fetch("/api/reset-residents", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ code }) });
      const out = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(out?.error || out?.message || "Reset residents failed");
      setMsg("Residents reset complete. (Roster, tokens & votes cleared.)"); await refresh();
    } catch(e) { setMsg("Reset residents failed: " + (e.message || e)); }
    finally { setBusy(false); }
  }

  // File parsing for residents
  function normalizeHeader(h) { return (h || "").toString().trim().toLowerCase().replace(/\s+/g, "_"); }
  function mapHeaders(fields) {
    const names = fields.map(normalizeHeader);
    const find = (...alts) => { for (const a of alts){ const i = names.indexOf(a); if (i>=0) return i; } return -1; };
    return { unit_id: find("unit_id","unit","unit_no","unit_number","unitnumber","unit-no"),
             owner_name: find("owner_name","owner","name","owner_name_(as_per_ic)"),
             email: find("email","e-mail"),
             whatsapp: find("whatsapp","phone","mobile","contact","contact_no") };
  }
  function fromRows(fields, data) {
    const idx = mapHeaders(fields); const rows = [];
    for (const r of data) {
      const get = (i) => (i >= 0 ? (r[i] ?? "").toString() : "");
      const unit = get(idx.unit_id).trim().toUpperCase();
      const owner = get(idx.owner_name).trim();
      const email = get(idx.email).trim();
      let whatsapp = get(idx.whatsapp).trim().replace(/\s|-/g,"");
      if (unit && owner) rows.push({ unit_id: unit, owner_name: owner, email, whatsapp });
    }
    return rows;
  }
  async function parseAnyFile(file) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer(); const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (json.length < 2) return []; const fields = json[0].map(String);
      return fromRows(fields, json.slice(1));
    } else {
      const text = await file.text();
      return await new Promise((resolve) => {
        Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h) => normalizeHeader(h),
          complete: (res) => { if (!res.data || !res.data.length) return resolve([]);
            const fields = Object.keys(res.data[0] || {});
            const lines = res.data.map((obj) => fields.map((f) => obj[f]));
            resolve(fromRows(fields, lines)); } });
      });
    }
  }
  async function handleUpload(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try { setBusy(true); setMsg("Parsing file…");
      const rows = await parseAnyFile(f);
      if (!rows.length) { setRowsPreview([]); setMsg("No valid rows found. Check headers: unit_id, owner_name, email, whatsapp."); setBusy(false); return; }
      setRowsPreview(rows.slice(0,10)); setMsg(`Uploading ${rows.length} residents…`);
      const res = await fetch("/api/residents-bulk-upsert", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ rows }) });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      const out = await res.json(); setMsg(`Upserted ${out.upserted} resident(s).`); await refresh();
    } catch(e) { setMsg("Upload failed: " + (e.message || e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="container">
      <div className="nav"><a className="link" href="#">← Public</a><span style={{ marginLeft: 8 }}>Logged in as <b>{me}</b></span></div>
      <h1>📬 Admin – QR Distribution</h1>
      <div className="panel">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
          <div>Poll ID: <span className="mono">{pollId}</span></div>
          <div>Site: <span className="mono">{siteUrl}</span></div>
          <div>Total Units in roster: <b>{status.units}</b></div>
          <div>Tokens issued: <b>{status.tokens}</b></div>
          <div>Votes received: <b>{status.votes}</b></div>
        </div>
        <div className="space"></div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={qrPack} disabled={busy}>Generate QR Pack (PDF)</button>
          <button className="btn destructive" onClick={resetPoll} disabled={busy}>Reset All Votes</button>
          <button className="btn destructive" onClick={resetResidents} disabled={busy}>Reset Residents (roster)</button>
        </div>
        {busy && (<div className="progress" style={{ marginTop: 10 }}><div style={{ width: "100%" }} /></div>)}
        {msg && <div className="notice" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      <div className="space"></div>
      <div className="panel">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Residents Upload (CSV/Excel)</div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} disabled={busy} />
          <a className="btn" href="/templates/residents_template.csv" download>Download CSV Template</a>
        </div>
        {rowsPreview.length > 0 && (
          <div style={{ maxHeight: 220, overflow: "auto", marginTop: 8 }}>
            <table>
              <thead><tr><th>unit_id</th><th>owner_name</th><th>email</th><th>whatsapp</th></tr></thead>
              <tbody>{rowsPreview.map((r, i) => (<tr key={i}><td>{r.unit_id}</td><td>{r.owner_name}</td><td>{r.email}</td><td>{r.whatsapp}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
