import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
export default function AdminDashboard(){
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin')==='1';
  const [votes,setVotes]=useState([]);
  useEffect(()=>{ (async()=>{
    if(!isAdmin){ window.location.hash = '#/admin-login'; return; }
    const { data } = await supabase.from('votes').select('*').order('created_at',{ascending:false});
    setVotes(data||[]);
  })(); },[]);
  if(!isAdmin) return <div className="card">Please login.</div>;
  return (<div className="card"><h2>Admin Dashboard</h2><div>Total votes: {votes.length}</div></div>);
}
