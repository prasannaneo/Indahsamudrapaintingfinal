import React,{useState} from 'react';
import { supabase } from '../lib/supabase.js';

async function fetchIP(){
  try{
    const url = import.meta.env.VITE_IP_ENDPOINT;
    if(!url) return 'unknown';
    const r = await fetch(url);
    return (await r.text()).trim();
  }catch{return 'unknown';}
}

export default function Vote(){
  const [unitId,setUnitId]=useState('');
  const [voterName,setVoterName]=useState('');
  const [selected,setSelected]=useState(null);
  const [done,setDone]=useState(false);
  const options=['A','B','C'];

  async function submitVote(){
    if(!unitId||!selected){alert('Fill all fields');return;}
    const ip=await fetchIP();
    const ua=navigator.userAgent;
    await supabase.from('votes').insert({unit_id:unitId,option:selected});
    await supabase.from('vote_audit').insert({
      action:'vote',
      voter_name:voterName||null,
      unit_id:unitId,
      ip,
      user_agent:ua,
      details:{option:selected}
    });
    setDone(true);
  }

  if(done)return<div>Thank you! Your vote recorded.</div>;

  return(<div>
    <input placeholder="Unit ID" value={unitId} onChange={e=>setUnitId(e.target.value)}/>
    <input placeholder="Name" value={voterName} onChange={e=>setVoterName(e.target.value)}/>
    {options.map(o=>(<button key={o} onClick={()=>setSelected(o)}>{o}</button>))}
    <button onClick={submitVote}>Submit</button>
  </div>);
}
