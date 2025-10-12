export const config = { runtime: 'nodejs' };
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
const sha = s => createHash('sha256').update(s,'utf8').digest('hex')

export default async function handler(req,res){
  try{
    const body = req.body || (await new Promise(r=>{let b=''; req.on('data',d=>b+=d); req.on('end',()=>r(b))})).toString()
    const { email, password } = JSON.parse(body||'{}')
    if(!email || !password) return res.status(400).json({error:'Missing email/password'})
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
    const { data, error } = await supabase.from('admins').select('pass_sha256').eq('email', email).maybeSingle()
    if (error) return res.status(500).json({error:error.message})
    if (!data || data.pass_sha256 !== sha(password)) return res.status(401).json({error:'Invalid email or password'})
    return res.status(200).json({ok:true})
  }catch(e){ return res.status(500).json({error:e.message}) }
}
