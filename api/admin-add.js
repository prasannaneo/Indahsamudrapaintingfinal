export const config = { runtime: 'nodejs' };
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
const sha = s => createHash('sha256').update(s,'utf8').digest('hex')

async function readJson(req){
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  const raw = await new Promise(resolve=>{let b=''; req.on('data',d=>b+=d); req.on('end',()=>resolve(b))})
  return raw ? JSON.parse(raw) : {}
}

export default async function handler(req,res){
  try{
    const { code, email, password } = await readJson(req)
    if(!code || code !== (process.env.VITE_ADMIN_SETUP_CODE || process.env.ADMIN_PASSWORD)) return res.status(401).send('Invalid setup code')
    if(!email || !password) return res.status(400).send('Missing email/password')
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
    const up = await supabase.from('admins').upsert({ email, pass_sha256: sha(password) })
    if (up.error) return res.status(500).send(up.error.message)
    return res.status(200).send('OK')
  }catch(e){ return res.status(500).send(e.message) }
}
