import React, { useState } from 'react'

export function AdminPages({ pollId }){
  const hash = window.location.hash
  if (hash === '#admin-login') return <AdminLogin/>
  return <AdminDashboard pollId={pollId}/>
}

function AdminLogin(){
  const [email,setEmail]=useState(''); const [pwd,setPwd]=useState(''); const [msg,setMsg]=useState('')
  const submit=async(e)=>{ e.preventDefault(); setMsg('Checking…'); try{
    const res = await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pwd})})
    if(res.ok){ localStorage.setItem('admin_ok','1'); if(email) localStorage.setItem('admin_email',email); window.location.hash='#admin'; location.reload() } else setMsg('Invalid email or password')
  }catch{ setMsg('Network error') } }
  return <div style={{fontFamily:'system-ui,Arial',maxWidth:420,margin:'60px auto',padding:24,border:'1px solid #ddd',borderRadius:12}}>
    <h2>Admin Login</h2>
    <form onSubmit={submit}>
      <input type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ccc',marginBottom:10}}/>
      <input type="password" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ccc'}}/>
      <button style={{marginTop:12,padding:'10px 14px'}}>Login</button>
    </form>
    <div style={{marginTop:10,color:'#666'}}>{msg}</div>
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
      <button className="btn" onClick={logout}>Logout</button>
    </div>
    <div className="muted">Poll ID: <code>{pollId}</code></div>
  </div>
}
