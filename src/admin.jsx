import React, { useState } from 'react'
export function AdminPages({ pollId }){ const hash = window.location.hash; if (hash === '#admin-login') return <AdminLogin/>; return <AdminDashboard pollId={pollId}/> }
function AdminLogin(){
  const [pwd,setPwd]=useState(''); const [msg,setMsg]=useState('')
  const submit=async e=>{ e.preventDefault(); setMsg('Checking...'); try{ const res=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})}); if(res.ok){ localStorage.setItem('admin_ok','1'); window.location.hash='#admin'; location.reload(); } else setMsg('Invalid password'); }catch{ setMsg('Network error') } }
  return <div style={{fontFamily:'system-ui,Arial',maxWidth:420,margin:'60px auto',padding:24,border:'1px solid #ddd',borderRadius:12}}>
    <h2>Admin Login</h2>
    <form onSubmit={submit}><input type='password' placeholder='Admin password' value={pwd} onChange={e=>setPwd(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ccc'}}/><button style={{marginTop:12,padding:'10px 14px'}}>Login</button></form>
    <div style={{marginTop:10,color:'#666'}}>{msg}</div></div>
}
export function AdminDashboard({ pollId }){ const ok = typeof window!=='undefined' && localStorage.getItem('admin_ok')==='1'; if(!ok){ window.location.hash='#admin-login'; return null }
  const exportAudit=()=>{ const p=encodeURIComponent(pollId); window.location.href=`/api/audit-csv?p=${p}` }
  const logout=()=>{ localStorage.removeItem('admin_ok'); window.location.hash=''; location.reload() }
  return <div style={{fontFamily:'system-ui,Arial',padding:16,maxWidth:1000,margin:'0 auto'}}><h1>Admin Dashboard</h1>
    <div style={{display:'flex',gap:8,marginBottom:12}}><button onClick={exportAudit}>Export Audit CSV</button><button onClick={logout}>Logout</button></div>
    <div style={{fontSize:12,color:'#666'}}>Poll ID: <code>{pollId}</code></div></div>
}
