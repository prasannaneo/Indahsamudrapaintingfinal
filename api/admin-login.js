export const config = { runtime: 'edge' };
export default async function handler(req){
  try{
    const body = await req.json()
    const pass = body?.password || ''
    const expected = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_SETUP_CODE || ''
    if (expected && pass === expected){
      return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})
    }
    return new Response(JSON.stringify({ok:false}),{status:401,headers:{'Content-Type':'application/json'}})
  }catch(e){ return new Response('Error',{status:500}) }
}
