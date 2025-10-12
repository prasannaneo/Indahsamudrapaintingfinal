
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const pollId = import.meta.env.VITE_POLL_ID || "indah-samudra-painting-2025";
const setupCodeEnv = import.meta.env.VITE_ADMIN_SETUP_CODE;

export function AdminSetup() {
  const [setup, setSetup] = useState(""); const [email, setEmail] = useState("");
  const [pass, setPass] = useState(""); const [msg, setMsg] = useState("");
  async function addAdmin(){
    if(!setup||!email||!pass) return setMsg("Fill all fields");
    if(setup!==setupCodeEnv) return setMsg("Invalid setup code");
    const res=await fetch("/api/admin-add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
    const out=await res.json().catch(()=>({})); if(!res.ok) return setMsg(out.error||"Failed to add admin");
    setMsg("Admin added. Go to Admin Login.");
  }
  return (<AdminShell title="Admin Setup">
    <input className="input" placeholder="Setup code" value={setup} onChange={e=>setSetup(e.target.value)}/>
    <input className="input" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input className="input" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>
    <button className="btn primary" onClick={addAdmin}>Add Admin</button>
    {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
  </AdminShell>);
}

export function AdminLogin() {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [msg,setMsg]=useState("");
  async function login(){
    const res=await fetch("/api/admin-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
    const out=await res.json().catch(()=>({})); if(!res.ok) return setMsg(out.error||"Login failed");
    sessionStorage.setItem("adminToken", out.token); window.location.hash="#admin";
  }
  return (<AdminShell title="Admin Login">
    <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input className="input" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>
    <button className="btn primary" onClick={login}>Login</button>
    {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
  </AdminShell>);
}

export function AdminDashboard() {
  const [counts,setCounts]=useState({A:0,B:0,C:0}); const [audit,setAudit]=useState([]);
  const [validDays,setValidDays]=useState(14); const [resetCode,setResetCode]=useState("");
  const token=sessionStorage.getItem("adminToken"); const total=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts]);
  useEffect(()=>{refresh();},[]);
  async function refresh(){
    const {data}=await supabase.from("votes").select("option_id").eq("poll_id",pollId);
    const tally={A:0,B:0,C:0};(data||[]).forEach(r=>tally[r.option_id]=(tally[r.option_id]||0)+1); setCounts(tally);
    const a=await supabase.from("vote_audit").select("unit_id, option_id, ip, user_agent, created_at").eq("poll_id",pollId).order("created_at",{ascending:false});
    setAudit(a.data||[]);
  }
  function exportTallyCSV(){const rows=[["Option","Votes"],["A",counts.A||0],["B",counts.B||0],["C",counts.C||0]];downloadCSV(`${pollId}-tally.csv`,rows);}
  function exportAuditCSV(){const rows=[["Time","Unit","Option","IP","UA"]];(audit||[]).forEach(r=>rows.push([r.created_at,r.unit_id,r.option_id,r.ip||"",r.user_agent||""]));downloadCSV(`${pollId}-audit.csv`,rows);}
  async function generateQR(){
    const res=await fetch("/api/generate-qr-pack",{method:"POST",headers:{"Content-Type":"application/json","x-admin":token||""},body:JSON.stringify({pollId,validityDays:Number(validDays||14)})});
    if(!res.ok){alert(await res.text());return;}const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${pollId}-QR-pack.pdf`;a.click();URL.revokeObjectURL(url);
  }
  async function uploadResidents(file){const text=await file.text(); const res=await fetch("/api/upload-residents",{method:"POST",headers:{"Content-Type":"text/csv","x-admin":token||""},body:text});const t=await res.text();if(!res.ok){alert(t);return;}alert(t);refresh();}
  async function resetVotes(scope="current"){const res=await fetch("/api/reset-poll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pollId,code:resetCode,hard:scope==="all"})});const out=await res.json().catch(()=>({}));if(!res.ok){alert(out.error||"Reset failed");return;}alert("Votes reset.");refresh();}
  async function resetResidents(){if(!confirm("Delete ALL residents? This also removes tokens via cascade."))return; const res=await fetch("/api/reset-residents",{method:"POST",headers:{"Content-Type":"application/json","x-admin":token||""},body:JSON.stringify({})});const t=await res.text();if(!res.ok){alert(t);return;}alert(t);refresh();}
  const bar=(label,v)=>(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between"}}><b>{label}</b><span>{v} • {total?Math.round(v/total*100):0}%</span></div><div className="progress"><div style={{width:`${total?Math.round(v/total*100):0}%`}}/></div></div>);
  return (<div className="container">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <h2>Admin Dashboard</h2>
      <div style={{display:'flex',gap:8}}>
        <button className="btn" onClick={()=>window.location.hash=""}>Back to site</button>
        <button className="btn" onClick={refresh}>Refresh</button>
      </div>
    </div>
    <div className="panel">
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <div>QR validity (days):</div>
        <input className="input" style={{width:80}} type="number" value={validDays} onChange={e=>setValidDays(e.target.value)}/>
        <button className="btn primary" onClick={generateQR}>Generate QR Pack (PDF)</button>
        <button className="btn" onClick={exportTallyCSV}>Export Tally CSV</button>
        <button className="btn" onClick={exportAuditCSV}>Export Audit CSV</button>
      </div>
    </div>
    <div className="panel">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
        <div>
          <h4>Live Results</h4>
          {bar("Option A",counts.A||0)}
          {bar("Option B",counts.B||0)}
          {bar("Option C",counts.C||0)}
          <div className="muted">Total: {total}</div>
        </div>
        <div>
          <h4>Reset</h4>
          <input className="input" placeholder="Type admin reset code" value={resetCode} onChange={e=>setResetCode(e.target.value)}/>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className="btn" onClick={()=>resetVotes("current")}>Reset votes (current poll)</button>
            <button className="btn" onClick={()=>resetVotes("all")}>Reset votes (ALL polls)</button>
          </div>
        </div>
      </div>
    </div>
    <div className="panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h4>Residents</h4>
        <div style={{display:'flex',gap:8}}>
          <a className="btn" href="/templates/residents_template.csv" target="_blank" rel="noreferrer">Download template</a>
          <label className="btn">Upload CSV<input type="file" accept=".csv" hidden onChange={(e)=>e.target.files?.[0] && uploadResidents(e.target.files[0])}/></label>
          <button className="btn" onClick={resetResidents}>Reset ALL residents</button>
        </div>
      </div>
    </div>
  </div>);
}

function AdminShell({ title, children }){
  return (<div className="container">
    <a className="link" href="#">← Back</a>
    <h2>{title}</h2>
    <div className="panel" style={{maxWidth:560}}><div style={{display:'flex',flexDirection:'column',gap:10}}>{children}</div></div>
  </div>);
}
