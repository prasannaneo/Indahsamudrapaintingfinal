import React, { useEffect, useMemo, useState } from 'react'
import './app.css'
import { AdminPages } from './admin.jsx'
import { createClient } from '@supabase/supabase-js'

const pollId = import.meta.env.VITE_POLL_ID || 'indah-samudra-painting-2025'
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const hideAdmin = (import.meta.env.VITE_HIDE_ADMIN_LINKS || 'false').toString().toLowerCase()==='true'

const designs = [
  { id:'A', name:'Design A – Dark Green & Yellow', image:'/images/design-a.jpg', description:'Dulux board (02b): dark green with yellow highlights', palette:['#0B3A34','#0E5B51','#F2C100','#FFFFFF'] },
  { id:'B', name:'Design B – Grey Modern', image:'/images/design-b.jpg', description:'Subtle greys; clean modern look', palette:['#E5E5E5','#A8ADB1','#6B7176'] },
  { id:'C', name:'Design C – Earthy Beige', image:'/images/design-c.jpg', description:'Warm, earthy neutral tones', palette:['#CDB89A','#8A6D4E','#E8D9C5'] },
]

function useHash(){ const [h,setH]=useState(window.location.hash||''); useEffect(()=>{ const f=()=>setH(window.location.hash||''); window.addEventListener('hashchange',f); return()=>window.removeEventListener('hashchange',f)},[]); return h }

export default function App(){
  const hash = useHash()
  if (hash.startsWith('#admin')) return <AdminPages pollId={pollId}/>
  return <PublicVote/>
}

function PublicVote(){
  const [counts,setCounts] = useState({A:0,B:0,C:0})
  const total = useMemo(()=>Object.values(counts).reduce((a,b)=>a+b,0),[counts])
  useEffect(()=>{ (async()=>{
      const { data } = await supabase.from('votes').select('option_id').eq('poll_id', pollId)
      const t={A:0,B:0,C:0}; (data||[]).forEach(r=>t[r.option_id]=(t[r.option_id]||0)+1); setCounts(t)
  })() },[])

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Indah Samudra Condo Painting – Voting</h1>
        {!hideAdmin && <a className="link" href="#admin-login">Admin</a>}
      </div>
      <p className="muted">Scan the official QR shared by Management to vote.</p>
      <div className="grid">
        {designs.map(d=>(
          <div key={d.id} className="card">
            <div className="badge">Option {d.id}</div>
            <img src={d.image} alt={d.name}/>
            <div className="body">
              <div className="row">
                <h3 style={{margin:0}}>{d.name}</h3>
                <div className="palette">{d.palette.map((c,i)=><div key={i} className="dot" style={{background:c}}/>)}</div>
              </div>
              <p className="muted">{d.description}</p>
              <div className="muted grow" />
              <div className="muted">
                {counts[d.id]||0} vote{(counts[d.id]||0)===1?'':'s'} • {total?Math.round((counts[d.id]||0)/total*100):0}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
