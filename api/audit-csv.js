export const config = { runtime: 'nodejs' };
import { createClient } from '@supabase/supabase-js';

function csvEscape(v){ if(v==null)return ''; const s=String(v); return /[",\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"' : s }

async function fetchAudit(supabase, pollId, includeName){
  const cols = ['created_at','unit_id','option_id']
  if (includeName) cols.push('voter_name')
  cols.push('ip','user_agent')
  return await supabase.from('vote_audit').select(cols.join(',')).eq('poll_id', pollId).order('created_at',{ascending:false})
}

export default async function handler(req,res){
  try{
    const pollId = (req.query&&req.query.p) || process.env.VITE_POLL_ID
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}})
    let { data, error } = await fetchAudit(supabase, pollId, true); let hasName = true
    if (error && /voter_name/.test(error.message)){ hasName=false; ({data,error}=await fetchAudit(supabase,pollId,false)) }
    if (error){ res.status(500).send('Supabase error: '+error.message); return }
    const header = hasName ? ['time_utc','unit_id','option_id','voter_name','ip','user_agent'] : ['time_utc','unit_id','option_id','ip','user_agent']
    const body = (data||[]).map(r => (hasName?
      [r.created_at,r.unit_id,r.option_id,r.voter_name,r.ip,r.user_agent] :
      [r.created_at,r.unit_id,r.option_id,r.ip,r.user_agent]
    ).map(csvEscape).join(',')).join('\r\n')
    const csv='\uFEFF'+header.join(',')+'\r\n'+body
    res.setHeader('Content-Type','text/csv; charset=utf-8')
    res.setHeader('Content-Disposition',`attachment; filename="audit-${pollId}.csv"`)
    res.status(200).send(csv)
  }catch(e){ res.status(500).send('API error: '+e.message) }
}
