import React from 'react'

export function AdminDashboard({ pollId }){
  const onExportAudit = () => {
    const p = encodeURIComponent(pollId)
    window.location.href = `/api/audit-csv?p=${p}`
  }
  return (
    <div style={{fontFamily:'system-ui, Arial', padding:16, maxWidth:1000, margin:'0 auto'}}>
      <h1>Admin Dashboard</h1>
      <p>Baseline dashboard with Audit CSV export wired to serverless API.</p>
      <div style={{display:'flex', gap:8}}>
        <button onClick={onExportAudit}>Export Audit CSV</button>
      </div>
      <div style={{marginTop:24, fontSize:12, color:'#666'}}>
        Poll ID: <code>{pollId}</code>
      </div>
    </div>
  )
}
