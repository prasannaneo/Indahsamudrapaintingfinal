
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode.react";
import { createClient } from "@supabase/supabase-js";

// ---- Supabase & Poll ----
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";

export default function App(){
  const [route,setRoute]=useState(window.location.hash||"");
  useEffect(()=>{const f=()=>setRoute(window.location.hash||"");window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f)},[]);
  if(route==="#admin-login") return <AdminLogin/>;
  if(route==="#admin-setup") return <AdminSetup/>;
  if(route==="#admin") return <AdminDashboard/>;
  return <PublicVote/>;
}

// ---------------- Public Vote ----------------
function PublicVote(){
  const [pinInput,setPinInput]=useState("");
  const [unitInput,setUnitInput]=useState("");
  const [ownerInput,setOwnerInput]=useState("");
  const [pinRecord,setPinRecord]=useState(null);
  const [counts,setCounts]=useState({A:0,B:0,C:0});
  const [votedFor,setVotedFor]=useState(null);
  const [confirmId,setConfirmId]=useState(null);
  const [loading,setLoading]=useState(true);

  const designs=[
    {id:"A",name:"Design A – Dark Green & Yellow",image:"/images/design-a.jpg"},
    {id:"B",name:"Design B – Grey Modern",image:"/images/design-b.jpg"},
    {id:"C",name:"Design C – Earthy Beige",image:"/images/design-c.jpg"}
  ];

  useEffect(()=>{(async()=>{
    const usp=new URLSearchParams(window.location.search);
    const t=usp.get("t");
    if(t){
      const {data:row}=await supabase
        .from("pins")
        .select("unit,owner_name,pin,used_at")
        .eq("poll_id",pollId).eq("token",t).maybeSingle();
      if(row){
        setPinRecord(row);
        setPinInput(row.pin);
        if(row.unit) setUnitInput(row.unit);
        if(row.owner_name) setOwnerInput(row.owner_name);
        if(row.used_at) setVotedFor("USED");
      }
    }
    await refreshResults(); setLoading(false);
  })()},[]);

  async function refreshResults(){
    const {data}=await supabase.from("votes").select("option_id").eq("poll_id",pollId);
    const t={A:0,B:0,C:0}; (data||[]).forEach(r=>{t[r.option_id]=(t[r.option_id]||0)+1}); setCounts(t);
  }
  const total=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts]);

  async function lookupPin(){
    if(!pinInput.trim()){ alert("Enter PIN"); return; }
    const {data:row}=await supabase
      .from("pins")
      .select("unit,owner_name,pin,used_at")
      .eq("poll_id",pollId).eq("pin",pinInput.trim()).maybeSingle();
    if(!row){ alert("PIN not found."); return; }
    setPinRecord(row);
    if(row.unit) setUnitInput(row.unit);
    if(row.owner_name) setOwnerInput(row.owner_name);
    if(row.used_at) setVotedFor("USED");
  }

  async function confirmVote(){
    if(!confirmId) return;
    if(!pinRecord){ alert("Enter a valid PIN first."); return; }
    const {data:fresh}=await supabase.from("pins").select("used_at").eq("poll_id",pollId).eq("pin",pinRecord.pin).maybeSingle();
    if(fresh?.used_at){ alert("This PIN has already been used."); setConfirmId(null); return; }

    const finalUnit = unitInput.trim() || pinRecord.unit || null;
    const finalName = ownerInput.trim() || pinRecord.owner_name || null;

    const {error}=await supabase.from("votes").insert({ poll_id:pollId, pin:pinRecord.pin, unit:finalUnit, name:finalName, option_id:confirmId });
    if(error){ alert("Vote failed."); setConfirmId(null); return; }

    await supabase.from("pins").update({ used_at:new Date().toISOString(), used_option:confirmId, unit: finalUnit, owner_name: finalName }).eq("poll_id",pollId).eq("pin",pinRecord.pin);
    setVotedFor(confirmId); setConfirmId(null); await refreshResults();
  }

  if(loading) return <div className="container">Loading…</div>;

  return <div className="container">
    <div className="nav"><a className="link" href="#admin-login">Admin Login</a></div>
    <div className="header">
      <div style={{flex:1}}>
        <h1>🎨 Indah Samudra Condo Painting – Voting</h1>

        <div className="grid">
          <input className="input" placeholder="Type your PIN (6 digits)" value={pinInput} onChange={e=>setPinInput(e.target.value)} />
          <button className="btn" onClick={lookupPin}>Verify PIN</button>
        </div>
        <div className="grid-2">
          <input className="input" placeholder="Unit Number (for report only)" value={unitInput} onChange={e=>setUnitInput(e.target.value)} />
          <input className="input" placeholder="Owner Name (for report only)" value={ownerInput} onChange={e=>setOwnerInput(e.target.value)} />
        </div>

        {pinRecord && !pinRecord.used_at && (
          <div className="banner">
            <div>
              <div><strong>This is your unique PIN to vote:</strong></div>
              <div className="mono" style={{fontSize:20, letterSpacing:2, marginTop:4}}>{pinRecord.pin}</div>
              {unitInput && <div className="mono pill" style={{marginTop:6}}>Unit: {unitInput}</div>}
              {ownerInput && <div className="mono pill" style={{marginTop:6}}>Owner: {ownerInput}</div>}
            </div>
            <button className="btn" onClick={()=>navigator.clipboard.writeText(pinRecord.pin)}>Copy</button>
          </div>
        )}
        {pinRecord?.used_at && (<div className="banner" style={{borderColor:"#fecaca",background:"#fef2f2",color:"#991b1b"}}>This PIN has already been used.</div>)}

        <div className="space"></div>

        <div className="results">
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div><strong>Live Results</strong></div>
            <div>{total} vote{total===1?"":"s"}</div>
          </div>
          {[
            {id:"A",label:"Design A – Dark Green & Yellow"},
            {id:"B",label:"Design B – Grey Modern"},
            {id:"C",label:"Design C – Earthy Beige"},
          ].map(d=>{ const v=counts[d.id]||0; const pct=total?Math.round((v/total)*100):0;
            return <div key={d.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>{d.label}</div><div style={{color:"#64748b",fontSize:13}}>{v} vote{v===1?"":"s"} • {pct}%</div>
              </div>
              <div className="progress"><div style={{width:`${pct}%`}}/></div>
            </div>;
          })}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div className="qrbox"><QRCode value={typeof window!=='undefined'?window.location.href:'https://example.com'} size={96} includeMargin /></div>
        <div style={{fontSize:12,color:"#64748b"}}>Scan to vote</div>
      </div>
    </div>

    <div className="space"></div>

    <div className="grid3">
      {[
        { id:"A", name:"Design A – Dark Green & Yellow", image:"/images/design-a.jpg" },
        { id:"B", name:"Design B – Grey Modern", image:"/images/design-b.jpg" },
        { id:"C", name:"Design C – Earthy Beige", image:"/images/design-c.jpg" },
      ].map(d => (
        <div className="card" key={d.id}>
          <div style={{position:"relative"}}>
            <img className="card-img" src={d.image} alt={d.name} onError={e=>e.currentTarget.src=`https://placehold.co/800x500?text=Upload+design-${d.id}`} />
            <span className="badge">Option {d.id}</span>
          </div>
          <div className="card-body">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:600}}>{d.name}</div>
            </div>
            <div className="space"></div>
            <div className="row">
              <button className="btn primary" disabled={!pinRecord||!!pinRecord?.used_at||!!votedFor} onClick={()=>setConfirmId(d.id)}>{votedFor===d.id?"Your vote":`Vote for ${d.id}`}</button>
              <button className="btn" onClick={()=>window.open(d.image,'_blank')}>Preview</button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {confirmId && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#fff",padding:16,borderRadius:12,width:360}}>
          <div style={{fontWeight:600,marginBottom:6}}>Confirm your vote?</div>
          <div style={{fontSize:14,color:"#334155"}}>PIN <b>{pinRecord?.pin}</b> voting for option <b>{confirmId}</b>.</div>
          <div className="row" style={{justifyContent:"flex-end",marginTop:12}}>
            <button className="btn" onClick={()=>setConfirmId(null)}>Cancel</button>
            <button className="btn primary" onClick={confirmVote}>Confirm Vote</button>
          </div>
        </div>
      </div>
    )}

    <div className="space"></div>
    <div className="notice">Only the PIN is validated. Unit & Owner are saved with the vote for the admin report.</div>
  </div>;
}

