import React, { useState } from 'react'

export function AdminPages({ pollId }){
  const hash = window.location.hash
  if (hash === '#admin-setup') return <AdminSetup/>
  if (hash === '#admin-login') return <AdminLogin/>
  return <AdminDashboard pollId={pollId}/>
}

function AdminSetup(){
  const [code,setCode]=useState(''); const [email,setEmail]=useState(''); const [pwd,setPwd]=useState(''); const [msg,setMsg]=useState('')
  const submit=async(e)=>{ e.preventDefault(); setMsg('Saving…')
    const res = await fetch('/api/admin-add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,email,password:pwd})})
    const t = await res.text()
    if(res.ok){ setMsg('Admin created. Go to Login.'); } else setMsg(t||'Failed')
  }
  return <div className="container" style={{maxWidth:560}}>
    <a className="link" href="#">← Back</a>
    <h2>Admin Setup</h2>
    <div className="panel">
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10}}>
        <input className="input" placeholder="Setup code" value={code} onChange={e=>setCode(e.target.value)} />
        <input className="input" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button className="btn primary" type="submit">Create Admin</button>
      </form>
      <div className="muted" style={{marginTop:8}}>{msg}</div>
    </div>
  </div>
}

function AdminLogin(){
  const [email,setEmail]=useState(''); const [pwd,setPwd]=useState(''); const [msg,setMsg]=useState('')
  const submit=async(e)=>{ e.preventDefault(); setMsg('Checking…')
    const res = await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pwd})})
    const out = await res.json().catch(()=>({}))
    if(res.ok && out?.ok){ localStorage.setItem('admin_ok','1'); if(email) localStorage.setItem('admin_email',email); window.location.hash='#admin'; location.reload() } else setMsg(out?.error||'Invalid email or password')
  }
  return <div className="container" style={{maxWidth:420}}>
    <a className="link" href="#">← Back</a>
    <h2>Admin Login</h2>
    <div className="panel">
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10}}>
        <input className="input" type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button className="btn primary" type="submit">Login</button>
      </form>
      <div className="muted" style={{marginTop:8}}>{msg}</div>
    </div>
  </div>
}

export function AdminDashboard({ pollId }){
  const ok = typeof window!=='undefined' && localStorage.getItem('admin_ok')==='1'
  if(!ok){ window.location.hash='#admin-login'; return null }
  const adminEmail = (typeof window!=='undefined' && localStorage.getItem('admin_email')) || ''
  const exportAudit=()=>{ const p=encodeURIComponent(pollId); window.location.href=`/api/audit-csv?p=${p}` }
  const logout=()=>{ localStorage.removeItem('admin_ok'); localStorage.removeItem('admin_email'); window.location.hash=''; location.reload() }
  return <div className="container">
    <h1>Admin Dashboard</h1>
    {adminEmail && <div className="muted" style={{marginBottom:8}}>Signed in as: {adminEmail}</div>}
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <button className="btn" onClick={exportAudit}>Export Audit CSV</button>
      <a className="btn" href="#admin-setup">Setup (create admin)</a>
      <button className="btn" onClick={logout}>Logout</button>
    </div>
    <div className="muted">Poll ID: <code>{pollId}</code></div>
  </div>
}
