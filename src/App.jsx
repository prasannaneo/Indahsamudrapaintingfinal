import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode.react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function App() {
  const pollId = "indah-samudra-painting-2025";
  const [unit, setUnit] = useState("");
  const [name, setName] = useState("");
  const [counts, setCounts] = useState({A:0,B:0,C:0});
  const [votes, setVotes] = useState([]);
  const [votedFor, setVotedFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  // One-time PIN via token
  const [token, setToken] = useState(null);
  const [pinRecord, setPinRecord] = useState(null);
  const [pinInput, setPinInput] = useState("");

  const designs = [
    { id:"A", name:"Design A – Dark Green & Yellow", image:"/images/design-a.jpg" },
    { id:"B", name:"Design B – Grey Modern", image:"/images/design-b.jpg" },
    { id:"C", name:"Design C – Earthy Beige", image:"/images/design-c.jpg" },
  ];

  useEffect(() => {
    (async () => {
      // token flow
      const usp = new URLSearchParams(window.location.search);
      const t = usp.get("t");
      if (t) {
        setToken(t);
        const { data: row } = await supabase
          .from("pins")
          .select("unit, pin, used_at")
          .eq("poll_id", pollId)
          .eq("token", t)
          .maybeSingle();
        if (row) {
          setPinRecord(row);
          setUnit(row.unit);
          if (row.used_at) setVotedFor("USED");
        }
      }

      await refreshResults();
      const savedUnit = localStorage.getItem(`unit-${pollId}`);
      const savedName = localStorage.getItem(`name-${pollId}`);
      if (!t && savedUnit) setUnit(savedUnit);
      if (savedName) setName(savedName);
      if (savedUnit) {
        const { data } = await supabase
          .from("votes").select("option_id").eq("poll_id", pollId).eq("unit", savedUnit).maybeSingle();
        if (data?.option_id) setVotedFor(data.option_id);
      }
      setLoading(false);
    })();
  }, []);

  async function refreshResults(){
    const { data } = await supabase.from("votes").select("option_id,unit,name,created_at").eq("poll_id",pollId);
    const t = {A:0,B:0,C:0};
    (data||[]).forEach(r => { t[r.option_id] = (t[r.option_id]||0)+1; });
    setCounts(t); setVotes(data||[]);
  }

  const total = useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts]);

  async function confirmVote(){
    if (!confirmId) return;
    if (!unit.trim() || !name.trim()) { alert("Enter Unit and Name."); return; }

    if (pinRecord){
      if (!pinInput.trim()) { alert("Type the PIN displayed on the page."); return; }
      if (pinInput.trim() !== pinRecord.pin) { alert("Incorrect PIN."); return; }
      const { data:fresh } = await supabase.from("pins").select("used_at").eq("poll_id",pollId).eq("token",token).maybeSingle();
      if (fresh?.used_at){ alert("This PIN has already been used."); setConfirmId(null); return; }
    }

    const { error } = await supabase.from("votes").insert({
      poll_id: pollId,
      unit: unit.trim().toUpperCase(),
      name: name.trim(),
      option_id: confirmId,
    });
    if (error){ alert("This unit has already voted."); setConfirmId(null); return; }

    if (token){
      await supabase.from("pins").update({ used_at: new Date().toISOString(), used_option: confirmId }).eq("poll_id",pollId).eq("token",token);
    }

    localStorage.setItem(`unit-${pollId}`, unit.trim().toUpperCase());
    localStorage.setItem(`name-${pollId}`, name.trim());
    setVotedFor(confirmId); setConfirmId(null); await refreshResults();
  }

  function exportCSV(){
    const rows = [["Design","Votes"], ["Design A",counts.A],["Design B",counts.B],["Design C",counts.C]];
    const csv = rows.map(r => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a = document.createElement("a"); a.href = url; a.download = `${pollId}-results.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="header">
        <div style={{flex:1}}>
          <h1>🎨 Indah Samudra Condo Painting – Voting</h1>
          <div className="subtitle">Enter Unit, Name & your one-time PIN, then pick A/B/C.</div>

          {pinRecord && !pinRecord.used_at && (
            <div className="banner">
              <div>
                <div><strong>This is your unique PIN to vote:</strong></div>
                <div className="mono" style={{fontSize:20, letterSpacing:2, marginTop:4}}>{pinRecord.pin}</div>
                <div className="mono" style={{fontSize:12, marginTop:4}}>For unit {pinRecord.unit}. PIN can be used once only.</div>
              </div>
              <button className="btn" onClick={()=>navigator.clipboard.writeText(pinRecord.pin)}>Copy</button>
            </div>
          )}
          {pinRecord?.used_at && (<div className="banner" style={{borderColor:"#fecaca", background:"#fef2f2", color:"#991b1b"}}>This link/PIN has already been used.</div>)}

          <div className="grid3">
            <input className="input" placeholder="Unit (e.g., A-12-03)" value={unit} onChange={(e)=>setUnit(e.target.value)} disabled={!!pinRecord} />
            <input className="input" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="input" placeholder="Type your PIN" value={pinInput} onChange={(e)=>setPinInput(e.target.value)} />
          </div>

          <div className="space"></div>

          <div className="results">
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
              <div><strong>Live Results</strong></div>
              <div>{total} vote{total===1?"":"s"}</div>
            </div>
            {[
              {id:"A",label:"Design A – Dark Green & Yellow"},
              {id:"B",label:"Design B – Grey Modern"},
              {id:"C",label:"Design C – Earthy Beige"},
            ].map(d => {
              const v = counts[d.id]||0;
              const pct = total ? Math.round((v/total)*100) : 0;
              return (
                <div key={d.id} style={{marginBottom:8}}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <div>{d.label}</div><div style={{color:"#64748b", fontSize:13}}>{v} vote{v===1?"":"s"} • {pct}%</div>
                  </div>
                  <div className="progress"><div style={{width:`${pct}%`}}/></div>
                </div>
              );
            })}
            <button className="btn" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
          <div className="qrbox">
            <QRCode value={typeof window!=='undefined'?window.location.href:'https://example.com'} size={96} includeMargin />
          </div>
          <div style={{fontSize:12, color:"#64748b"}}>Scan to vote</div>
        </div>
      </div>

      <div className="space"></div>

      <div className="grid3" style={{gap:16}}>
        {[
          { id:"A", name:"Design A – Dark Green & Yellow", image:"/images/design-a.jpg" },
          { id:"B", name:"Design B – Grey Modern", image:"/images/design-b.jpg" },
          { id:"C", name:"Design C – Earthy Beige", image:"/images/design-c.jpg" },
        ].map(d => (
          <div className="card" key={d.id}>
            <div style={{position:"relative"}}>
              <img className="card-img" src={d.image} alt={d.name} onError={(e)=>e.currentTarget.src=`https://placehold.co/800x500?text=Upload+design-${d.id}`} />
              <span className="badge">Option {d.id}</span>
            </div>
            <div className="card-body">
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{fontWeight:600}}>{d.name}</div>
              </div>
              <div className="space"></div>
              <div className="row">
                <button className="btn primary" disabled={!!votedFor || !!pinRecord?.used_at} onClick={()=>setConfirmId(d.id)}>
                  {votedFor===d.id? "Your vote" : `Vote for ${d.id}`}
                </button>
                <button className="btn" onClick={()=>window.open(d.image,'_blank')}>Preview</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmId && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{background:"#fff", padding:16, borderRadius:12, width:360}}>
            <div style={{fontWeight:600, marginBottom:6}}>Confirm your vote?</div>
            <div style={{fontSize:14, color:"#334155"}}>Unit <b>{unit || "(enter above)"}</b> voting for option <b>{confirmId}</b>.</div>
            <div className="row" style={{justifyContent:"flex-end", marginTop:12}}>
              <button className="btn" onClick={()=>setConfirmId(null)}>Cancel</button>
              <button className="btn primary" onClick={confirmVote}>Confirm Vote</button>
            </div>
          </div>
        </div>
      )}

      <div className="space"></div>
      <div style={{fontSize:12, color:"#64748b"}}>
        Images must exist at <code>/public/images/design-a.jpg</code>, <code>design-b.jpg</code>, <code>design-c.jpg</code>.
        One-time PIN + unit uniqueness are enforced server-side.
      </div>
    </div>
  );
}