// ---------------- Admin Login ----------------
function AdminLogin(){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");

  async function sha256(t){
    const enc=new TextEncoder().encode(t);
    const h=await crypto.subtle.digest("SHA-256",enc);
    return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
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

// ---------------- Admin Setup ----------------
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

// ---------------- Admin Dashboard ----------------
function AdminDashboard(){
  const [me,setMe]=useState(localStorage.getItem("adminEmail")||"");
  const [counts,setCounts]=useState({A:0,B:0,C:0});
  const [votes,setVotes]=useState([]);
  const [pins,setPins]=useState([]);
  const [siteUrl,setSiteUrl]=useState(typeof window!=='undefined'?window.location.origin:"");
  const [genCount,setGenCount]=useState(172);
  const [status,setStatus]=useState({pins:0,votes:0,pollId});

  useEffect(()=>{ if(!me) window.location.hash="#admin-login"; },[me]);
  useEffect(()=>{ (async()=>{ await refresh(); })(); },[]);

  async function refresh(){
    const { data:v } = await supabase.from("votes")
      .select("pin,unit,name,option_id,created_at").eq("poll_id",pollId)
      .order("created_at",{ascending:false});
    const tally={A:0,B:0,C:0}; (v||[]).forEach(r=>{ tally[r.option_id]=(tally[r.option_id]||0)+1; });
    setCounts(tally); setVotes(v||[]);
    const { data:p } = await supabase.from("pins")
      .select("unit,owner_name,pin,token,used_at,used_option").eq("poll_id",pollId)
      .order("unit");
    setPins(p||[]);
    setStatus(s=>({ ...s, pins: (p||[]).length, votes: (v||[]).length }));
  }

  // ---- Excel-friendly CSV (BOM + CRLF) ----
  function csvDownload(filename, rows){
    const BOM = '\ufeff';
    const csv = rows
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\r\n');
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

  function exportTallies(){ csvDownload(`${pollId}-tally.csv`, [["Design","Votes"],["A",counts.A],["B",counts.B],["C",counts.C]]); }
  function exportVotes(){ csvDownload(`${pollId}-votes.csv`, [["PIN","Unit","Owner","Option","Time"], ...votes.map(v=>[v.pin,v.unit||"",v.name||"",v.option_id,new Date(v.created_at).toISOString()])]); }
  function exportPins(){ csvDownload(`${pollId}-pins.csv`, [["Unit","Owner","PIN","Link","Used At","Used Option"], ...pins.map(p=>[p.unit||"",p.owner_name||"",p.pin,`${siteUrl}/?t=${p.token}`,p.used_at||"",p.used_option||""])]); }

  async function resetAll(){
    if(!confirm("Reset ALL votes & pin usage for this poll?")) return;
    await supabase.from("votes").delete().eq("poll_id",pollId);
    await supabase.from("pins").update({ used_at:null, used_option:null }).eq("poll_id",pollId);
    await refresh(); alert("Poll reset.");
  }

  // ---- Reliable PIN generation (bulk insert, no collisions) ----
  function randPin(){ return String(Math.floor(100000 + Math.random()*900000)); }
  async function generatePins(){
    const target = Number(genCount) || 0;
    if (target <= 0) { alert("Enter how many PINs to generate."); return; }

    const { data: existingRows, error: selErr } =
      await supabase.from("pins").select("pin").eq("poll_id", pollId);
    if (selErr) { alert("Cannot read existing pins: " + selErr.message); return; }

    const existing = new Set((existingRows || []).map(r => r.pin));
    const toInsert = [];
    while (toInsert.length < target){
      const p = randPin();
      if (existing.has(p)) continue;
      existing.add(p);
      toInsert.push({ poll_id: pollId, pin: p }); // token default in DB
    }

    const { error: insErr } = await supabase.from("pins").insert(toInsert);
    if (insErr) { alert("Insert failed: " + insErr.message); return; }

    await refresh();
    alert(`Generated ${toInsert.length} PIN(s).`);
  }

  return <div className="container">
    <div className="nav"><a className="link" href="#">← Public</a> <span style={{marginLeft:8}}>Logged in as <b>{me}</b></span></div>
    <h1>📊 Admin Dashboard</h1>

    <div className="panel">
      <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
        <button className="btn" onClick={refresh}>Refresh</button>
        <button className="btn" onClick={exportTallies}>Download Tally CSV</button>
        <button className="btn" onClick={exportVotes}>Download Votes CSV</button>
        <button className="btn" onClick={exportPins}>Download PINs CSV</button>
        <button className="btn" style={{background:"#fee2e2"}} onClick={resetAll}>Reset</button>
      </div>
      <div className="space"></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,fontSize:13}}>
        <div>Poll ID: <span className="mono">{pollId}</span></div>
        <div>Pins in DB: <b>{status.pins}</b></div>
        <div>Votes in DB: <b>{status.votes}</b></div>
        <div>Site: <span className="mono">{siteUrl}</span></div>
      </div>
    </div>

    <div className="space"></div>
    <div className="panel">
      <div style={{fontWeight:600, marginBottom:6}}>Generate PINs</div>
      <div className="row" style={{gap:8, alignItems:"center"}}>
        <input className="input" style={{width:160}} value={genCount} onChange={e=>setGenCount(e.target.value)} placeholder="How many (e.g., 172)" />
        <button className="btn primary" onClick={generatePins}>Generate PINs</button>
        <span className="notice">Unique 6-digit codes; token auto-created.</span>
      </div>
    </div>

    <div className="space"></div>
    <div className="panel">
      <div style={{fontWeight:600, marginBottom:6}}>Live Tally</div>
      <div>Design A: {counts.A} • Design B: {counts.B} • Design C: {counts.C}</div>
    </div>

    <div className="space"></div>
    <div className="panel">
      <div style={{fontWeight:600, marginBottom:6}}>Vote Log</div>
      <div style={{maxHeight:300, overflow:"auto"}}>
        <table><thead><tr><th>Time</th><th>PIN</th><th>Unit</th><th>Owner</th><th>Option</th></tr></thead><tbody>
          {votes.map((v,i)=>(<tr key={i}><td>{new Date(v.created_at).toLocaleString()}</td><td className="mono">{v.pin}</td><td>{v.unit||""}</td><td>{v.name||""}</td><td>{v.option_id}</td></tr>))}
        </tbody></table>
      </div>
    </div>

    <div className="space"></div>
    <div className="panel">
      <div style={{fontWeight:600, marginBottom:6}}>PINs</div>
      <div style={{maxHeight:300, overflow:"auto"}}>
        <table><thead><tr><th>PIN</th><th>Unit</th><th>Owner</th><th>Used At</th><th>Used Option</th><th>Link</th></tr></thead><tbody>
          {pins.map((p,i)=>(<tr key={i}>
            <td className="mono">{p.pin}</td><td>{p.unit||""}</td><td>{p.owner_name||""}</td>
            <td>{p.used_at? new Date(p.used_at).toLocaleString(): ""}</td><td>{p.used_option||""}</td>
            <td><a href={`${siteUrl}/?t=${p.token}`} target="_blank" rel="noreferrer">{`/?t=${p.token}`}</a></td>
          </tr>))}
        </tbody></table>
      </div>
      <div className="space"></div>
      <form onSubmit={async(e)=>{e.preventDefault(); const txt=document.getElementById("maptxt").value;
        const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
        for(const line of lines){ const [pin,unit,owner]=(line.split(",").map(s=>s?s.trim():""));
          if(!pin) continue;
          await supabase.from("pins").update({ unit: unit||null, owner_name: owner||null }).eq("poll_id",pollId).eq("pin", pin);
        }
        await refresh(); alert("Updated mapping.");
      }}>
        <div style={{fontWeight:600, marginBottom:6}}>Paste mapping (pin,unit,owner)</div>
        <textarea id="maptxt" placeholder="123456,A-01-01,Alice Tan\n234567,A-01-02,S. Raj"></textarea>
        <div className="space"></div>
        <button className="btn primary" type="submit">Save Mapping</button>
      </form>
    </div>
  </div>;
}
