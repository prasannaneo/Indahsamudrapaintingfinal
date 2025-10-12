import React, { useState, useMemo } from 'react'
import { AdminDashboard } from './admin.jsx'

const pollId = import.meta.env.VITE_POLL_ID || 'indah-samudra-painting-2025'

const designs = [
  { id: 'A', name: 'Design A – Dark Green & Yellow', image: '/images/design-a.jpg',
    description: 'Dulux board (02b): dark green with yellow highlights', palette: ['#0B3A34','#0E5B51','#F2C100','#FFFFFF'] },
  { id: 'B', name: 'Design B – Grey Modern', image: '/images/design-b.jpg',
    description: 'Subtle greys; clean modern look', palette: ['#E5E5E5','#A8ADB1','#6B7176'] },
  { id: 'C', name: 'Design C – Earthy Beige', image: '/images/design-c.jpg',
    description: 'Warm, earthy neutral tones', palette: ['#CDB89A','#8A6D4E','#E8D9C5'] },
]

export default function App(){
  const [route, setRoute] = useState(window.location.hash || '')
  React.useEffect(()=>{
    const onHash = ()=> setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  if(route === '#admin') return <AdminDashboard pollId={pollId} />

  return (
    <div style={{fontFamily:'system-ui, Arial', padding:16, maxWidth:1100, margin:'0 auto'}}>
      <h1>Indah Samudra Condo Painting – Voting</h1>
      <p>Choose A, B or C using your QR/token link. (Demo UI only in this zip.)</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16}}>
        {designs.map(d=>(
          <div key={d.id} style={{border:'1px solid #ddd', borderRadius:12, overflow:'hidden'}}>
            <img src={d.image} alt={d.name} style={{width:'100%', height:200, objectFit:'cover'}} />
            <div style={{padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{margin:0}}>{d.name}</h3>
                <div style={{display:'flex', gap:4}}>
                  {d.palette.map((c,i)=>(<div key={i} style={{width:14, height:14, borderRadius:999, border:'1px solid #fff', boxShadow:'0 0 0 1px #ddd', background:c}} />))}
                </div>
              </div>
              <p style={{marginTop:8, color:'#555'}}>{d.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:24, fontSize:12, color:'#666'}}>Admin: open <code>/#admin</code></div>
    </div>
  )
}
