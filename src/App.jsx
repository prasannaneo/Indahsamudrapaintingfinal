
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode.react";
import { createClient } from "@supabase/supabase-js";

// ===== ENV =====
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";
const siteUrl = typeof window !== "undefined" ? window.location.origin : (import.meta.env.VITE_PUBLIC_SITE_URL || "");

// ===== ROUTER =====
export default function App(){
  const [route,setRoute]=useState(window.location.hash||"");
  useEffect(()=>{const f=()=>setRoute(window.location.hash||"");window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f)},[]);
  if(route==="#admin-login") return <AdminLogin/>;
  if(route==="#admin-setup") return <AdminSetup/>;
  if(route==="#admin") return <AdminDashboard/>;
  return <PublicVote/>;
}

// ===== PUBLIC VOTE (Magic link) =====
function PublicVote(){
  const [token,setToken]=useState("");
  const [record,setRecord]=useState(null); // vote_tokens row with denormed unit/owner
  const [counts,setCounts]=useState({A:0,B:0,C:0});
  const [votedFor,setVotedFor]=useState(null);
  const [confirmId,setConfirmId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const t = new URLSearchParams(window.location.search).get("t") || "";
    if(t) { setToken(t); await lookupToken(t); }
    await refreshResults();
    setLoading(false);
  })()},[]);

  async function sha256Hex(str){
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  async function lookupToken(raw){
    setError("");
    if(!raw){ setRecord(null); return; }
    try {
      const hash = await sha256Hex(raw);
      const { data, error } = await supabase
        .from("vote_tokens")
        .select("id, unit_id, owner_name, used_at, expires_at")
        .eq("poll_id", pollId)
        .eq("token_hash", hash)
        .maybeSingle();
      if(error) throw error;
      if(!data) { setError("Invalid link. Please use the link from your email/WhatsApp."); setRecord(null); return; }
      if(data.used_at) { setError("This link was already used to vote."); }
      if(data.expires_at && new Date(data.expires_at) < new Date()) { setError("This link has expired. Please ask management for a new link."); }
      setRecord(data);
    } catch(e){ setError(e.message || String(e)); setRecord(null); }
  }

  async function refreshResults(){
    const {data}=await supabase.from("votes").select("option_id").eq("poll_id",pollId);
    const t={A:0,B:0,C:0}; (data||[]).forEach(r=>{t[r.option_id]=(t[r.option_id]||0)+1}); setCounts(t);
  }
  const total=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts]);

  async function confirmVote(){
    if(!confirmId) return;
    if(!record){ alert("Open your personal link from email to vote."); return; }

    // server-trust: one vote per unit via unique index; also mark token used
    const { error: insErr } = await supabase.from("votes").insert({
      poll_id: pollId,
      unit_id: record.unit_id,
      option_id: confirmId,
      voter_name: record.owner_name || null
    });
    if(insErr){
      alert(insErr.message.includes("duplicate key")
        ? "Your unit has already voted. Thank you."
        : ("Vote failed: "+insErr.message));
      setConfirmId(null);
      return;
    }
    await supabase.from("vote_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);
    setVotedFor(confirmId); setConfirmId(null); await refreshResults();
  }

  if(loading) return <div className="container">Loading…</div>;

  return <div className="container">
    <div className="nav"><a className="link" href="#admin-login">Admin Login</a></div>

    <div className="header">
      <div style={{flex:1}}>
        <h1>🎨 Indah Samudra Condo Painting – Voting</h1>
        {!record && (
          <div className="panel" style={{marginTop:8}}>
            <div style={{fontWeight:600, marginBottom:6}}>Use your personal link</div>
            <div className="notice">Please click the link sent to your email/WhatsApp. If you pasted a token manually, enter it below:</div>
            <div className="row" style={{marginTop:8, gap:8}}>
              <input className="input" placeholder="Paste token here" value={token} onChange={(e)=>setToken(e.target.value)} />
              <button className="btn" onClick={()=>lookupToken(token)}>Verify</button>
            </div>
            {error && <div className="error">{error}</div>}
          </div>
        )}
        {record && (
          <div className="panel" style={{marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:600}}>Welcome{record.owner_name?`, ${record.owner_name}`:""}!</div>
                <div className="mono pill" style={{marginTop:6}}>Unit: {record.unit_id}</div>
              </div>
              <div className="qrbox"><QRCode value={typeof window!=='undefined'?window.location.href:'https://example.com'} size={96} includeMargin/></div>
            </div>
            {error && <div className="error" style={{marginTop:8}}>{error}</div>}
          </div>
        )}

        <div className="space"></div>

        <div className="results">
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div><strong>Live Results</strong></div>
            <div>{total} vote{total===1?"":"s"}</div>
          </div>
          {[
            {id:"A",label:"Design A – Dark Green & Yellow", image:"/images/design-a.jpg"},
            {id:"B",label:"Design B – Grey Modern", image:"/images/design-b.jpg"},
            {id:"C",label:"Design C – Earthy Beige", image:"/images/design-c.jpg"},
          ].map(d=>{ const v=counts[d.id]||0; const pct=total?Math.round((v/total)*100):0;
            return <div key={d.id} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>{d.label}</div><div style={{color:"#64748b",fontSize:13}}>{v} vote{v===1?"":"s"} • {pct}%</div>
              </div>
              <div className="progress"><div style={{width:`${pct}%`}}/></div>
              <div className="row" style={{marginTop:6,gap:8}}>
                <button className="btn primary" disabled={!record || !!record.used_at || !!votedFor} onClick={()=>setConfirmId(d.id)}>
                  {votedFor===d.id?"Your vote":`Vote for ${d.id}`}
                </button>
                <button className="btn" onClick={()=>window.open(d.image,'_blank')}>Preview</button>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>

    {confirmId && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#fff",padding:16,borderRadius:12,width:360}}>
          <div style={{fontWeight:600,marginBottom:6}}>Confirm your vote?</div>
          <div style={{fontSize:14,color:"#334155"}}>Unit <b>{record?.unit_id}</b> voting for option <b>{confirmId}</b>.</div>
          <div className="row" style={{justifyContent:"flex-end",marginTop:12}}>
            <button className="btn" onClick={()=>setConfirmId(null)}>Cancel</button>
            <button className="btn primary" onClick={confirmVote}>Confirm Vote</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

// ===== ADMIN AUTH =====
function AdminLogin(){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  async function sha256(t){const enc=new TextEncoder().encode(t);const h=await crypto.subtle.digest("SHA-256",enc);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}
  async function login(){
    if(!email||!pw) return;
    const {data}=await supabase.from("admins").select("pass_sha256").eq("email",email.trim().toLowerCase()).maybeSingle();
    if(!data){ alert("Admin not found"); return; }
    const hash=await sha256(pw); if(hash!==data.pass_sha256){ alert("Wrong password"); return; }
    localStorage.setItem("adminEmail",email.trim().toLowerCase()); window.location.hash="#admin";
  }
  return <div className="container">
    <div className="nav"><a className="link" href="#">← Back</a></div>
    <h1>🔐 Admin Login</h1>
    <div className="grid" style={{maxWidth:360}}>
      <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button className="btn primary" onClick={login}>Login</button>
    </div>
    <div className="space"></div>
    <div className="notice">Need to create an admin? Use <a className="link" href="#admin-setup">Admin Setup</a>.</div>
  </div>;
}

function AdminSetup(){
  const [code,setCode]=useState("");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [admins,setAdmins]=useState([]);
  useEffect(()=>{(async()=>{const {data}=await supabase.from("admins").select("email, created_at"); setAdmins(data||[]); })()},[]);
  async function sha256(t){const enc=new TextEncoder().encode(t);const h=await crypto.subtle.digest("SHA-256",enc);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}
  async function addAdmin(){
    if(code!==import.meta.env.VITE_ADMIN_SETUP_CODE){ alert("Setup code incorrect"); return; }
    if(!email||!pw) return;
    const hash=await sha256(pw);
    const { error } = await supabase.from("admins").insert({ email: email.trim().toLowerCase(), pass_sha256: hash });
    if(error){ alert("Failed to add admin (maybe exists)"); return; }
    const { data } = await supabase.from("admins").select("email, created_at"); setAdmins(data||[]);
    setEmail(""); setPw(""); alert("Admin added");
  }
  return <div className="container">
    <div className="nav"><a className="link" href="#">← Back</a></div>
    <h1>🛠️ Admin Setup</h1>
    <div className="grid" style={{maxWidth:420}}>
      <input className="input" placeholder="Setup code" value={code} onChange={e=>setCode(e.target.value)} />
      <input className="input" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button className="btn primary" onClick={addAdmin}>Add Admin</button>
    </div>
    <div className="space"></div>
    <div className="panel">
      <div style={{fontWeight:600, marginBottom:8}}>Current Admins</div>
      <table><thead><tr><th>Email</th><th>Created</th></tr></thead><tbody>
        {admins.map((a,i)=>(<tr key={i}><td>{a.email}</td><td>{new Date(a.created_at).toLocaleString()}</td></tr>))}
      </tbody></table>
      <div className="space"></div>
      <div className="notice">Setup code = VITE_ADMIN_SETUP_CODE (set in Vercel & re-deploy).</div>
    </div>
  </div>;
}

// ===== ADMIN DASHBOARD (magic links + email automations) =====
function AdminDashboard(){
  const [me,setMe]=useState(localStorage.getItem("adminEmail")||"");
  const [counts,setCounts]=useState({A:0,B:0,C:0});
  const [votes,setVotes]=useState([]);
  const [status,setStatus]=useState({units:0,tokens:0,votes:0});
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{ if(!me) window.location.hash="#admin-login"; },[me]);
  useEffect(()=>{ (async()=>{ await refresh(); })(); },[]);

  async function refresh(){
    setMsg("");
    const { data:v } = await supabase.from("votes").select("unit_id, option_id").eq("poll_id",pollId);
    const tally={A:0,B:0,C:0}; (v||[]).forEach(r=>{ tally[r.option_id]=(tally[r.option_id]||0)+1; });
    setCounts(tally); setVotes(v||[]);

    const { data:r } = await supabase.from("residents").select("unit_id");
    const { data:t } = await supabase.from("vote_tokens").select("id").eq("poll_id",pollId);
    setStatus({ units: (r||[]).length, tokens: (t||[]).length, votes: (v||[]).length });
  }

  function csvDownload(filename, rows){
    const BOM = '\ufeff';
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportVotes(){
    const { data:v } = await supabase.from("votes").select("unit_id, option_id, voter_name, created_at").eq("poll_id",pollId);
    csvDownload(`${pollId}-votes.csv`, [["Unit","Owner","Option","Time"],
      ...(v||[]).map(r=>[r.unit_id,r.voter_name||"",r.option_id,new Date(r.created_at).toISOString()])]);
  }
  async function exportTokenStatus(){
    const { data:t } = await supabase.from("vote_tokens").select("unit_id, owner_name, used_at, expires_at, sent_at").eq("poll_id",pollId);
    csvDownload(`${pollId}-token-status.csv`, [["Unit","Owner","Sent At","Expires","Used"],
      ...(t||[]).map(r=>[r.unit_id,r.owner_name||"",r.sent_at||"",r.expires_at||"",r.used_at||""])]);
  }

  async function callApi(path, body){
    const res = await fetch(path, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ pollId, ...body }) });
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || res.statusText); }
    return await res.json();
  }

  async function inviteAll(){
    try{
      setBusy(true); setMsg("Sending invites…");
      const out = await callApi("/api/invite-all", {});
      setMsg(`Invited ${out.sent} / ${out.total} residents.`);
      await refresh();
    }catch(e){ setMsg("Invite failed: " + (e.message||e)); }
    finally{ setBusy(false); }
  }
  async function remindPending(){
    try{
      setBusy(true); setMsg("Sending reminders…");
      const out = await callApi("/api/remind-pending", {});
      setMsg(`Sent ${out.sent} reminder(s).`);
      await refresh();
    }catch(e){ setMsg("Reminder failed: " + (e.message||e)); }
    finally{ setBusy(false); }
  }

  return <div className="container">
    <div className="nav"><a className="link" href="#">← Public</a> <span style={{marginLeft:8}}>Logged in as <b>{me}</b></span></div>
    <h1>📬 Admin – Magic Link Invites</h1>

    <div className="panel">
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        <div>Poll ID: <span className="mono">{pollId}</span></div>
        <div>Site: <span className="mono">{siteUrl}</span></div>
        <div>Total Units in roster: <b>{status.units}</b></div>
        <div>Tokens issued: <b>{status.tokens}</b></div>
        <div>Votes received: <b>{status.votes}</b></div>
      </div>
      <div className="space"></div>
      <div className="row" style={{gap:8, flexWrap:"wrap"}}>
        <button className="btn primary" onClick={inviteAll} disabled={busy}>Invite all (email)</button>
        <button className="btn" onClick={remindPending} disabled={busy}>Remind pending</button>
        <button className="btn" onClick={exportVotes} disabled={busy}>Download Votes CSV</button>
        <button className="btn" onClick={exportTokenStatus} disabled={busy}>Download Token Status CSV</button>
        <a className="link" href="https://app.supabase.com" target="_blank" rel="noreferrer">Open Supabase</a>
      </div>
      {busy && <div className="progress" style={{marginTop:10}}><div style={{width:"100%"}}/></div>}
      {msg && <div className="notice" style={{marginTop:10}}>{msg}</div>}
      <div className="space"></div>
      <div className="notice">Upload/maintain residents (unit, owner, email, whatsapp) once in Supabase table <code>residents</code>. The buttons above generate single-use links and email them automatically.</div>
    </div>
  </div>;
}

// ===== basic styles (inline) =====
const style = document.createElement("style");
style.textContent = `
  .container{max-width:1000px;margin:0 auto;padding:20px}
  .nav{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .header{display:flex;gap:20px}
  .panel{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
  .row{display:flex;gap:8px}
  .grid{display:grid;grid-template-columns:1fr auto;gap:8px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .results{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa}
  .progress{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden}
  .progress>div{height:100%;background:#0ea5e9}
  .btn{padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;cursor:pointer}
  .btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
  .input{padding:8px;border:1px solid #e5e7eb;border-radius:10px}
  .qrbox{background:#fff;padding:6px;border:1px solid #e5e7eb;border-radius:8px}
  .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
  .pill{display:inline-block;padding:2px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px}
  .notice{font-size:13px;color:#334155}
  .error{color:#b91c1c;font-size:13px;margin-top:6px}
  .card{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff}
  .card-img{width:100%;height:180px;object-fit:cover;background:#f1f5f9}
  .card-body{padding:10px}
  .badge{position:absolute;top:8px;left:8px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px}
  .space{height:12px}
`;
document.head.appendChild(style);
